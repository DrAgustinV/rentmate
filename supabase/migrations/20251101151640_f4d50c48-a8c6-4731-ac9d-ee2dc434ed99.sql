-- Step 2: Create transaction and monitoring tables

-- Table 1: Rent Payments
CREATE TABLE IF NOT EXISTS public.rent_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rent_agreement_id UUID NOT NULL REFERENCES public.rent_agreements(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  manager_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_cents BIGINT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'eur',
  payment_date DATE NOT NULL,
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  failure_reason TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_payment_status CHECK (payment_status IN ('pending', 'processing', 'succeeded', 'failed', 'disputed', 'refunded')),
  CONSTRAINT valid_currency_payments CHECK (currency IN ('eur', 'usd', 'gbp'))
);

-- Enable RLS on rent_payments
ALTER TABLE public.rent_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for rent_payments
CREATE POLICY "Managers can view payments for their properties"
  ON public.rent_payments
  FOR SELECT
  USING (is_property_manager(auth.uid(), property_id));

CREATE POLICY "Tenants can view their own payments"
  ON public.rent_payments
  FOR SELECT
  USING (auth.uid() = tenant_id);

CREATE POLICY "Admins can view all payments"
  ON public.rent_payments
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert payments"
  ON public.rent_payments
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can update payments"
  ON public.rent_payments
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for rent_payments updated_at
CREATE TRIGGER update_rent_payments_updated_at
  BEFORE UPDATE ON public.rent_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Table 2: Payment Disputes
CREATE TABLE IF NOT EXISTS public.payment_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rent_payment_id UUID NOT NULL REFERENCES public.rent_payments(id) ON DELETE CASCADE,
  stripe_dispute_id TEXT UNIQUE NOT NULL,
  dispute_status TEXT NOT NULL DEFAULT 'needs_response',
  dispute_reason TEXT NOT NULL,
  amount_cents BIGINT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'eur',
  evidence_due_by TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_dispute_status CHECK (dispute_status IN ('warning_needs_response', 'warning_under_review', 'warning_closed', 'needs_response', 'under_review', 'won', 'lost')),
  CONSTRAINT valid_currency_disputes CHECK (currency IN ('eur', 'usd', 'gbp'))
);

-- Enable RLS on payment_disputes
ALTER TABLE public.payment_disputes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payment_disputes
CREATE POLICY "Managers can view disputes for their payments"
  ON public.payment_disputes
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.rent_payments rp
    WHERE rp.id = payment_disputes.rent_payment_id
    AND is_property_manager(auth.uid(), rp.property_id)
  ));

CREATE POLICY "Tenants can view their own disputes"
  ON public.payment_disputes
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.rent_payments rp
    WHERE rp.id = payment_disputes.rent_payment_id
    AND rp.tenant_id = auth.uid()
  ));

CREATE POLICY "Admins can view all disputes"
  ON public.payment_disputes
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can manage disputes"
  ON public.payment_disputes
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for payment_disputes updated_at
CREATE TRIGGER update_payment_disputes_updated_at
  BEFORE UPDATE ON public.payment_disputes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Table 3: Cron Job Health Monitoring
CREATE TABLE IF NOT EXISTS public.cron_job_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT UNIQUE NOT NULL,
  last_run_at TIMESTAMPTZ,
  last_run_status TEXT,
  last_error TEXT,
  run_count INTEGER NOT NULL DEFAULT 0,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_run_status CHECK (last_run_status IN ('success', 'failure', 'partial', NULL))
);

-- Enable RLS on cron_job_health
ALTER TABLE public.cron_job_health ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cron_job_health
CREATE POLICY "Admins can view cron job health"
  ON public.cron_job_health
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can manage cron job health"
  ON public.cron_job_health
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for cron_job_health updated_at
CREATE TRIGGER update_cron_job_health_updated_at
  BEFORE UPDATE ON public.cron_job_health
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Table 4: Stripe Webhook Events Log
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMPTZ,
  processing_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on stripe_webhook_events
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stripe_webhook_events
CREATE POLICY "Admins can view webhook events"
  ON public.stripe_webhook_events
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can manage webhook events"
  ON public.stripe_webhook_events
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for performance
CREATE INDEX idx_rent_payments_rent_agreement_id ON public.rent_payments(rent_agreement_id);
CREATE INDEX idx_rent_payments_property_id ON public.rent_payments(property_id);
CREATE INDEX idx_rent_payments_tenant_id ON public.rent_payments(tenant_id);
CREATE INDEX idx_rent_payments_manager_id ON public.rent_payments(manager_id);
CREATE INDEX idx_rent_payments_payment_date ON public.rent_payments(payment_date);
CREATE INDEX idx_rent_payments_payment_status ON public.rent_payments(payment_status);
CREATE INDEX idx_rent_payments_stripe_payment_intent_id ON public.rent_payments(stripe_payment_intent_id);

CREATE INDEX idx_payment_disputes_rent_payment_id ON public.payment_disputes(rent_payment_id);
CREATE INDEX idx_payment_disputes_stripe_dispute_id ON public.payment_disputes(stripe_dispute_id);
CREATE INDEX idx_payment_disputes_dispute_status ON public.payment_disputes(dispute_status);

CREATE INDEX idx_cron_job_health_job_name ON public.cron_job_health(job_name);
CREATE INDEX idx_cron_job_health_last_run_at ON public.cron_job_health(last_run_at);

CREATE INDEX idx_stripe_webhook_events_stripe_event_id ON public.stripe_webhook_events(stripe_event_id);
CREATE INDEX idx_stripe_webhook_events_event_type ON public.stripe_webhook_events(event_type);
CREATE INDEX idx_stripe_webhook_events_processed ON public.stripe_webhook_events(processed);
CREATE INDEX idx_stripe_webhook_events_created_at ON public.stripe_webhook_events(created_at);