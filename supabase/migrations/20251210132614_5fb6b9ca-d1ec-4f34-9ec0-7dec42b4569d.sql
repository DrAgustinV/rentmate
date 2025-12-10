-- Step 1: Drop existing constraint
ALTER TABLE tenancy_requirements DROP CONSTRAINT IF EXISTS tenancy_requirements_contract_method_check;

-- Step 2: Update existing data FIRST
UPDATE tenancy_requirements SET contract_method = 'digital' WHERE contract_method = 'yousign';
UPDATE tenancy_requirements SET contract_method = 'digital' WHERE contract_method = 'docuseal';

-- Step 3: Add new constraint with correct values
ALTER TABLE tenancy_requirements ADD CONSTRAINT tenancy_requirements_contract_method_check 
  CHECK (contract_method IN ('digital', 'manual', 'none'));