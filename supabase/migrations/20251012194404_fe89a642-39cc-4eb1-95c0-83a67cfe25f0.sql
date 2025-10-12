-- Add RLS policy for tenants to view recurring schedules
CREATE POLICY "Tenants can view schedules for their properties"
ON recurring_schedules FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM property_tenants
    WHERE property_tenants.property_id = recurring_schedules.property_id
    AND property_tenants.tenant_id = auth.uid()
  )
);

-- Add RLS policy for tenants to view ticket templates
CREATE POLICY "Tenants can view templates for their properties"
ON ticket_templates FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM property_tenants
    WHERE property_tenants.property_id = ticket_templates.property_id
    AND property_tenants.tenant_id = auth.uid()
  )
);