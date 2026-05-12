-- Allow invited users to view properties they have pending invitations for
CREATE POLICY "Invited users can view properties they are invited to"
ON public.properties
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM invitations
    WHERE invitations.property_id = properties.id
    AND invitations.email = (
      SELECT email FROM profiles WHERE id = auth.uid()
    )
    AND invitations.status = 'pending'
    AND invitations.expires_at > NOW()
  )
);