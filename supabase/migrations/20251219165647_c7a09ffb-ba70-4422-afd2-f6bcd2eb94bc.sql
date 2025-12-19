-- Allow tenants to create utility payments for their properties
CREATE POLICY "Tenants can create utility payments for their properties"
ON utility_payments FOR INSERT
WITH CHECK (
  auth.uid() = tenant_id
  AND is_property_tenant(auth.uid(), property_id)
);