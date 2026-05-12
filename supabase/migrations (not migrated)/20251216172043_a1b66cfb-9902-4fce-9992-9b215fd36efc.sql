-- Backfill tenant_signer_id from qualified_signature_metadata for existing records
UPDATE public.contract_signatures 
SET tenant_signer_id = (qualified_signature_metadata->>'tenant_signer_id')
WHERE tenant_signer_id IS NULL 
  AND qualified_signature_metadata->>'tenant_signer_id' IS NOT NULL;