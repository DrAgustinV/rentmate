-- Ensure property-documents storage bucket exists (idempotent)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('property-documents', 'property-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Recreate storage RLS policies idempotently (drop + create)
DROP POLICY IF EXISTS "Users can upload property documents to storage" ON storage.objects;
CREATE POLICY "Users can upload property documents to storage"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'property-documents'
  AND auth.role() = 'authenticated'
);

DROP POLICY IF EXISTS "Users can view property documents in storage" ON storage.objects;
CREATE POLICY "Users can view property documents in storage"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'property-documents'
  AND auth.role() = 'authenticated'
);

DROP POLICY IF EXISTS "Managers can delete property documents from storage" ON storage.objects;
CREATE POLICY "Managers can delete property documents from storage"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'property-documents'
  AND EXISTS (
    SELECT 1 FROM public.property_documents pd
    LEFT JOIN public.properties p ON p.id = pd.property_id
    WHERE pd.file_path = storage.objects.name
    AND (
      (pd.property_id IS NULL AND pd.uploaded_by = auth.uid())
      OR
      (p.manager_id = auth.uid())
    )
  )
);

-- Make property_id nullable for global templates (idempotent)
ALTER TABLE public.property_documents ALTER COLUMN property_id DROP NOT NULL;

-- Drop old INSERT policies to rebuild them cleanly
DROP POLICY IF EXISTS "Users can upload property documents" ON public.property_documents;
DROP POLICY IF EXISTS "Users can upload documents" ON public.property_documents;

-- INSERT policy: supports both property-specific and global templates
CREATE POLICY "Users can upload documents"
ON public.property_documents FOR INSERT
WITH CHECK (
  (auth.uid() = uploaded_by) AND (
    -- Property-specific templates: manager or tenant of active property
    ((document_category = 'property') AND (tenancy_id IS NULL) AND (property_id IS NOT NULL) AND EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_id
      AND p.status = 'active'::property_status
      AND (p.manager_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.property_tenants pt
        WHERE pt.property_id = p.id AND pt.tenant_id = auth.uid()
      ))
    ))
    OR
    -- Global templates: user is a manager of at least one property
    ((document_category = 'property') AND (tenancy_id IS NULL) AND (property_id IS NULL) AND EXISTS (
      SELECT 1 FROM public.properties WHERE manager_id = auth.uid()
    ))
    OR
    -- Tenancy documents: tenant or manager of the tenancy
    ((document_category = 'tenancy') AND (tenancy_id IS NOT NULL) AND (EXISTS (
      SELECT 1 FROM public.property_tenants pt
      WHERE pt.id = property_documents.tenancy_id
        AND ((pt.tenant_id = auth.uid() AND pt.tenancy_status IN ('active', 'ending_tenancy'))
          OR is_property_manager(auth.uid(), pt.property_id))
    )))
  )
  OR has_role(auth.uid(), 'admin')
);
