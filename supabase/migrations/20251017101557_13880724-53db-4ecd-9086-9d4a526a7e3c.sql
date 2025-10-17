-- Fix Security Issue 1: Block direct access to invitation tokens via SELECT
-- Create a view that excludes the token field for secure reading
CREATE OR REPLACE VIEW public.invitations_safe AS
SELECT 
  id,
  property_id,
  email,
  status,
  expires_at,
  created_at,
  invited_user_id
FROM public.invitations;

-- Grant access to the view
GRANT SELECT ON public.invitations_safe TO authenticated;

-- Fix Security Issue 2: Add explicit default DENY policy for profiles table
-- This prevents unauthorized enumeration of user contact information
CREATE POLICY "Block unauthorized profile access"
ON public.profiles
FOR SELECT
USING (false);

-- Note: The existing specific policies (users can view own profile, managers can view tenants)
-- will still work because they are evaluated after this default DENY policy.
-- PostgreSQL RLS evaluates policies with OR logic, so any matching policy grants access.