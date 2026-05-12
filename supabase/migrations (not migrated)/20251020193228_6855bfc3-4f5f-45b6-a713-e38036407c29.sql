-- Drop the old conflicting policy
DROP POLICY IF EXISTS "Users can view property documents" ON property_documents;

-- Create specific policy for tenants to view their tenancy documents
CREATE POLICY "Tenants can view their tenancy documents"
ON property_documents FOR SELECT
USING (
  document_category = 'tenancy'
  AND property_id IN (
    SELECT property_id 
    FROM property_tenants 
    WHERE tenant_id = auth.uid() 
    AND tenancy_status IN ('active', 'ending_tenancy')
  )
);

-- Create policy for admins to view all property documents
CREATE POLICY "Admins can view all property documents"
ON property_documents FOR SELECT
USING (
  has_role(auth.uid(), 'admin')
);