-- Add 'pending' to tenancy_status enum
-- This enables managers to proceed with management while waiting for tenant to accept invitation

ALTER TYPE public.tenancy_status ADD VALUE 'pending';

-- Update the CHECK constraint to include pending
ALTER TABLE public.property_tenants
DROP CONSTRAINT IF EXISTS property_tenants_tenancy_status_check;

ALTER TABLE public.property_tenants
ADD CONSTRAINT property_tenants_tenancy_status_check
CHECK (tenancy_status = ANY (ARRAY['active'::text, 'ending_tenancy'::text, 'historic'::text, 'pending'::text]));

-- Make tenant_id nullable to allow pending tenancies (no tenant yet)
ALTER TABLE public.property_tenants ALTER COLUMN tenant_id DROP NOT NULL;