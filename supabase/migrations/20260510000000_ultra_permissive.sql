-- Minimal debug: Allow all inserts from any authenticated user
DROP POLICY IF EXISTS "property_documents_insert_any" ON property_documents;
DROP POLICY IF EXISTS "property_documents_insert_any_anon" ON property_documents;
DROP POLICY IF EXISTS "property_documents_insert_open" ON property_documents;
DROP POLICY IF EXISTS "property_documents_insert_debug" ON property_documents;
DROP POLICY IF EXISTS "Users can upload documents" ON property_documents;

-- Create ultra-permissive: ALL authenticated users can insert
CREATE POLICY "property_documents_all_insert"
ON property_documents 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Also for anon (for testing)
CREATE POLICY "property_documents_all_insert_anon"
ON property_documents 
FOR INSERT 
TO anon 
WITH CHECK (true);