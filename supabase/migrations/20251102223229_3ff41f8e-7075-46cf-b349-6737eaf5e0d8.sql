-- Modify existing rent_payments table for direct SEPA (remove Stripe columns, add new ones)
ALTER TABLE rent_payments
ADD COLUMN IF NOT EXISTS payment_due_date DATE,
ADD COLUMN IF NOT EXISTS payment_received_date DATE,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'sepa_direct_debit',
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Update existing records to use new column names
UPDATE rent_payments 
SET payment_due_date = payment_date,
    status = payment_status
WHERE payment_due_date IS NULL;

-- Optionally, we can keep Stripe columns for historical data
-- Or we can drop them if we want to fully remove Stripe:
-- ALTER TABLE rent_payments DROP COLUMN IF EXISTS stripe_payment_intent_id;
-- ALTER TABLE rent_payments DROP COLUMN IF EXISTS stripe_charge_id;
-- ALTER TABLE rent_payments DROP COLUMN IF EXISTS payment_date;
-- ALTER TABLE rent_payments DROP COLUMN IF EXISTS payment_status;