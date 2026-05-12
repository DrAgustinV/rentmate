-- Fix the security definer view issue by recreating without SECURITY DEFINER
-- The previous view was automatically created as SECURITY DEFINER which bypasses RLS
DROP VIEW IF EXISTS public.invitations_safe;

-- Recreate as SECURITY INVOKER (default) so RLS policies are enforced
CREATE VIEW public.invitations_safe 
WITH (security_invoker = true)
AS
SELECT 
  id,
  property_id,
  email,
  status,
  expires_at,
  created_at,
  invited_user_id
FROM public.invitations;

-- Grant access to authenticated users
GRANT SELECT ON public.invitations_safe TO authenticated;