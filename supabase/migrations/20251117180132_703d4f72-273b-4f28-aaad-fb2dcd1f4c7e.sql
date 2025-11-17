-- Allow 'qualified' as a valid signing method for qualified digital signatures
ALTER TABLE contract_signatures 
  DROP CONSTRAINT IF EXISTS contract_signatures_signing_method_check;

ALTER TABLE contract_signatures 
  ADD CONSTRAINT contract_signatures_signing_method_check 
  CHECK (signing_method IN ('mock', 'dock', 'docuseal', 'qualified'));