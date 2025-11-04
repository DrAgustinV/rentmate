-- Allow everyone to read brand settings (public branding information)
CREATE POLICY "Brand settings are publicly readable"
  ON public.brand_settings
  FOR SELECT
  TO authenticated, anon
  USING (true);