-- Drop existing constraint
ALTER TABLE public.property_tenants
DROP CONSTRAINT IF EXISTS property_tenants_tenancy_status_check;

-- Add new constraint with 'historic' instead of 'inactive'
ALTER TABLE public.property_tenants
ADD CONSTRAINT property_tenants_tenancy_status_check
CHECK (tenancy_status = ANY (ARRAY['active'::text, 'ending_tenancy'::text, 'historic'::text]));

-- Update any existing inactive records to historic
UPDATE public.property_tenants
SET tenancy_status = 'historic'
WHERE tenancy_status = 'inactive';