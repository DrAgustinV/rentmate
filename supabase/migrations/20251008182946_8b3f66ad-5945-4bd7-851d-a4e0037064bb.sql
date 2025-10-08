-- Remove conflicting foreign key that references auth.users
ALTER TABLE property_tenants 
DROP CONSTRAINT IF EXISTS property_tenants_tenant_id_fkey;