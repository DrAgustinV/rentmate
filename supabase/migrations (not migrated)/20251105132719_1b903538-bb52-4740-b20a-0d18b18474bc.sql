-- Add foreign key constraint from property_tenants to profiles
ALTER TABLE property_tenants
ADD CONSTRAINT property_tenants_tenant_id_fkey 
FOREIGN KEY (tenant_id) 
REFERENCES profiles(id) 
ON DELETE CASCADE;