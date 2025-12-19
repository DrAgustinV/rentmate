-- Add auto_reminders_enabled column to rent_agreements
ALTER TABLE rent_agreements 
ADD COLUMN IF NOT EXISTS auto_reminders_enabled BOOLEAN DEFAULT true;

-- Update the generate_rent_payments function to remove tenant_iban requirement
CREATE OR REPLACE FUNCTION public.generate_rent_payments(p_agreement_id uuid, p_months_ahead integer DEFAULT 12)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_agreement RECORD;
  v_payment_date DATE;
  v_months_generated INTEGER := 0;
  v_start_date DATE;
BEGIN
  -- Fetch agreement details (removed tenant_iban requirement)
  SELECT * INTO v_agreement
  FROM public.rent_agreements
  WHERE id = p_agreement_id AND is_active = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Active rent agreement not found';
  END IF;
  
  -- Start from agreement start date or current month (whichever is later)
  v_start_date := GREATEST(v_agreement.start_date, DATE_TRUNC('month', CURRENT_DATE)::DATE);
  
  -- Generate payments for next N months
  FOR i IN 0..(p_months_ahead - 1) LOOP
    v_payment_date := (v_start_date + (i || ' months')::INTERVAL)::DATE;
    v_payment_date := DATE_TRUNC('month', v_payment_date)::DATE + (v_agreement.payment_day - 1 || ' days')::INTERVAL;
    
    -- Skip if payment already exists for this month
    IF NOT EXISTS (
      SELECT 1 FROM public.rent_payments
      WHERE rent_agreement_id = p_agreement_id
      AND DATE_TRUNC('month', payment_due_date) = DATE_TRUNC('month', v_payment_date)
    ) THEN
      INSERT INTO public.rent_payments (
        rent_agreement_id,
        property_id,
        tenant_id,
        manager_id,
        amount_cents,
        currency,
        payment_due_date,
        status
      ) VALUES (
        p_agreement_id,
        v_agreement.property_id,
        v_agreement.tenant_id,
        v_agreement.manager_id,
        v_agreement.rent_amount_cents,
        v_agreement.currency,
        v_payment_date,
        'pending'
      );
      
      v_months_generated := v_months_generated + 1;
    END IF;
  END LOOP;
  
  RETURN v_months_generated;
END;
$function$;

-- Update trigger to generate payments regardless of tenant_iban
CREATE OR REPLACE FUNCTION public.trigger_generate_rent_payments()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Generate payments when agreement is active (removed tenant_iban requirement)
  IF NEW.is_active THEN
    PERFORM generate_rent_payments(NEW.id, 12);
  END IF;
  RETURN NEW;
END;
$function$;

-- Add RLS policy for tenants to update their payment proof and confirmation
CREATE POLICY "Tenants can update their payment proof"
ON rent_payments FOR UPDATE
USING (auth.uid() = tenant_id)
WITH CHECK (
  auth.uid() = tenant_id
);