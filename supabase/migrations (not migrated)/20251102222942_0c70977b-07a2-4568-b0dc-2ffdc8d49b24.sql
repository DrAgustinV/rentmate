-- Phase 1: Add SEPA fields to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS manager_iban TEXT,
ADD COLUMN IF NOT EXISTS sepa_creditor_identifier TEXT,
ADD COLUMN IF NOT EXISTS legal_name TEXT;

-- Phase 2: Add mandate PDF URL to rent_agreements
ALTER TABLE rent_agreements
ADD COLUMN IF NOT EXISTS mandate_pdf_url TEXT,
ADD COLUMN IF NOT EXISTS mandate_signed_at TIMESTAMPTZ;

-- Phase 3: Create rent_payments table
CREATE TABLE IF NOT EXISTS rent_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rent_agreement_id UUID REFERENCES rent_agreements(id) NOT NULL,
  property_id UUID REFERENCES properties(id) NOT NULL,
  tenant_id UUID REFERENCES auth.users(id) NOT NULL,
  manager_id UUID REFERENCES auth.users(id) NOT NULL,
  
  amount_cents BIGINT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'eur',
  payment_due_date DATE NOT NULL,
  payment_received_date DATE,
  
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT DEFAULT 'sepa_direct_debit',
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on rent_payments
ALTER TABLE rent_payments ENABLE ROW LEVEL SECURITY;

-- RLS policies for rent_payments (drop and recreate to avoid conflicts)
DROP POLICY IF EXISTS "Managers can view their rent payments" ON rent_payments;
CREATE POLICY "Managers can view their rent payments"
ON rent_payments FOR SELECT
USING (is_property_manager(auth.uid(), property_id));

DROP POLICY IF EXISTS "Tenants can view their rent payments" ON rent_payments;
CREATE POLICY "Tenants can view their rent payments"
ON rent_payments FOR SELECT
USING (auth.uid() = tenant_id);

DROP POLICY IF EXISTS "Managers can manage rent payments" ON rent_payments;
CREATE POLICY "Managers can manage rent payments"
ON rent_payments FOR ALL
USING (is_property_manager(auth.uid(), property_id));

-- Add trigger for updated_at (drop first if exists)
DROP TRIGGER IF EXISTS update_rent_payments_updated_at ON rent_payments;
CREATE TRIGGER update_rent_payments_updated_at
BEFORE UPDATE ON rent_payments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();