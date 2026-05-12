-- Allow tenants to view their manager's SEPA payment details
-- This is required for the generate-sepa-mandate-pdf edge function to access manager info
CREATE POLICY "Tenants can view their managers SEPA details"
ON profiles
FOR SELECT
TO public
USING (
  id IN (
    SELECT p.manager_id
    FROM properties p
    JOIN property_tenants pt ON pt.property_id = p.id
    WHERE pt.tenant_id = auth.uid()
      AND pt.tenancy_status IN ('active', 'ending_tenancy')
  )
);