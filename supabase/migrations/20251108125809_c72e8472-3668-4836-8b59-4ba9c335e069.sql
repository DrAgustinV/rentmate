-- Add manager review columns to rent_payments table
ALTER TABLE rent_payments
ADD COLUMN IF NOT EXISTS manager_reviewed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS manager_reviewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS manager_reviewed_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS proof_review_status TEXT DEFAULT 'pending' CHECK (proof_review_status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS proof_review_notes TEXT;

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_rent_payments_proof_review ON rent_payments(proof_review_status, manager_reviewed);

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Managers can view payment proofs for their properties" ON storage.objects;

-- Create storage policy for payment-proofs bucket to allow managers to view
CREATE POLICY "Managers can view payment proofs for their properties"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'payment-proofs' 
  AND auth.role() = 'authenticated'
  AND (
    -- Managers can view proofs for their properties
    EXISTS (
      SELECT 1 FROM rent_payments rp
      WHERE rp.id::text = (storage.foldername(name))[1]
      AND is_property_manager(auth.uid(), rp.property_id)
    )
    OR
    -- Tenants can view their own proofs
    EXISTS (
      SELECT 1 FROM rent_payments rp
      WHERE rp.id::text = (storage.foldername(name))[1]
      AND rp.tenant_id = auth.uid()
    )
  )
);