-- Make tenant_id nullable in property_tenants
ALTER TABLE public.property_tenants ALTER COLUMN tenant_id DROP NOT NULL;