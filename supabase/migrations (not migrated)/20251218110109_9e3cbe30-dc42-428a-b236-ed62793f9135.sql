-- Add videos column to property_tenants for tenancy-level video documentation
ALTER TABLE public.property_tenants ADD COLUMN videos text[] DEFAULT '{}';

-- Remove unused columns from properties table
ALTER TABLE public.properties DROP COLUMN IF EXISTS videos;
ALTER TABLE public.properties DROP COLUMN IF EXISTS require_kyc_for_contracts;
ALTER TABLE public.properties DROP COLUMN IF EXISTS last_modified_by;
ALTER TABLE public.properties DROP COLUMN IF EXISTS modification_reason;
ALTER TABLE public.properties DROP COLUMN IF EXISTS previous_property_id;

-- Remove unused column from profiles table
ALTER TABLE public.profiles DROP COLUMN IF EXISTS require_kyc_for_contracts;