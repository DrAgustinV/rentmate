-- Add RLS UPDATE policy for tenants to manage document versions
CREATE POLICY "Tenants can update their tenancy document versions"
ON property_documents FOR UPDATE
USING (
  document_category = 'tenancy' 
  AND auth.uid() = uploaded_by 
  AND EXISTS (
    SELECT 1 FROM property_tenants pt 
    WHERE pt.id = property_documents.tenancy_id 
    AND pt.tenant_id = auth.uid() 
    AND pt.tenancy_status IN ('active', 'ending_tenancy')
  )
)
WITH CHECK (
  document_category = 'tenancy' 
  AND uploaded_by = auth.uid()
);