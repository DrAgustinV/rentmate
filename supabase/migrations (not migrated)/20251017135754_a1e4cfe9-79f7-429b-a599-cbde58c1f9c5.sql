-- Phase 1: Fix Profile Access - Remove blocking policy and add admin access
DROP POLICY IF EXISTS "Block unauthorized profile access" ON public.profiles;

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Phase 2: Fix Property Access - Make tenant access explicit for active and ending tenancies
DROP POLICY IF EXISTS "Tenants can view assigned properties" ON public.properties;

CREATE POLICY "Tenants can view assigned properties"
ON public.properties FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM property_tenants
    WHERE property_tenants.property_id = properties.id
      AND property_tenants.tenant_id = auth.uid()
      AND property_tenants.tenancy_status IN ('active', 'ending_tenancy')
  )
);