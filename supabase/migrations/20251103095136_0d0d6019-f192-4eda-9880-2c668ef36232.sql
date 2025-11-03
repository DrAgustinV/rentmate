-- Allow tenants to update their own rent agreements
-- This enables them to save their IBAN for SEPA Direct Debit setup
CREATE POLICY "Tenants can update their rent agreements"
ON rent_agreements
FOR UPDATE
TO public
USING (auth.uid() = tenant_id)
WITH CHECK (auth.uid() = tenant_id);