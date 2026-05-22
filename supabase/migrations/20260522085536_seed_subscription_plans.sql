-- Seed subscription plans with property limits
-- Only inserts if plans don't already exist by slug

INSERT INTO subscription_plans (name, slug, description, sort_order, status, is_default, is_available_for_signup, price_monthly_cents, price_annual_cents, trial_days, feature_limits)
VALUES
  ('Free', 'free', 'Perfect for individual landlords managing properties manually', 1, 'active', true, true, 0, 0, 0, '{
    "digital_signatures_per_year": 0,
    "automated_payments_enabled": false,
    "sepa_direct_debit_enabled": false,
    "stripe_connect_enabled": false,
    "revolut_payments_enabled": false,
    "maintenance_templates_enabled": false,
    "recurring_tasks_enabled": false,
    "repair_shop_directory_enabled": false,
    "document_templates_enabled": false,
    "kyc_verification_enabled": false,
    "brand_customization_enabled": false,
    "white_labeling_enabled": false,
    "api_access_enabled": false,
    "advanced_analytics_enabled": false,
    "property_limit": 2
  }'::jsonb),

  ('Pro', 'pro', 'Automate your property management with professional tools', 2, 'active', false, false, 2900, 29000, 14, '{
    "digital_signatures_per_year": 100,
    "automated_payments_enabled": true,
    "sepa_direct_debit_enabled": true,
    "stripe_connect_enabled": true,
    "revolut_payments_enabled": true,
    "maintenance_templates_enabled": true,
    "recurring_tasks_enabled": true,
    "repair_shop_directory_enabled": true,
    "document_templates_enabled": true,
    "kyc_verification_enabled": true,
    "brand_customization_enabled": false,
    "white_labeling_enabled": false,
    "api_access_enabled": false,
    "advanced_analytics_enabled": false,
    "property_limit": 50
  }'::jsonb),

  ('Enterprise', 'enterprise', 'Full-featured solution for large property management firms', 3, 'active', false, false, 0, 0, 0, '{
    "digital_signatures_per_year": 9999,
    "automated_payments_enabled": true,
    "sepa_direct_debit_enabled": true,
    "stripe_connect_enabled": true,
    "revolut_payments_enabled": true,
    "maintenance_templates_enabled": true,
    "recurring_tasks_enabled": true,
    "repair_shop_directory_enabled": true,
    "document_templates_enabled": true,
    "kyc_verification_enabled": true,
    "brand_customization_enabled": true,
    "white_labeling_enabled": true,
    "api_access_enabled": true,
    "advanced_analytics_enabled": true,
    "property_limit": 9999
  }'::jsonb)
ON CONFLICT (slug) DO NOTHING;

-- Assign Free plan to existing users who don't have a subscription
INSERT INTO user_subscriptions (user_id, plan_id, subscription_type, status)
SELECT
  p.id,
  (SELECT id FROM subscription_plans WHERE slug = 'free'),
  'free',
  'active'
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM user_subscriptions WHERE user_id = p.id
);
