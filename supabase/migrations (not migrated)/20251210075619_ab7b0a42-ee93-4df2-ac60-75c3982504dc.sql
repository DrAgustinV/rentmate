-- Create a SECURITY DEFINER function to check if an email has an account
-- This allows anonymous users to check account existence without exposing profile data
CREATE OR REPLACE FUNCTION public.check_email_has_account(check_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE LOWER(email) = LOWER(check_email)
  );
$$;

-- Grant execute to both anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.check_email_has_account(text) TO anon;
GRANT EXECUTE ON FUNCTION public.check_email_has_account(text) TO authenticated;