-- Add columns to track invitation decline reasons
ALTER TABLE invitations 
  ADD COLUMN IF NOT EXISTS decline_reason text,
  ADD COLUMN IF NOT EXISTS declined_at timestamptz;