-- Remove color preferences from user_preferences table
-- Colors are now controlled only by admins via brand_settings
ALTER TABLE public.user_preferences 
  DROP COLUMN IF EXISTS primary_color,
  DROP COLUMN IF EXISTS accent_color;