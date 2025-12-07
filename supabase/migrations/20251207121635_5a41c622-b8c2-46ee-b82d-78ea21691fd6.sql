-- Add email verification columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS email_verification_token TEXT,
ADD COLUMN IF NOT EXISTS email_verification_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS email_verification_expires_at TIMESTAMPTZ;

-- Create index for token lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email_verification_token 
ON public.profiles(email_verification_token) 
WHERE email_verification_token IS NOT NULL;