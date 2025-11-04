-- Add KYC requirement preference to profiles (manager default)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS require_kyc_for_contracts BOOLEAN DEFAULT false;

COMMENT ON COLUMN profiles.require_kyc_for_contracts IS 
'Manager preference: require KILT KYC for all their property contracts';

-- Add KYC requirement setting per property (override manager default)
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS require_kyc_for_contracts BOOLEAN DEFAULT NULL;

COMMENT ON COLUMN properties.require_kyc_for_contracts IS 
'Whether KILT KYC verification is required for contract signing on this property. NULL uses manager default.';

-- Add kyc_enforced flag to track which contracts used identity verification
ALTER TABLE contract_signatures
ADD COLUMN IF NOT EXISTS kyc_enforced BOOLEAN DEFAULT false;

COMMENT ON COLUMN contract_signatures.kyc_enforced IS 
'Whether KILT KYC verification was required and validated for this contract';

-- Migrate existing data: set kyc_enforced = true for Dock Labs signatures
UPDATE contract_signatures
SET kyc_enforced = true
WHERE signing_method = 'dock' 
  OR dock_workflow_id IS NOT NULL;

-- Set kyc_enforced = false for mock signatures
UPDATE contract_signatures
SET kyc_enforced = false
WHERE signing_method = 'mock';