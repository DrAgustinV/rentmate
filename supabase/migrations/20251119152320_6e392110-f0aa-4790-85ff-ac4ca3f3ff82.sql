-- ============================================================================
-- Phase 1: Subscription System - Database Schema
-- ============================================================================

-- 1. Create Enums
-- ============================================================================

CREATE TYPE plan_status AS ENUM ('active', 'inactive', 'archived');

CREATE TYPE subscription_status AS ENUM (
  'active',      -- Subscription is active and paid
  'trialing',    -- In trial period
  'past_due',    -- Payment failed, in grace period
  'canceled',    -- Canceled, still active until period end
  'expired'      -- Fully expired/downgraded
);

CREATE TYPE subscription_type AS ENUM (
  'stripe',      -- Paid via Stripe
  'admin_grant', -- Granted by admin for free
  'free'         -- Free plan
);


-- 2. Create subscription_plans Table
-- ============================================================================

CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Plan Identity
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  status plan_status NOT NULL DEFAULT 'active',
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_available_for_signup BOOLEAN NOT NULL DEFAULT true,
  
  -- Pricing (in cents)
  price_monthly_cents INTEGER NOT NULL DEFAULT 0,
  price_annual_cents INTEGER NOT NULL DEFAULT 0,
  
  -- Stripe Integration
  stripe_product_id TEXT,
  stripe_price_id_monthly TEXT,
  stripe_price_id_annual TEXT,
  
  -- Trial & Grace Period
  trial_days INTEGER NOT NULL DEFAULT 0,
  grace_period_days INTEGER NOT NULL DEFAULT 14,
  
  -- Overage Pricing
  overage_price_per_signature_cents INTEGER NOT NULL DEFAULT 200,
  
  -- Feature Limits (JSONB for flexibility)
  feature_limits JSONB NOT NULL DEFAULT '{
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
    "advanced_analytics_enabled": false
  }'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscription_plans_slug ON subscription_plans(slug);
CREATE INDEX idx_subscription_plans_status ON subscription_plans(status);

CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- 3. Create user_subscriptions Table
-- ============================================================================

CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  
  -- Subscription Type & Status
  subscription_type subscription_type NOT NULL DEFAULT 'free',
  status subscription_status NOT NULL DEFAULT 'active',
  
  -- Stripe Integration
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  
  -- Billing Periods
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  
  -- Cancellation
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  canceled_at TIMESTAMPTZ,
  
  -- Grace Period (for payment failures)
  grace_period_ends_at TIMESTAMPTZ,
  
  -- Admin-Granted Fields
  admin_granted_by UUID REFERENCES profiles(id),
  admin_granted_at TIMESTAMPTZ,
  admin_granted_reason TEXT,
  admin_granted_duration_days INTEGER,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraint: One active subscription per user
  CONSTRAINT unique_active_subscription_per_user UNIQUE(user_id)
);

CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX idx_user_subscriptions_stripe_customer ON user_subscriptions(stripe_customer_id);
CREATE INDEX idx_user_subscriptions_grace_period ON user_subscriptions(grace_period_ends_at) WHERE grace_period_ends_at IS NOT NULL;

CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- 4. Create subscription_usage Table
-- ============================================================================

CREATE TABLE subscription_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Tracking Period
  year INTEGER NOT NULL,
  reset_at TIMESTAMPTZ NOT NULL,
  
  -- Usage Counters
  signatures_used INTEGER NOT NULL DEFAULT 0,
  overage_signatures_used INTEGER NOT NULL DEFAULT 0,
  
  -- Overage Billing
  last_overage_billed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraint: One usage record per user per year
  CONSTRAINT unique_usage_per_user_year UNIQUE(user_id, year)
);

CREATE INDEX idx_subscription_usage_user_year ON subscription_usage(user_id, year);
CREATE INDEX idx_subscription_usage_year ON subscription_usage(year);

CREATE TRIGGER update_subscription_usage_updated_at
  BEFORE UPDATE ON subscription_usage
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- 5. Create subscription_history Table
-- ============================================================================

CREATE TABLE subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  from_plan_id UUID REFERENCES subscription_plans(id),
  to_plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  
  change_reason TEXT NOT NULL,
  changed_by UUID REFERENCES profiles(id),
  
  metadata JSONB,
  
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscription_history_user_id ON subscription_history(user_id);
CREATE INDEX idx_subscription_history_changed_at ON subscription_history(changed_at);


-- 6. Create grace_period_reminders_sent Table
-- ============================================================================

CREATE TABLE grace_period_reminders_sent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_subscription_id UUID NOT NULL REFERENCES user_subscriptions(id) ON DELETE CASCADE,
  
  reminder_day INTEGER NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_reminder_per_subscription_day UNIQUE(user_subscription_id, reminder_day)
);

CREATE INDEX idx_grace_reminders_subscription ON grace_period_reminders_sent(user_subscription_id);


-- 7. Create enterprise_contact_requests Table
-- ============================================================================

CREATE TABLE enterprise_contact_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User Information
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company_name TEXT,
  phone TEXT,
  
  -- Request Details
  message TEXT NOT NULL,
  properties_count INTEGER,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending',
  contacted_by UUID REFERENCES profiles(id),
  contacted_at TIMESTAMPTZ,
  notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_enterprise_requests_user_id ON enterprise_contact_requests(user_id);
CREATE INDEX idx_enterprise_requests_status ON enterprise_contact_requests(status);
CREATE INDEX idx_enterprise_requests_created_at ON enterprise_contact_requests(created_at);

CREATE TRIGGER update_enterprise_contact_requests_updated_at
  BEFORE UPDATE ON enterprise_contact_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- 8. Insert Initial Plan Data
-- ============================================================================

INSERT INTO subscription_plans (name, slug, description, sort_order, status, is_default, is_available_for_signup, price_monthly_cents, price_annual_cents, trial_days, feature_limits) VALUES
-- Free Plan
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
  "advanced_analytics_enabled": false
}'::jsonb),

-- Pro Plan (Initially NOT available - Coming Soon)
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
  "advanced_analytics_enabled": false
}'::jsonb),

-- Enterprise Plan (Initially NOT available - Coming Soon)
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
  "advanced_analytics_enabled": true
}'::jsonb);


-- 9. Assign Free Plan to All Existing Users
-- ============================================================================

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


-- 10. Create Current Year Usage for All Users
-- ============================================================================

INSERT INTO subscription_usage (user_id, year, reset_at)
SELECT 
  p.id,
  EXTRACT(YEAR FROM now())::INTEGER,
  (DATE_TRUNC('year', now()) + INTERVAL '1 year')::TIMESTAMPTZ
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM subscription_usage 
  WHERE user_id = p.id AND year = EXTRACT(YEAR FROM now())::INTEGER
);


-- 11. Add Subscription Configuration to system_settings
-- ============================================================================

INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('enterprise_contact_email', '{"value": "operations@optimind.pro"}'::jsonb, 'Email address to receive Enterprise contact requests'),
('subscription_grace_period_days', '{"value": 14}'::jsonb, 'Number of days before downgrading after payment failure'),
('subscription_overage_price_cents', '{"value": 200}'::jsonb, 'Price per additional signature beyond plan limit (in cents)');


-- 12. Enable RLS on All Tables
-- ============================================================================

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE grace_period_reminders_sent ENABLE ROW LEVEL SECURITY;
ALTER TABLE enterprise_contact_requests ENABLE ROW LEVEL SECURITY;


-- 13. RLS Policies for subscription_plans
-- ============================================================================

CREATE POLICY "Anyone can view active subscription plans"
  ON subscription_plans FOR SELECT
  TO authenticated
  USING (status = 'active');

CREATE POLICY "Admins can manage subscription plans"
  ON subscription_plans FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));


-- 14. RLS Policies for user_subscriptions
-- ============================================================================

CREATE POLICY "Users can view own subscription"
  ON user_subscriptions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all subscriptions"
  ON user_subscriptions FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage subscriptions"
  ON user_subscriptions FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can update subscriptions"
  ON user_subscriptions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);


-- 15. RLS Policies for subscription_usage
-- ============================================================================

CREATE POLICY "Users can view own usage"
  ON subscription_usage FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all usage"
  ON subscription_usage FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can manage usage"
  ON subscription_usage FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);


-- 16. RLS Policies for subscription_history
-- ============================================================================

CREATE POLICY "Users can view own subscription history"
  ON subscription_history FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all subscription history"
  ON subscription_history FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert subscription history"
  ON subscription_history FOR INSERT
  TO authenticated
  WITH CHECK (true);


-- 17. RLS Policies for grace_period_reminders_sent
-- ============================================================================

CREATE POLICY "System can manage grace period reminders"
  ON grace_period_reminders_sent FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);


-- 18. RLS Policies for enterprise_contact_requests
-- ============================================================================

CREATE POLICY "Users can create enterprise contact requests"
  ON enterprise_contact_requests FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own enterprise requests"
  ON enterprise_contact_requests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all enterprise requests"
  ON enterprise_contact_requests FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));


-- 19. Helper Function: get_user_subscription
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_subscription(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'plan', sp.slug,
    'plan_name', sp.name,
    'status', us.status,
    'subscription_type', us.subscription_type,
    'is_trial', us.status = 'trialing',
    'trial_end', us.trial_end,
    'current_period_end', us.current_period_end,
    'grace_period_ends_at', us.grace_period_ends_at,
    'features', sp.feature_limits,
    'usage', (
      SELECT jsonb_build_object(
        'signatures_used', COALESCE(su.signatures_used, 0),
        'signatures_limit', (sp.feature_limits->>'digital_signatures_per_year')::INTEGER,
        'overage', COALESCE(su.overage_signatures_used, 0),
        'remaining', GREATEST(0, (sp.feature_limits->>'digital_signatures_per_year')::INTEGER - COALESCE(su.signatures_used, 0))
      )
      FROM subscription_usage su
      WHERE su.user_id = p_user_id AND su.year = EXTRACT(YEAR FROM now())::INTEGER
    )
  ) INTO v_result
  FROM user_subscriptions us
  JOIN subscription_plans sp ON sp.id = us.plan_id
  WHERE us.user_id = p_user_id;
  
  RETURN v_result;
END;
$$;


-- 20. Helper Function: can_use_feature
-- ============================================================================

CREATE OR REPLACE FUNCTION can_use_feature(p_user_id UUID, p_feature TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enabled BOOLEAN;
BEGIN
  SELECT (sp.feature_limits->(p_feature || '_enabled'))::BOOLEAN INTO v_enabled
  FROM user_subscriptions us
  JOIN subscription_plans sp ON sp.id = us.plan_id
  WHERE us.user_id = p_user_id
    AND us.status IN ('active', 'trialing');
  
  RETURN COALESCE(v_enabled, false);
END;
$$;