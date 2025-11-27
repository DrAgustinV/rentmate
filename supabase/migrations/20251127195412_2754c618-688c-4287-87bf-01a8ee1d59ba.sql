-- Add kyc_data column to store extracted verification data from providers like Didit
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS kyc_data JSONB DEFAULT NULL;

-- Add comment explaining the column purpose
COMMENT ON COLUMN public.profiles.kyc_data IS 'Stores extracted KYC data from verification providers (name, DOB, address, document info)';