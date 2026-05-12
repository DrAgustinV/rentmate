-- Add security deposit and utilities fields to rent_agreements table
ALTER TABLE public.rent_agreements
ADD COLUMN security_deposit_cents BIGINT,
ADD COLUMN deposit_return_days INTEGER DEFAULT 30,
ADD COLUMN utilities_tenant_responsible TEXT,
ADD COLUMN utilities_manager_responsible TEXT;