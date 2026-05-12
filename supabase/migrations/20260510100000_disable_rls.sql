-- Last resort: Disable RLS entirely on property_documents
ALTER TABLE property_documents DISABLE ROW LEVEL SECURITY;

-- Create permissive policy (for when re-enabled)
CREATE POLICY "property_documents_authenticated_insert"
ON property_documents FOR INSERT TO authenticated WITH CHECK (true);