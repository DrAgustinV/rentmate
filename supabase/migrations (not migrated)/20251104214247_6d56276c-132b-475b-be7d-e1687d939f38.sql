
-- Add UPDATE policy for analytics_page_views to allow geolocation updates
CREATE POLICY "System can update page views for geolocation"
ON public.analytics_page_views
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);
