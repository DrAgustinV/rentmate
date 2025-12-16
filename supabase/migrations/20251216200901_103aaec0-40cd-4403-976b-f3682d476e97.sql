-- Break RLS recursion by using a SECURITY DEFINER helper for current user's email

CREATE OR REPLACE FUNCTION public.get_auth_user_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email
  FROM public.profiles
  WHERE id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.get_auth_user_email() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_auth_user_email() TO authenticated;

-- Recreate policies to avoid referencing profiles directly inside RLS (prevents recursion)

DROP POLICY IF EXISTS "Invited users can view properties they are invited to" ON public.properties;
CREATE POLICY "Invited users can view properties they are invited to"
ON public.properties
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.invitations i
    WHERE i.property_id = properties.id
      AND lower(i.email) = lower(public.get_auth_user_email())
      AND i.status = 'pending'
      AND i.expires_at > now()
  )
);

DROP POLICY IF EXISTS "Users can view invitations sent to their email" ON public.invitations;
DROP POLICY IF EXISTS "Users can update invitations sent to them" ON public.invitations;

CREATE POLICY "Users can view invitations sent to their email"
ON public.invitations
FOR SELECT
TO authenticated
USING (
  lower(email) = lower(public.get_auth_user_email())
  OR public.is_property_manager(auth.uid(), property_id)
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE POLICY "Users can update invitations sent to them"
ON public.invitations
FOR UPDATE
TO authenticated
USING (
  lower(email) = lower(public.get_auth_user_email())
  OR public.is_property_manager(auth.uid(), property_id)
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
)
WITH CHECK (
  lower(email) = lower(public.get_auth_user_email())
  OR public.is_property_manager(auth.uid(), property_id)
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);
