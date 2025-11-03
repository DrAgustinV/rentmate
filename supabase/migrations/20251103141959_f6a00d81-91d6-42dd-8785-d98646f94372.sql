-- Add Dock Labs contract signing columns to contract_signatures table
ALTER TABLE contract_signatures
ADD COLUMN IF NOT EXISTS dock_workflow_id TEXT,
ADD COLUMN IF NOT EXISTS dock_contract_url TEXT,
ADD COLUMN IF NOT EXISTS dock_manager_signature_proof TEXT,
ADD COLUMN IF NOT EXISTS dock_tenant_signature_proof TEXT,
ADD COLUMN IF NOT EXISTS signing_method TEXT DEFAULT 'mock' CHECK (signing_method IN ('mock', 'dock'));

-- Add index for Dock workflow ID lookups
CREATE INDEX IF NOT EXISTS idx_contract_signatures_dock_workflow 
ON contract_signatures(dock_workflow_id) 
WHERE dock_workflow_id IS NOT NULL;

-- Add comment explaining the signing methods
COMMENT ON COLUMN contract_signatures.signing_method IS 'Method used for contract signing: mock (default for testing) or dock (Dock Labs verifiable credentials)';

-- Create a view for easy querying of Dock-signed contracts
CREATE OR REPLACE VIEW dock_signed_contracts AS
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