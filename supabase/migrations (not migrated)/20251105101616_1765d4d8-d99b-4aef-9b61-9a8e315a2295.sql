-- Add payment proof columns to rent_payments table
ALTER TABLE rent_payments 
  ADD COLUMN IF NOT EXISTS proof_of_payment_url text,
  ADD COLUMN IF NOT EXISTS tenant_confirmed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS tenant_confirmed_at timestamptz;

-- Create storage bucket for payment proofs
INSERT INTO storage.buckets (id, name, public) 
VALUES ('payment-proofs', 'payment-proofs', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for payment-proofs bucket
CREATE POLICY "Users can upload payment proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'payment-proofs');

CREATE POLICY "Users can view payment proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'payment-proofs');

CREATE POLICY "Users can delete payment proofs"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'payment-proofs');