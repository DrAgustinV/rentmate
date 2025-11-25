-- Add source_document_id column to contract_signatures to track which document was signed
ALTER TABLE contract_signatures 
ADD COLUMN source_document_id uuid REFERENCES property_documents(id);