-- Create brand settings table
CREATE TABLE IF NOT EXISTS public.brand_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name TEXT NOT NULL DEFAULT 'RentMate',
  logo_url TEXT,
  primary_color TEXT NOT NULL DEFAULT '221 83% 53%',
  accent_color TEXT NOT NULL DEFAULT '199 89% 48%',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.brand_settings ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read brand settings
CREATE POLICY "Anyone can view brand settings"
  ON public.brand_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can update brand settings
CREATE POLICY "Only admins can update brand settings"
  ON public.brand_settings
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can insert brand settings
CREATE POLICY "Only admins can insert brand settings"
  ON public.brand_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create storage bucket for brand logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('brand-logos', 'brand-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for brand logos
CREATE POLICY "Brand logos are publicly accessible"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'brand-logos');

CREATE POLICY "Only admins can upload brand logos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'brand-logos' AND
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Only admins can update brand logos"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'brand-logos' AND
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Only admins can delete brand logos"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'brand-logos' AND
    public.has_role(auth.uid(), 'admin')
  );

-- Insert default brand settings
INSERT INTO public.brand_settings (brand_name, primary_color, accent_color)
VALUES ('RentMate', '221 83% 53%', '199 89% 48%')
ON CONFLICT DO NOTHING;

-- Create trigger to update updated_at
CREATE TRIGGER update_brand_settings_updated_at
  BEFORE UPDATE ON public.brand_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();