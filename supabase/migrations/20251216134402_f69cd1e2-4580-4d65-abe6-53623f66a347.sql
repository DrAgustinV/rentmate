-- Add reminder tracking columns to contract_signatures
ALTER TABLE contract_signatures 
ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reminder_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS tenant_signer_id TEXT;