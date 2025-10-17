-- Add custom_domain column to brand_settings table
ALTER TABLE public.brand_settings 
ADD COLUMN custom_domain text;

COMMENT ON COLUMN public.brand_settings.custom_domain IS 'Custom domain for the application (e.g., rentmate.me)';