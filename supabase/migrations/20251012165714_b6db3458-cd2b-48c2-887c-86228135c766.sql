-- Add RLS policy to allow tenants to update tickets for their properties
CREATE POLICY "Tenants can update tickets for their properties"
ON public.tickets FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.property_tenants
    WHERE property_tenants.property_id = tickets.property_id
    AND property_tenants.tenant_id = auth.uid()
  )
);