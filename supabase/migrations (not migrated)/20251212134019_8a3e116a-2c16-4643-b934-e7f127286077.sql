
CREATE OR REPLACE FUNCTION public.get_user_subscription(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    'usage', COALESCE(
      (
        SELECT jsonb_build_object(
          'signatures_used', COALESCE(su.signatures_used, 0),
          'signatures_limit', (sp.feature_limits->>'digital_signatures_per_year')::INTEGER,
          'overage', COALESCE(su.overage_signatures_used, 0),
          'remaining', GREATEST(0, (sp.feature_limits->>'digital_signatures_per_year')::INTEGER - COALESCE(su.signatures_used, 0))
        )
        FROM subscription_usage su
        WHERE su.user_id = p_user_id AND su.year = EXTRACT(YEAR FROM now())::INTEGER
      ),
      jsonb_build_object(
        'signatures_used', 0,
        'signatures_limit', (sp.feature_limits->>'digital_signatures_per_year')::INTEGER,
        'overage', 0,
        'remaining', (sp.feature_limits->>'digital_signatures_per_year')::INTEGER
      )
    )
  ) INTO v_result
  FROM user_subscriptions us
  JOIN subscription_plans sp ON sp.id = us.plan_id
  WHERE us.user_id = p_user_id;
  
  RETURN v_result;
END;
$function$;
