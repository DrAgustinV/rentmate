-- Create user_consents table for granular consent tracking
CREATE TABLE IF NOT EXISTS public.user_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('analytics', 'marketing', 'third_party_sharing')),
  granted BOOLEAN NOT NULL DEFAULT false,
  granted_at TIMESTAMP WITH TIME ZONE,
  withdrawn_at TIMESTAMP WITH TIME ZONE,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, consent_type)
);

COMMENT ON TABLE public.user_consents IS 'Granular user consent tracking for GDPR compliance';
COMMENT ON COLUMN public.user_consents.consent_type IS 'Type of consent: analytics, marketing, or third_party_sharing';
COMMENT ON COLUMN public.user_consents.granted IS 'Whether consent is currently granted';
COMMENT ON COLUMN public.user_consents.granted_at IS 'Timestamp when consent was granted';
COMMENT ON COLUMN public.user_consents.withdrawn_at IS 'Timestamp when consent was withdrawn';
COMMENT ON COLUMN public.user_consents.ip_address IS 'IP address for proof of consent (anonymized)';

-- Enable RLS
ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;

-- Users can view their own consents
CREATE POLICY "Users can view own consents"
  ON public.user_consents
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own consents
CREATE POLICY "Users can insert own consents"
  ON public.user_consents
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own consents
CREATE POLICY "Users can update own consents"
  ON public.user_consents
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all consents
CREATE POLICY "Admins can view all consents"
  ON public.user_consents
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster lookups
CREATE INDEX idx_user_consents_user_id ON public.user_consents(user_id);
CREATE INDEX idx_user_consents_consent_type ON public.user_consents(consent_type);

-- Create trigger to update updated_at
CREATE TRIGGER update_user_consents_updated_at
  BEFORE UPDATE ON public.user_consents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();