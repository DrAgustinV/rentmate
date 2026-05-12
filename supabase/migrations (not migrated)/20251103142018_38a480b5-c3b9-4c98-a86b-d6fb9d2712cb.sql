-- Drop the previous view that had security issues
DROP VIEW IF EXISTS dock_signed_contracts;

-- Recreate view with SECURITY INVOKER to respect RLS policies
CREATE OR REPLACE VIEW dock_signed_contracts 
WITH (security_invoker = true)
AS
SELECT 
  cs.*,
  p.title as property_title,
  p.address as property_address,
  pt.tenant_id,
  manager_profile.email as manager_email,
  manager_profile.first_name as manager_first_name,
  manager_profile.last_name as manager_last_name,
  tenant_profile.email as tenant_email,
  tenant_profile.first_name as tenant_first_name,
  tenant_profile.last_name as tenant_last_name
FROM contract_signatures cs
JOIN properties p ON p.id = cs.property_id
JOIN property_tenants pt ON pt.id = cs.tenancy_id
JOIN profiles manager_profile ON manager_profile.id = cs.initiated_by
JOIN profiles tenant_profile ON tenant_profile.id = pt.tenant_id
WHERE cs.signing_method = 'dock';