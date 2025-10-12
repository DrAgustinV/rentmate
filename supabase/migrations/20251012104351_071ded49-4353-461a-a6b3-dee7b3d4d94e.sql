-- Add source_template_id column to tickets table to track auto-generated tickets
ALTER TABLE tickets 
ADD COLUMN source_template_id UUID REFERENCES ticket_templates(id) ON DELETE SET NULL;

-- Add index for performance when filtering recurring tickets
CREATE INDEX idx_tickets_source_template ON tickets(source_template_id);