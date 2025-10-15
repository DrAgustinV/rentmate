-- Phase 1: Update property_tenants table to support tenancy lifecycle
-- Add new columns for tenancy management
ALTER TABLE public.property_tenants
ADD COLUMN IF NOT EXISTS tenancy_status TEXT DEFAULT 'active' 
  CHECK (tenancy_status IN ('active', 'ending_tenancy', 'inactive')),
ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ DEFAULT now() NOT NULL,
ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS end_reason TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Update existing records to have tenancy_status = 'active'
UPDATE public.property_tenants 
SET tenancy_status = 'active' 
WHERE tenancy_status IS NULL;

-- Drop old unique constraint if it exists (property can have multiple tenants over time)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'property_tenants_property_id_tenant_id_key'
  ) THEN
    ALTER TABLE public.property_tenants 
    DROP CONSTRAINT property_tenants_property_id_tenant_id_key;
  END IF;
END $$;

-- Add constraint: max 1 active tenant per property
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_tenant_per_property 
ON public.property_tenants (property_id) 
WHERE tenancy_status = 'active';

-- Add constraint: max 1 ending_tenancy per property
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_ending_tenant_per_property 
ON public.property_tenants (property_id) 
WHERE tenancy_status = 'ending_tenancy';

-- Add index for sorting by start date
CREATE INDEX IF NOT EXISTS idx_tenancies_started_at 
ON public.property_tenants(property_id, started_at DESC);

-- Phase 2: Update property_documents table to support property templates vs tenancy documents
-- Add tenancy_id column (nullable because property templates have no tenancy)
ALTER TABLE public.property_documents
ADD COLUMN IF NOT EXISTS tenancy_id UUID REFERENCES public.property_tenants(id) ON DELETE CASCADE;

-- Add document_category with default 'property'
ALTER TABLE public.property_documents
ADD COLUMN IF NOT EXISTS document_category TEXT DEFAULT 'property' 
  CHECK (document_category IN ('property', 'tenancy'));

-- Add indexes for filtering
CREATE INDEX IF NOT EXISTS idx_property_docs_category 
ON public.property_documents(property_id, document_category);

CREATE INDEX IF NOT EXISTS idx_property_docs_tenancy 
ON public.property_documents(tenancy_id) 
WHERE tenancy_id IS NOT NULL;

-- Update existing documents: set category='property', tenancy_id=NULL (they're templates)
UPDATE public.property_documents 
SET document_category = 'property', tenancy_id = NULL 
WHERE document_category IS NULL;

-- Phase 3: Update RLS policies for property_tenants (tenancies)
DROP POLICY IF EXISTS "Managers can view their tenants profiles" ON public.property_tenants;
DROP POLICY IF EXISTS "Anyone can view their tenant relationships" ON public.property_tenants;
DROP POLICY IF EXISTS "Managers and invited users can add tenants" ON public.property_tenants;
DROP POLICY IF EXISTS "Managers can remove tenants from their properties" ON public.property_tenants;

-- Managers can view all tenancies for their properties
CREATE POLICY "Managers can view property tenancies"
ON public.property_tenants FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.properties
    WHERE id = property_tenants.property_id
    AND manager_id = auth.uid()
  ) OR has_role(auth.uid(), 'admin'::app_role)
);

-- Tenants can view their own tenancy records
CREATE POLICY "Tenants can view own tenancy"
ON public.property_tenants FOR SELECT
USING (tenant_id = auth.uid());

-- Managers can create new tenancies (when inviting tenant)
CREATE POLICY "Managers can create tenancies"
ON public.property_tenants FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.properties
    WHERE id = property_tenants.property_id
    AND manager_id = auth.uid()
  ) OR has_role(auth.uid(), 'admin'::app_role)
);

-- Allow invited users to create their own tenancy when accepting invitation
CREATE POLICY "Invited users can create own tenancy"
ON public.property_tenants FOR INSERT
WITH CHECK (
  (tenant_id = auth.uid()) AND 
  EXISTS (
    SELECT 1 FROM invitations
    JOIN profiles ON profiles.id = auth.uid()
    WHERE invitations.property_id = property_tenants.property_id
    AND invitations.email = profiles.email
    AND invitations.status = 'pending'::invitation_status
    AND invitations.expires_at > now()
  )
);

-- Managers can update tenancy status (end tenancy, archive)
CREATE POLICY "Managers can update tenancies"
ON public.property_tenants FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.properties
    WHERE id = property_tenants.property_id
    AND manager_id = auth.uid()
  ) OR has_role(auth.uid(), 'admin'::app_role)
);

-- Managers can delete tenancies (for FIFO cleanup)
CREATE POLICY "Managers can delete tenancies"
ON public.property_tenants FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.properties
    WHERE id = property_tenants.property_id
    AND manager_id = auth.uid()
  ) OR has_role(auth.uid(), 'admin'::app_role)
);

-- Phase 4: Update RLS policies for property_documents
DROP POLICY IF EXISTS "Users can view property documents" ON public.property_documents;
DROP POLICY IF EXISTS "Users can upload property documents" ON public.property_documents;
DROP POLICY IF EXISTS "Managers can delete property documents" ON public.property_documents;

-- Users can view documents based on category and tenancy access
CREATE POLICY "Users can view property documents"
ON public.property_documents FOR SELECT
USING (
  -- Managers can see all docs (property templates + all tenancy docs)
  (EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = property_documents.property_id
    AND p.manager_id = auth.uid()
  ))
  OR
  -- Tenants can ONLY see tenancy docs linked to their active/ending tenancy
  (document_category = 'tenancy' AND EXISTS (
    SELECT 1 FROM public.property_tenants pt
    WHERE pt.id = property_documents.tenancy_id
    AND pt.tenant_id = auth.uid()
    AND pt.tenancy_status IN ('active', 'ending_tenancy')
  ))
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Users can upload documents based on category
CREATE POLICY "Users can upload documents"
ON public.property_documents FOR INSERT
WITH CHECK (
  (auth.uid() = uploaded_by) AND (
    -- Property templates: manager only, no tenancy_id
    (document_category = 'property' AND tenancy_id IS NULL AND EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_documents.property_id
      AND p.manager_id = auth.uid()
    ))
    OR
    -- Tenancy docs: manager or active/ending tenant
    (document_category = 'tenancy' AND tenancy_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.property_tenants pt
      WHERE pt.id = property_documents.tenancy_id
      AND (
        (pt.tenant_id = auth.uid() AND pt.tenancy_status IN ('active', 'ending_tenancy'))
        OR
        (EXISTS (
          SELECT 1 FROM public.properties p
          WHERE p.id = pt.property_id
          AND p.manager_id = auth.uid()
        ))
      )
    ))
  ) OR has_role(auth.uid(), 'admin'::app_role)
);

-- Managers can delete documents, tenants can only delete during active tenancy
CREATE POLICY "Users can delete documents"
ON public.property_documents FOR DELETE
USING (
  -- Managers can delete any document for their properties
  (EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = property_documents.property_id
    AND p.manager_id = auth.uid()
  ))
  OR
  -- Tenants can only delete tenancy docs during active tenancy
  (document_category = 'tenancy' 
    AND auth.uid() = uploaded_by
    AND EXISTS (
      SELECT 1 FROM public.property_tenants pt
      WHERE pt.id = property_documents.tenancy_id
      AND pt.tenant_id = auth.uid()
      AND pt.tenancy_status = 'active'
    ))
  OR has_role(auth.uid(), 'admin'::app_role)
);