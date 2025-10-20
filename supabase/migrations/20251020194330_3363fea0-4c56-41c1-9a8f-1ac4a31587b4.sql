-- Add foreign key constraint from property_documents.uploaded_by to profiles.id
ALTER TABLE property_documents
ADD CONSTRAINT property_documents_uploaded_by_fkey
FOREIGN KEY (uploaded_by) REFERENCES profiles(id) ON DELETE CASCADE;