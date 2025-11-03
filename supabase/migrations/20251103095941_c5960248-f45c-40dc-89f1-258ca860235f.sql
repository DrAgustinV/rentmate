-- Make payment_date nullable since pending payments haven't been paid yet
-- payment_date should only be set when payment is actually received/processed
ALTER TABLE rent_payments 
ALTER COLUMN payment_date DROP NOT NULL;