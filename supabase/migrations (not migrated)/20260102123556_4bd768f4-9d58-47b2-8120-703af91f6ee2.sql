-- Add scheduled_date column to tickets table for future-dated maintenance tasks
ALTER TABLE tickets 
ADD COLUMN scheduled_date DATE;

COMMENT ON COLUMN tickets.scheduled_date IS 
'Date when this ticket is scheduled to be actionable. NULL means immediate/already due.';