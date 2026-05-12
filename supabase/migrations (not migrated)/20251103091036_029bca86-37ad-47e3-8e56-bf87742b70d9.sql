-- Fix search_path security warning for trigger function
DROP FUNCTION IF EXISTS trigger_generate_rent_payments() CASCADE;

CREATE OR REPLACE FUNCTION trigger_generate_rent_payments()
RETURNS TRIGGER AS $$
BEGIN
  -- Only generate if agreement is active and has required fields
  IF NEW.is_active AND NEW.tenant_iban IS NOT NULL THEN
    PERFORM generate_rent_payments(NEW.id, 12);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

CREATE TRIGGER after_rent_agreement_activated
AFTER INSERT OR UPDATE OF is_active, tenant_iban
ON public.rent_agreements
FOR EACH ROW
WHEN (NEW.is_active = true AND NEW.tenant_iban IS NOT NULL)
EXECUTE FUNCTION trigger_generate_rent_payments();