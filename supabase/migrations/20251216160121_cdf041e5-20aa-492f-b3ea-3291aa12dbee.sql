-- Create atomic increment functions for overage tracking
CREATE OR REPLACE FUNCTION public.increment_overage_signatures(
  p_user_id UUID,
  p_year INTEGER,
  p_amount INTEGER DEFAULT 1
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE subscription_usage
  SET 
    overage_signatures_used = overage_signatures_used + p_amount,
    last_overage_billed_at = NOW(),
    updated_at = NOW()
  WHERE user_id = p_user_id AND year = p_year;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_overage_gov_id(
  p_user_id UUID,
  p_year INTEGER,
  p_amount INTEGER DEFAULT 1
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE subscription_usage
  SET 
    overage_government_id_used = overage_government_id_used + p_amount,
    last_gov_id_overage_billed_at = NOW(),
    updated_at = NOW()
  WHERE user_id = p_user_id AND year = p_year;
END;
$$;

-- Function to increment included signatures (within limit)
CREATE OR REPLACE FUNCTION public.increment_signatures_used(
  p_user_id UUID,
  p_year INTEGER,
  p_amount INTEGER DEFAULT 1
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO subscription_usage (user_id, year, signatures_used, reset_at)
  VALUES (p_user_id, p_year, p_amount, (p_year + 1 || '-01-01')::TIMESTAMPTZ)
  ON CONFLICT (user_id, year) 
  DO UPDATE SET 
    signatures_used = subscription_usage.signatures_used + p_amount,
    updated_at = NOW();
END;
$$;

-- Function to increment included Gov ID verifications (within limit)
CREATE OR REPLACE FUNCTION public.increment_gov_id_used(
  p_user_id UUID,
  p_year INTEGER,
  p_amount INTEGER DEFAULT 1
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO subscription_usage (user_id, year, government_id_verifications_used, reset_at)
  VALUES (p_user_id, p_year, p_amount, (p_year + 1 || '-01-01')::TIMESTAMPTZ)
  ON CONFLICT (user_id, year) 
  DO UPDATE SET 
    government_id_verifications_used = subscription_usage.government_id_verifications_used + p_amount,
    updated_at = NOW();
END;
$$;