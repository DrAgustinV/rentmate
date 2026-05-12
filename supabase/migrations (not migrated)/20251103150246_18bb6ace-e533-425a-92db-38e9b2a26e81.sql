-- Add contract document hash and PDF URL columns to contract_signatures
ALTER TABLE public.contract_signatures 
ADD COLUMN IF NOT EXISTS contract_document_hash TEXT,
ADD COLUMN IF NOT EXISTS contract_pdf_url TEXT;

COMMENT ON COLUMN public.contract_signatures.contract_document_hash IS 'SHA-256 hash of the contract PDF document';
COMMENT ON COLUMN public.contract_signatures.contract_pdf_url IS 'Storage path to the contract PDF document';