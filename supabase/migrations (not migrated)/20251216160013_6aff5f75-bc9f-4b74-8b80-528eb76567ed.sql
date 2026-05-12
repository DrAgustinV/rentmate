-- Add Government ID verification tracking columns to subscription_usage
ALTER TABLE public.subscription_usage
ADD COLUMN IF NOT EXISTS government_id_verifications_used INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS overage_government_id_used INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_gov_id_overage_billed_at TIMESTAMP WITH TIME ZONE;