-- Add week_start_day column to user_preferences table
ALTER TABLE user_preferences 
ADD COLUMN week_start_day text DEFAULT 'monday';

-- Add a check constraint to ensure only valid values
ALTER TABLE user_preferences
ADD CONSTRAINT week_start_day_check CHECK (week_start_day IN ('sunday', 'monday'));