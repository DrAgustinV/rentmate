-- Add manager-entered tenant contact info to property_tenants
-- These fields store what the manager records about the tenant,
-- separate from whatever the tenant enters in their own profile.

ALTER TABLE property_tenants
  ADD COLUMN IF NOT EXISTS manager_tenant_name TEXT,
  ADD COLUMN IF NOT EXISTS manager_tenant_surname TEXT,
  ADD COLUMN IF NOT EXISTS manager_tenant_phone TEXT;

-- Self-managed tenancies have no linked tenant, so tenant_id must be nullable
ALTER TABLE property_tenants ALTER COLUMN tenant_id DROP NOT NULL;
