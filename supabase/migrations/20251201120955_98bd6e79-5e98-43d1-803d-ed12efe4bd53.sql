-- Clean up invalid demo property documents with incorrect file paths
-- These are "ghost records" - database entries without actual storage files

-- Delete property documents that have the incorrect 'property-documents/' prefix in file_path
-- This prefix should NOT be in the file_path since it's the bucket name
DELETE FROM property_documents 
WHERE file_path LIKE 'property-documents/%'
  AND document_category = 'property';

-- Also clean up any orphaned tenancy documents that may have been created from invalid templates
DELETE FROM property_documents 
WHERE document_category = 'tenancy'
  AND file_path LIKE 'property-documents/%';