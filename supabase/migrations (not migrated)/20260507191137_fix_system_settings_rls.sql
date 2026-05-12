-- Fix RLS policies for system_settings to allow admin upserts

-- Add INSERT policy for admins (needed for upsert)
CREATE POLICY "Only admins can insert system settings"
ON public.system_settings
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
