-- Make utility_payments.tenant_id nullable to support self-managed tenancies
ALTER TABLE public.utility_payments ALTER COLUMN tenant_id DROP NOT NULL;

-- Create policy allowing managers to insert utility payments for their properties
-- (covers self-managed mode where there's no tenant_id)
CREATE POLICY "Managers can insert utility payments for their properties"
ON public.utility_payments FOR INSERT
WITH CHECK (
  public.is_property_manager(auth.uid(), property_id)
);

-- Managers can also update utility payments for their properties
CREATE POLICY "Managers can update utility payments for their properties"
ON public.utility_payments FOR UPDATE
USING (
  public.is_property_manager(auth.uid(), property_id)
)
WITH CHECK (
  public.is_property_manager(auth.uid(), property_id)
);
