-- Fix infinite recursion in properties RLS policy
-- Drop the problematic policy
DROP POLICY IF EXISTS "Tenants can view assigned properties" ON public.properties;

-- Recreate with explicit properties.id reference
CREATE POLICY "Tenants can view assigned properties" ON public.properties
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.property_tenants
      WHERE property_id = properties.id AND tenant_id = auth.uid()
    )
  );