-- Add foreign key constraint from property_tenants.tenant_id to profiles.id
ALTER TABLE property_tenants 
ADD CONSTRAINT fk_property_tenants_profiles 
FOREIGN KEY (tenant_id) REFERENCES profiles(id) ON DELETE CASCADE;