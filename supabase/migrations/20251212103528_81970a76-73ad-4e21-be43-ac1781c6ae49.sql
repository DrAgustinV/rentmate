-- Update handle_new_user() to auto-create FREE subscription for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  free_plan_id uuid;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  );
  
  -- Assign default 'user' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  -- Get the FREE plan ID
  SELECT id INTO free_plan_id FROM public.subscription_plans WHERE slug = 'free' LIMIT 1;
  
  -- Create FREE subscription if plan exists
  IF free_plan_id IS NOT NULL THEN
    INSERT INTO public.user_subscriptions (user_id, plan_id, subscription_type, status)
    VALUES (NEW.id, free_plan_id, 'free', 'active');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Backfill FREE subscriptions for existing users who don't have one
INSERT INTO public.user_subscriptions (user_id, plan_id, subscription_type, status)
SELECT 
  p.id as user_id,
  sp.id as plan_id,
  'free'::subscription_type as subscription_type,
  'active'::subscription_status as status
FROM public.profiles p
CROSS JOIN public.subscription_plans sp
WHERE sp.slug = 'free'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_subscriptions us WHERE us.user_id = p.id
  );