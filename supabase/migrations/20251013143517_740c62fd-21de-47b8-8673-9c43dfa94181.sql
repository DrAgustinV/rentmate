-- Add language support to user preferences
ALTER TABLE user_preferences 
ADD COLUMN language text DEFAULT 'en' CHECK (language IN ('en', 'es'));