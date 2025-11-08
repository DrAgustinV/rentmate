-- Create payment reminders tracking table
CREATE TABLE IF NOT EXISTS payment_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rent_payment_id UUID NOT NULL REFERENCES rent_payments(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('upcoming', 'overdue')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  email_to TEXT NOT NULL,
  email_subject TEXT NOT NULL,
  email_status TEXT DEFAULT 'sent' CHECK (email_status IN ('sent', 'failed', 'bounced')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_payment_reminders_payment_id ON payment_reminders(rent_payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_reminders_sent_at ON payment_reminders(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_reminders_type ON payment_reminders(reminder_type);

-- RLS policies for payment_reminders
ALTER TABLE payment_reminders ENABLE ROW LEVEL SECURITY;

-- Admins can view all reminders
CREATE POLICY "Admins can view all payment reminders"
ON payment_reminders FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Managers can view reminders for their properties
CREATE POLICY "Managers can view payment reminders for their properties"
ON payment_reminders FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM rent_payments rp
    WHERE rp.id = payment_reminders.rent_payment_id
    AND is_property_manager(auth.uid(), rp.property_id)
  )
);

-- System can insert reminders
CREATE POLICY "System can insert payment reminders"
ON payment_reminders FOR INSERT
WITH CHECK (true);