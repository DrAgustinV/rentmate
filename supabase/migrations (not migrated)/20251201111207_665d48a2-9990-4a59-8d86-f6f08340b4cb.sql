-- Allow NULL property_id for global templates
ALTER TABLE property_documents 
ALTER COLUMN property_id DROP NOT NULL;