
-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Managers can add tenants to their active properties" ON public.property_tenants;

-- Create updated INSERT policy that allows invitation acceptance
CREATE POLICY "Managers and invited users can add tenants"
ON public.property_tenants
FOR INSERT
WITH CHECK (
  -- Managers can add tenants to their active properties
  (EXISTS (
    SELECT 1
    FROM properties
    WHERE properties.id = property_tenants.property_id
      AND properties.manager_id = auth.uid()
      AND properties.status = 'active'::property_status
  ))
  OR
  -- Users can add themselves when they have a valid pending invitation
  (
    property_tenants.tenant_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM invitations
      JOIN profiles ON profiles.id = auth.uid()
      WHERE invitations.property_id = property_tenants.property_id
        AND invitations.email = profiles.email
        AND invitations.status = 'pending'
        AND invitations.expires_at > now()
    )
  )
  OR
  -- Admins can add anyone
  has_role(auth.uid(), 'admin'::app_role)
);
