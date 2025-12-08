-- Add planned_ending_date column to property_tenants
ALTER TABLE public.property_tenants
ADD COLUMN planned_ending_date DATE;

-- Add comment for documentation
COMMENT ON COLUMN public.property_tenants.planned_ending_date IS 'The planned date when the tenancy will end, set when marking tenancy as ending_tenancy';