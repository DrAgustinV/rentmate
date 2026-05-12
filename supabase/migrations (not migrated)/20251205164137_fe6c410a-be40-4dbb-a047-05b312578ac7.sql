-- Add header_background_color column to brand_settings
ALTER TABLE public.brand_settings 
ADD COLUMN header_background_color text NOT NULL DEFAULT '173 77% 40%';

-- Comment explaining the format
COMMENT ON COLUMN public.brand_settings.header_background_color IS 'Header background color in HSL format (e.g., 173 77% 40% for teal)';