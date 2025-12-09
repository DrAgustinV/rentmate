-- Drop and recreate view with SECURITY INVOKER (explicit, respects caller's RLS)
DROP VIEW IF EXISTS public.profiles_public;

CREATE VIEW public.profiles_public 
WITH (security_invoker = true)
AS
SELECT 
  id,
  email,
  first_name,
  last_name,
  avatar_url,
  phone,
  email_verified,
  created_at,
  updated_at
FROM public.profiles;

-- Grant access to the view
GRANT SELECT ON public.profiles_public TO authenticated;
GRANT SELECT ON public.profiles_public TO anon;

COMMENT ON VIEW public.profiles_public IS 'Public-safe view of profiles excluding sensitive fields like IBAN, KYC data, deletion status, and verification tokens';