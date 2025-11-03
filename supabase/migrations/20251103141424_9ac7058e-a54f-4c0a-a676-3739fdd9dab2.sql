-- Add KYC-related columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS dock_kyc_credential_id TEXT,
ADD COLUMN IF NOT EXISTS dock_kyc_qr_code_url TEXT,
ADD COLUMN IF NOT EXISTS kyc_status TEXT DEFAULT 'not_started',
ADD COLUMN IF NOT EXISTS kyc_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS kyc_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS id_document_type TEXT,
ADD COLUMN IF NOT EXISTS id_document_country TEXT,
ADD COLUMN IF NOT EXISTS aml_status TEXT DEFAULT 'not_checked',
ADD COLUMN IF NOT EXISTS dock_wallet_did TEXT;

-- Add index for KYC status lookups
CREATE INDEX IF NOT EXISTS idx_profiles_kyc_status ON profiles(kyc_status);

-- Add index for credential ID lookups (used in webhook processing)
CREATE INDEX IF NOT EXISTS idx_profiles_dock_credential_id ON profiles(dock_kyc_credential_id) WHERE dock_kyc_credential_id IS NOT NULL;