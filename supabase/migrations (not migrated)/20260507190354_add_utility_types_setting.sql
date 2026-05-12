-- Add configurable utility types to system_settings

INSERT INTO public.system_settings (setting_key, setting_value, description) VALUES
  ('utility_types', '{"value": ["electricity", "water", "gas", "internet", "heating", "trash"]}'::jsonb, 'Available utility types for tenancy setup (stored as JSON array of strings)')
ON CONFLICT (setting_key) DO NOTHING;
