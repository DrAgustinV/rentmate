-- Add max active properties per user setting
INSERT INTO system_settings (setting_key, setting_value, description)
VALUES (
  'max_active_properties_per_user',
  '{"value": 5}'::jsonb,
  'Maximum number of active properties a user can manage'
);