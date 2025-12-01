-- Step 1: Rename signing_method to signing_method_provider
ALTER TABLE contract_signatures 
  RENAME COLUMN signing_method TO signing_method_provider;

-- Step 2: Drop old constraint
ALTER TABLE contract_signatures 
  DROP CONSTRAINT IF EXISTS contract_signatures_signing_method_check;

-- Step 3: Migrate existing 'qualified' records to their actual provider
UPDATE contract_signatures 
SET signing_method_provider = qualified_signature_provider 
WHERE signing_method_provider = 'qualified' 
  AND qualified_signature_provider IN ('openapi', 'yousign', 'autofirma');

-- Step 4: Add new constraint with all providers
ALTER TABLE contract_signatures 
  ADD CONSTRAINT contract_signatures_signing_method_provider_check 
  CHECK (signing_method_provider = ANY (ARRAY['mock', 'dock', 'docuseal', 'openapi', 'yousign']));

-- Step 5: Add signature_method column (SAS/AES/QES)
ALTER TABLE contract_signatures 
  ADD COLUMN signature_method text DEFAULT 'SAS';

-- Step 6: Add CHECK constraint for signature method
ALTER TABLE contract_signatures 
  ADD CONSTRAINT contract_signatures_signature_method_check 
  CHECK (signature_method = ANY (ARRAY['SAS', 'AES', 'QES']));

-- Step 7: Set default methods based on provider
UPDATE contract_signatures SET signature_method = 'AES' WHERE signing_method_provider = 'yousign';
UPDATE contract_signatures SET signature_method = 'SAS' WHERE signing_method_provider IN ('mock', 'dock', 'docuseal');

-- Step 8: Drop old manager/tenant signature method constraints (if they exist)
ALTER TABLE contract_signatures 
  DROP CONSTRAINT IF EXISTS contract_signatures_manager_signature_method_check;
ALTER TABLE contract_signatures 
  DROP CONSTRAINT IF EXISTS contract_signatures_tenant_signature_method_check;

-- Step 9: Migrate old manager/tenant signature method values to new format
UPDATE contract_signatures 
SET manager_signature_method = 'SAS' 
WHERE manager_signature_method IN ('certificado_digital', 'clave', 'mock');

UPDATE contract_signatures 
SET manager_signature_method = 'AES' 
WHERE manager_signature_method IN ('electronic_signature', 'docuseal');

UPDATE contract_signatures 
SET manager_signature_method = 'QES' 
WHERE manager_signature_method = 'qualified_signature';

UPDATE contract_signatures 
SET tenant_signature_method = 'SAS' 
WHERE tenant_signature_method IN ('certificado_digital', 'clave', 'mock');

UPDATE contract_signatures 
SET tenant_signature_method = 'AES' 
WHERE tenant_signature_method IN ('electronic_signature', 'docuseal');

UPDATE contract_signatures 
SET tenant_signature_method = 'QES' 
WHERE tenant_signature_method = 'qualified_signature';

-- Step 10: Add new constraints for manager/tenant signature methods
ALTER TABLE contract_signatures 
  ADD CONSTRAINT contract_signatures_manager_signature_method_check 
  CHECK (manager_signature_method IS NULL OR manager_signature_method = ANY (ARRAY['SAS', 'AES', 'QES']));

ALTER TABLE contract_signatures 
  ADD CONSTRAINT contract_signatures_tenant_signature_method_check 
  CHECK (tenant_signature_method IS NULL OR tenant_signature_method = ANY (ARRAY['SAS', 'AES', 'QES']));