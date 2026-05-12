-- Remove hardcoded language constraint to support multiple languages
ALTER TABLE user_preferences 
DROP CONSTRAINT IF EXISTS user_preferences_language_check;

-- Add flexible constraint for language code format (2-letter ISO codes, optional region like pt-BR)
ALTER TABLE user_preferences 
ADD CONSTRAINT user_preferences_language_format_check 
CHECK (language ~ '^[a-z]{2}(-[A-Z]{2})?$');