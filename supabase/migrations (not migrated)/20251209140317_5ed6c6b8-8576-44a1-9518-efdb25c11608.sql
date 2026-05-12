-- Create a secure view exposing only non-sensitive profile columns
-- Following the existing invitations_safe pattern

CREATE OR REPLACE VIEW public.profiles_public AS
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

-- Add comment explaining the view purpose
COMMENT ON VIEW public.profiles_public IS 'Public-safe view of profiles excluding sensitive fields like IBAN, KYC data, deletion status, and verification tokens';

-- Create a helper function to check if user can see full profile
CREATE OR REPLACE FUNCTION public.can_view_full_profile(_viewer_id uuid, _profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    _viewer_id = _profile_id  -- User viewing their own profile
    OR has_role(_viewer_id, 'admin'::app_role)  -- Admin can see all
$$;