-- Add new ticket types to support maintenance templates
ALTER TYPE ticket_type ADD VALUE IF NOT EXISTS 'maintenance';
ALTER TYPE ticket_type ADD VALUE IF NOT EXISTS 'repair';
ALTER TYPE ticket_type ADD VALUE IF NOT EXISTS 'inspection';
ALTER TYPE ticket_type ADD VALUE IF NOT EXISTS 'cleaning';
ALTER TYPE ticket_type ADD VALUE IF NOT EXISTS 'other';