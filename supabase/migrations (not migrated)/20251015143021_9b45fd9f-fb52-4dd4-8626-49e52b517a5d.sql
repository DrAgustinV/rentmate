-- Create security definer function to check if user is a tenant
CREATE OR REPLACE FUNCTION public.is_property_tenant(_user_id uuid, _property_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.property_tenants
    WHERE property_id = _property_id
      AND tenant_id = _user_id
      AND tenancy_status IN ('active', 'ending_tenancy')
  )
$$;

-- Drop all problematic policies on property_tenants
DROP POLICY IF EXISTS "Managers can view property tenancies" ON property_tenants;
DROP POLICY IF EXISTS "Managers can create tenancies" ON property_tenants;
DROP POLICY IF EXISTS "Invited users can create own tenancy" ON property_tenants;
DROP POLICY IF EXISTS "Managers can update tenancies" ON property_tenants;
DROP POLICY IF EXISTS "Managers can delete tenancies" ON property_tenants;
DROP POLICY IF EXISTS "Tenants can view own tenancy" ON property_tenants;

-- Drop all problematic policies on property_documents
DROP POLICY IF EXISTS "Users can view property documents" ON property_documents;
DROP POLICY IF EXISTS "Users can upload documents" ON property_documents;
DROP POLICY IF EXISTS "Users can delete documents" ON property_documents;

-- Recreate property_tenants policies using security definer functions
CREATE POLICY "Managers can view property tenancies"
ON property_tenants FOR SELECT
USING (
  is_property_manager(auth.uid(), property_id)
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Tenants can view own tenancy"
ON property_tenants FOR SELECT
USING (tenant_id = auth.uid());

CREATE POLICY "Managers can create tenancies"
ON property_tenants FOR INSERT
WITH CHECK (
  is_property_manager(auth.uid(), property_id)
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Invited users can create own tenancy"
ON property_tenants FOR INSERT
WITH CHECK (
  tenant_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM invitations
    JOIN profiles ON profiles.id = auth.uid()
    WHERE invitations.property_id = property_tenants.property_id
      AND invitations.email = profiles.email
      AND invitations.status = 'pending'
      AND invitations.expires_at > now()
  )
);

CREATE POLICY "Managers can update tenancies"
ON property_tenants FOR UPDATE
USING (
  is_property_manager(auth.uid(), property_id)
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Managers can delete tenancies"
ON property_tenants FOR DELETE
USING (
  is_property_manager(auth.uid(), property_id)
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Recreate property_documents policies using security definer functions
CREATE POLICY "Users can view property documents"
ON property_documents FOR SELECT
USING (
  is_property_manager(auth.uid(), property_id)
  OR (
    document_category = 'tenancy'
    AND is_property_tenant(auth.uid(), property_id)
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Users can upload documents"
ON property_documents FOR INSERT
WITH CHECK (
  auth.uid() = uploaded_by
  AND (
    (
      document_category = 'property'
      AND tenancy_id IS NULL
      AND is_property_manager(auth.uid(), property_id)
    )
    OR (
      document_category = 'tenancy'
      AND tenancy_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM property_tenants pt
        WHERE pt.id = property_documents.tenancy_id
          AND (
            (pt.tenant_id = auth.uid() AND pt.tenancy_status IN ('active', 'ending_tenancy'))
            OR is_property_manager(auth.uid(), pt.property_id)
          )
      )
    )
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Users can delete documents"
ON property_documents FOR DELETE
USING (
  is_property_manager(auth.uid(), property_id)
  OR (
    document_category = 'tenancy'
    AND auth.uid() = uploaded_by
    AND EXISTS (
      SELECT 1 FROM property_tenants pt
      WHERE pt.id = property_documents.tenancy_id
        AND pt.tenant_id = auth.uid()
        AND pt.tenancy_status = 'active'
    )
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);