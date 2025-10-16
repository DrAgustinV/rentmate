-- Create language_settings table
CREATE TABLE language_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  language_code TEXT UNIQUE NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  display_order INTEGER,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Insert all 12 languages (only EN and ES enabled by default since they have translations)
INSERT INTO language_settings (language_code, is_enabled, display_order) VALUES
  ('en', true, 1),
  ('es', true, 2),
  ('fr', false, 3),
  ('de', false, 4),
  ('pt', false, 5),
  ('it', false, 6),
  ('nl', false, 7),
  ('pl', false, 8),
  ('sr', false, 9),
  ('ja', false, 10),
  ('zh', false, 11),
  ('ar', false, 12);

-- Enable RLS
ALTER TABLE language_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anyone can view language settings"
  ON language_settings FOR SELECT USING (true);

CREATE POLICY "Only admins can update language settings"
  ON language_settings FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));