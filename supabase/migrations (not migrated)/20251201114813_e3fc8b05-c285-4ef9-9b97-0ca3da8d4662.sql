-- Add SELECT policy for managers to view tenancy documents for properties they manage
CREATE POLICY "Managers can view tenancy documents for their properties" 
ON property_documents FOR SELECT
USING (
  document_category = 'tenancy' 
  AND property_id IS NOT NULL
  AND is_property_manager(auth.uid(), property_id)
);