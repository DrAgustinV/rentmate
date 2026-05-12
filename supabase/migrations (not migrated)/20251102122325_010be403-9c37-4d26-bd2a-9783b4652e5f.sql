-- Make tenant_iban nullable (tenants provide it later)
ALTER TABLE public.rent_agreements 
ALTER COLUMN tenant_iban DROP NOT NULL;

-- Add 'failed' to mandate_status constraint
ALTER TABLE public.rent_agreements 
DROP CONSTRAINT IF EXISTS valid_mandate_status;

ALTER TABLE public.rent_agreements 
ADD CONSTRAINT valid_mandate_status 
CHECK (mandate_status IN ('pending', 'active', 'inactive', 'failed'));

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_rent_agreements_mandate_status 
ON public.rent_agreements(mandate_status);