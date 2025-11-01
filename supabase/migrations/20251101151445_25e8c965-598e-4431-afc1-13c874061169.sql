-- Step 1: Create core payment tables (manager_stripe_accounts + rent_agreements)

-- Table 1: Manager Stripe Connect Accounts
CREATE TABLE IF NOT EXISTS public.manager_stripe_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stripe_account_id TEXT UNIQUE NOT NULL,
  stripe_account_status TEXT NOT NULL DEFAULT 'pending',
  onboarding_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_status CHECK (stripe_account_status IN ('pending', 'active', 'rejected'))
);

-- Enable RLS on manager_stripe_accounts
ALTER TABLE public.manager_stripe_accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for manager_stripe_accounts
CREATE POLICY "Managers can view own Stripe accounts"
  ON public.manager_stripe_accounts
  FOR SELECT
  USING (auth.uid() = manager_id);

CREATE POLICY "Managers can create own Stripe accounts"
  ON public.manager_stripe_accounts
  FOR INSERT
  WITH CHECK (auth.uid() = manager_id);

CREATE POLICY "Managers can update own Stripe accounts"
  ON public.manager_stripe_accounts
  FOR UPDATE
  USING (auth.uid() = manager_id);

CREATE POLICY "Admins can view all Stripe accounts"
  ON public.manager_stripe_accounts
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for manager_stripe_accounts updated_at
CREATE TRIGGER update_manager_stripe_accounts_updated_at
  BEFORE UPDATE ON public.manager_stripe_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Table 2: Rent Agreements
CREATE TABLE IF NOT EXISTS public.rent_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  tenancy_id UUID NOT NULL REFERENCES public.property_tenants(id) ON DELETE CASCADE,
  manager_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rent_amount_cents BIGINT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'eur',
  payment_day INTEGER NOT NULL,
  tenant_iban TEXT NOT NULL,
  mandate_id TEXT,
  mandate_status TEXT NOT NULL DEFAULT 'pending',
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_payment_day CHECK (payment_day >= 1 AND payment_day <= 28),
  CONSTRAINT valid_mandate_status CHECK (mandate_status IN ('pending', 'active', 'inactive')),
  CONSTRAINT valid_currency CHECK (currency IN ('eur', 'usd', 'gbp'))
);

-- Enable RLS on rent_agreements
ALTER TABLE public.rent_agreements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for rent_agreements
CREATE POLICY "Managers can view rent agreements for their properties"
  ON public.rent_agreements
  FOR SELECT
  USING (is_property_manager(auth.uid(), property_id));

CREATE POLICY "Managers can create rent agreements for their properties"
  ON public.rent_agreements
  FOR INSERT
  WITH CHECK (auth.uid() = manager_id AND is_property_manager(auth.uid(), property_id));

CREATE POLICY "Managers can update rent agreements for their properties"
  ON public.rent_agreements
  FOR UPDATE
  USING (is_property_manager(auth.uid(), property_id));

CREATE POLICY "Tenants can view their rent agreements"
  ON public.rent_agreements
  FOR SELECT
  USING (auth.uid() = tenant_id);

CREATE POLICY "Admins can view all rent agreements"
  ON public.rent_agreements
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for rent_agreements updated_at
CREATE TRIGGER update_rent_agreements_updated_at
  BEFORE UPDATE ON public.rent_agreements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_manager_stripe_accounts_manager_id ON public.manager_stripe_accounts(manager_id);
CREATE INDEX idx_rent_agreements_property_id ON public.rent_agreements(property_id);
CREATE INDEX idx_rent_agreements_tenancy_id ON public.rent_agreements(tenancy_id);
CREATE INDEX idx_rent_agreements_tenant_id ON public.rent_agreements(tenant_id);
CREATE INDEX idx_rent_agreements_manager_id ON public.rent_agreements(manager_id);