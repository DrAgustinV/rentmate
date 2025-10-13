-- Create user_preferences table
CREATE TABLE public.user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  theme_mode text DEFAULT 'system' CHECK (theme_mode IN ('light', 'dark', 'system')),
  primary_color text DEFAULT '221 83% 53%',
  accent_color text DEFAULT '199 89% 48%',
  font_size text DEFAULT 'md' CHECK (font_size IN ('sm', 'md', 'lg')),
  date_format text DEFAULT 'PPP' CHECK (date_format IN ('PPP', 'MM/dd/yyyy', 'dd/MM/yyyy', 'yyyy-MM-dd')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own preferences"
  ON public.user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON public.user_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON public.user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();