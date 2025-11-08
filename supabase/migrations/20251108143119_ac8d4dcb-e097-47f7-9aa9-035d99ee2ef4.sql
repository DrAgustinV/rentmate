-- Create utility_payments table for tracking utility bills
CREATE TABLE IF NOT EXISTS public.utility_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  manager_id UUID NOT NULL,
  utility_type TEXT NOT NULL CHECK (utility_type IN ('electricity', 'gas', 'water', 'internet', 'heating', 'trash', 'other')),
  custom_utility_name TEXT,
  amount_cents BIGINT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'eur',
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  payment_due_date DATE NOT NULL,
  payment_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
  proof_of_payment_url TEXT,
  proof_review_status TEXT DEFAULT 'pending' CHECK (proof_review_status IN ('pending', 'approved', 'rejected')),
  proof_review_notes TEXT,
  manager_reviewed_by UUID,
  manager_reviewed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.utility_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Managers can view utility payments for their properties"
  ON public.utility_payments
  FOR SELECT
  USING (is_property_manager(auth.uid(), property_id));

CREATE POLICY "Managers can manage utility payments for their properties"
  ON public.utility_payments
  FOR ALL
  USING (is_property_manager(auth.uid(), property_id));

CREATE POLICY "Tenants can view their utility payments"
  ON public.utility_payments
  FOR SELECT
  USING (auth.uid() = tenant_id);

CREATE POLICY "Tenants can update their utility payments"
  ON public.utility_payments
  FOR UPDATE
  USING (auth.uid() = tenant_id)
  WITH CHECK (auth.uid() = tenant_id);

CREATE POLICY "Admins can view all utility payments"
  ON public.utility_payments
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_utility_payments_updated_at
  BEFORE UPDATE ON public.utility_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for utility payment proofs
INSERT INTO storage.buckets (id, name, public)
VALUES ('utility-payment-proofs', 'utility-payment-proofs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
CREATE POLICY "Users can upload their utility payment proofs"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'utility-payment-proofs' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can view their utility payment proofs"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'utility-payment-proofs' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can delete their utility payment proofs"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'utility-payment-proofs' AND
    auth.uid() IS NOT NULL
  );