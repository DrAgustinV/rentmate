-- Add RLS policy to allow managers to view their tenants' profiles
CREATE POLICY "Managers can view their tenants profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.property_tenants pt
    JOIN public.properties p ON p.id = pt.property_id
    WHERE pt.tenant_id = profiles.id
      AND p.manager_id = auth.uid()
  )
);