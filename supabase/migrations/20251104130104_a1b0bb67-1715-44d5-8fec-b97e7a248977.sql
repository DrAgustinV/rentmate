-- Add DocuSeal columns to contract_signatures table
ALTER TABLE public.contract_signatures
ADD COLUMN IF NOT EXISTS docuseal_submission_slug TEXT,
ADD COLUMN IF NOT EXISTS docuseal_manager_document_url TEXT,
ADD COLUMN IF NOT EXISTS docuseal_tenant_document_url TEXT;

COMMENT ON COLUMN public.contract_signatures.docuseal_submission_slug IS 'DocuSeal submission slug for embedded signing';
COMMENT ON COLUMN public.contract_signatures.docuseal_manager_document_url IS 'URL to manager signed document from DocuSeal';
COMMENT ON COLUMN public.contract_signatures.docuseal_tenant_document_url IS 'URL to tenant signed document from DocuSeal';