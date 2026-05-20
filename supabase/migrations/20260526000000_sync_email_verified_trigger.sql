-- Sync auth.users.email_confirmed_at -> profiles.email_verified
-- When a user confirms their email via Supabase's built-in flow,
-- automatically set profiles.email_verified so the app gate passes.

CREATE OR REPLACE FUNCTION public.sync_email_verified()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.profiles
  SET email_verified = true
  WHERE id = NEW.id AND email_verified = false;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_email_confirmed
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  WHEN (NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL)
  EXECUTE FUNCTION public.sync_email_verified();
