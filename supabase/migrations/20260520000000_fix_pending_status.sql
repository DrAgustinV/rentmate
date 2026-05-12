-- Add pending to the check constraint (it's a text column, not an enum)
ALTER TABLE public.property_tenants
DROP CONSTRAINT IF EXISTS property_tenants_tenancy_status_check;

ALTER TABLE public.property_tenants
ADD CONSTRAINT property_tenants_tenancy_status_check
CHECK (tenancy_status = ANY (ARRAY['active'::text, 'ending_tenancy'::text, 'historic'::text, 'pending'::text]));

-- Ensure tenant_id is nullable
ALTER TABLE public.property_tenants ALTER COLUMN tenant_id DROP NOT NULL;