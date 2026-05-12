-- Add new column for Government ID overage pricing
ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS overage_price_per_government_id_cents INTEGER DEFAULT 100;

-- Update FREE plan feature_limits
UPDATE subscription_plans 
SET feature_limits = feature_limits || '{
  "property_limit": 1,
  "government_id_verifications_per_year": 0,
  "kilt_kyc_enabled": true,
  "government_id_kyc_enabled": false
}'::jsonb
WHERE slug = 'free';

-- Update PRO plan feature_limits
UPDATE subscription_plans 
SET feature_limits = feature_limits || '{
  "property_limit": 25,
  "government_id_verifications_per_year": 0,
  "kilt_kyc_enabled": true,
  "government_id_kyc_enabled": true
}'::jsonb
WHERE slug = 'pro';

-- Update Enterprise plan feature_limits
UPDATE subscription_plans 
SET feature_limits = feature_limits || '{
  "property_limit": 999999,
  "government_id_verifications_per_year": 9999,
  "kilt_kyc_enabled": true,
  "government_id_kyc_enabled": true
}'::jsonb
WHERE slug = 'enterprise';