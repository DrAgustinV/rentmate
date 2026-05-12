-- Add kyc_provider column to profiles table to track which verification provider was used
ALTER TABLE profiles 
ADD COLUMN kyc_provider text DEFAULT 'kilt';

-- Add comment explaining the column values
COMMENT ON COLUMN profiles.kyc_provider IS 'KYC verification provider used: kilt, openapi_basic, openapi_advanced, openapi_expert';