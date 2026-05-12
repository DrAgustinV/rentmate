-- Phase 1: Update database schema for DocuSeal + KILT integration

-- Update profiles table: Rename Dock columns to generic KYC columns
ALTER TABLE profiles 
  RENAME COLUMN dock_wallet_did TO kyc_wallet_did;

ALTER TABLE profiles 
  RENAME COLUMN dock_kyc_credential_id TO kyc_credential_id;

ALTER TABLE profiles 
  RENAME COLUMN dock_kyc_qr_code_url TO kyc_qr_code_url;

-- Update contract_signatures table: Add DocuSeal-specific columns
ALTER TABLE contract_signatures
  ADD COLUMN docuseal_template_id text,
  ADD COLUMN docuseal_submission_id text,
  ADD COLUMN docuseal_audit_log_url text,
  ADD COLUMN manager_signature_data jsonb,
  ADD COLUMN tenant_signature_data jsonb;

-- Add comment to clarify the reused columns
COMMENT ON COLUMN contract_signatures.dock_workflow_id IS 'Reused for DocuSeal submission ID or Dock workflow ID depending on signing_method';
COMMENT ON COLUMN contract_signatures.dock_contract_url IS 'Reused for DocuSeal form URL or Dock contract URL depending on signing_method';