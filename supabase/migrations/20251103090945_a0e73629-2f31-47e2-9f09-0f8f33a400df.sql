-- Phase 1B Step 1: Create function to generate rent payment records
CREATE OR REPLACE FUNCTION generate_rent_payments(
  p_agreement_id UUID,
  p_months_ahead INTEGER DEFAULT 12
) RETURNS INTEGER AS $$
DECLARE
  v_agreement RECORD;
  v_payment_date DATE;
  v_months_generated INTEGER := 0;
  v_start_date DATE;
BEGIN
  -- Fetch agreement details
  SELECT * INTO v_agreement
  FROM rent_agreements
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
      SELECT 1 FROM rent_payments
      WHERE rent_agreement_id = p_agreement_id
      AND DATE_TRUNC('month', payment_due_date) = DATE_TRUNC('month', v_payment_date)
    ) THEN
      INSERT INTO rent_payments (
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Phase 1B Step 2: Create trigger to auto-generate payments
CREATE OR REPLACE FUNCTION trigger_generate_rent_payments()
RETURNS TRIGGER AS $$
BEGIN
  -- Only generate if agreement is active and has required fields
  IF NEW.is_active AND NEW.tenant_iban IS NOT NULL THEN
    PERFORM generate_rent_payments(NEW.id, 12);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER after_rent_agreement_activated
AFTER INSERT OR UPDATE OF is_active, tenant_iban
ON rent_agreements
FOR EACH ROW
WHEN (NEW.is_active = true AND NEW.tenant_iban IS NOT NULL)
EXECUTE FUNCTION trigger_generate_rent_payments();