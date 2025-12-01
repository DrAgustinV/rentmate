-- Drop existing INSERT policy on property_documents
DROP POLICY IF EXISTS "Users can upload documents" ON property_documents;

-- Create updated INSERT policy that supports global templates (property_id IS NULL)
CREATE POLICY "Users can upload documents"
ON property_documents FOR INSERT
WITH CHECK (
  (auth.uid() = uploaded_by) AND (
    -- Property-specific templates: manager of that property
    ((document_category = 'property') AND (tenancy_id IS NULL) AND (property_id IS NOT NULL) AND is_property_manager(auth.uid(), property_id))
    OR
    -- Global templates: user is a manager of at least one property
    ((document_category = 'property') AND (tenancy_id IS NULL) AND (property_id IS NULL) AND EXISTS (
      SELECT 1 FROM properties WHERE manager_id = auth.uid()
    ))
    OR
    -- Tenancy documents: tenant or manager of the tenancy
    ((document_category = 'tenancy') AND (tenancy_id IS NOT NULL) AND (EXISTS (
      SELECT 1 FROM property_tenants pt
      WHERE pt.id = property_documents.tenancy_id
        AND ((pt.tenant_id = auth.uid() AND pt.tenancy_status IN ('active', 'ending_tenancy'))
          OR is_property_manager(auth.uid(), pt.property_id))
    )))
  )
  OR has_role(auth.uid(), 'admin')
);

-- Add SELECT policy for global templates
CREATE POLICY "Managers can view global templates"
ON property_documents FOR SELECT
USING (
  document_category = 'property' 
  AND property_id IS NULL
  AND EXISTS (SELECT 1 FROM properties WHERE manager_id = auth.uid())
);

-- Add DELETE policy for global templates
DROP POLICY IF EXISTS "Users can delete documents" ON property_documents;

CREATE POLICY "Users can delete documents"
ON property_documents FOR DELETE
USING (
  is_property_manager(auth.uid(), property_id)
  OR (
    document_category = 'property' 
    AND property_id IS NULL 
    AND auth.uid() = uploaded_by
  )
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
  OR has_role(auth.uid(), 'admin')
);