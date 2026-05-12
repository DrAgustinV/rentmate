-- Final cleanup for property_documents table
-- Remove overly permissive policies and set proper security

-- Enable RLS back on property_documents
ALTER TABLE property_documents ENABLE ROW LEVEL SECURITY;

-- Drop permissive INSERT policy
DROP POLICY IF EXISTS "property_documents_all_insert" ON property_documents;
DROP POLICY IF EXISTS "property_documents_insert_any" ON property_documents;

-- Create proper INSERT policy (allows auth users to create global templates)
CREATE POLICY "property_documents_insert_policy"
ON property_documents FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = uploaded_by 
  AND (
    document_category = 'property' 
    AND property_id IS NULL 
    AND EXISTS (SELECT 1 FROM properties WHERE manager_id = auth.uid())
  )
  OR document_category = 'tenancy'
  OR has_role(auth.uid(), 'admin')
);

-- Re-enable trigger
ALTER TABLE property_documents ENABLE TRIGGER update_property_documents_updated_at;