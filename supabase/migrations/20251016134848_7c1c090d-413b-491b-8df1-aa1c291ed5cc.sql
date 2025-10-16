-- Add 'cancelled' status to invitation_status enum
ALTER TYPE invitation_status ADD VALUE IF NOT EXISTS 'cancelled';