-- Drop the old constraint
ALTER TABLE contract_signatures 
DROP CONSTRAINT IF EXISTS contract_signatures_signing_method_check;

-- Add new constraint with 'docuseal' included
ALTER TABLE contract_signatures
ADD CONSTRAINT contract_signatures_signing_method_check 
CHECK (signing_method IN ('mock', 'dock', 'docuseal'));

-- Update the column comment
COMMENT ON COLUMN contract_signatures.signing_method IS 
'Method used for contract signing: mock (testing), dock (Dock Labs verifiable credentials), or docuseal (DocuSeal e-signatures)';