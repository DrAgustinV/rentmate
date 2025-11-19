-- Add account deletion tracking fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS deletion_requested_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS deletion_scheduled_for timestamp with time zone;

COMMENT ON COLUMN public.profiles.deletion_requested_at IS 'Timestamp when user requested account deletion';
COMMENT ON COLUMN public.profiles.deletion_scheduled_for IS 'Timestamp when account deletion will be executed (14 days after request)';

-- Add cookie consent tracking to user_preferences table
ALTER TABLE public.user_preferences
ADD COLUMN IF NOT EXISTS cookie_consent_analytics boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS cookie_consent_given_at timestamp with time zone;

COMMENT ON COLUMN public.user_preferences.cookie_consent_analytics IS 'Whether user has consented to analytics cookies';
COMMENT ON COLUMN public.user_preferences.cookie_consent_given_at IS 'Timestamp when consent was given';