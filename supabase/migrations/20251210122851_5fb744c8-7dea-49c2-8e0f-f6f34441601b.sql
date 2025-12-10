-- Add RLS policy for tenants to view tenancy_requirements by email
CREATE POLICY "Tenants can view requirements by email"
ON tenancy_requirements FOR SELECT
USING (
  tenant_email = (SELECT email FROM profiles WHERE id = auth.uid())
  AND status IN ('sent', 'accepted', 'completed')
);