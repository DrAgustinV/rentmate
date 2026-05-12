-- Create security definer function to check if a user is a property manager
CREATE OR REPLACE FUNCTION public.is_property_manager(_user_id uuid, _property_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.properties
    WHERE id = _property_id
      AND manager_id = _user_id
  )
$$;

-- Drop the problematic policy on property_tenants
DROP POLICY IF EXISTS "Anyone can view their tenant relationships" ON public.property_tenants;

-- Recreate it using the security definer function to break circular dependency
CREATE POLICY "Anyone can view their tenant relationships" ON public.property_tenants
  FOR SELECT USING (
    public.is_property_manager(auth.uid(), property_id)
    OR auth.uid() = tenant_id
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );