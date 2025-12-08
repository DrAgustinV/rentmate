-- Create tenancy_requirements table to store per-tenancy configuration
CREATE TABLE public.tenancy_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  invitation_id UUID REFERENCES invitations(id) ON DELETE SET NULL,
  tenancy_id UUID REFERENCES property_tenants(id) ON DELETE SET NULL,
  
  -- Manager who created this requirement
  created_by UUID NOT NULL REFERENCES profiles(id),
  
  -- Tenant email (before invitation is created)
  tenant_email TEXT NOT NULL,
  
  -- Verification requirements
  require_email_verification BOOLEAN DEFAULT true,
  require_kyc_verification BOOLEAN DEFAULT false,
  require_phone_verification BOOLEAN DEFAULT false,
  
  -- Contract handling
  contract_method TEXT CHECK (contract_method IN ('docuseal', 'yousign', 'manual', 'none')),
  selected_template_id UUID REFERENCES property_documents(id) ON DELETE SET NULL,
  
  -- Rent details (copied to rent_agreements when tenant accepts)
  rent_amount_cents BIGINT,
  currency TEXT DEFAULT 'EUR',
  security_deposit_cents BIGINT,
  payment_day INTEGER CHECK (payment_day >= 1 AND payment_day <= 28),
  start_date DATE,
  end_date DATE,
  
  -- Utilities configuration (structured JSONB)
  -- Format: { "electricity": "tenant_pays", "water": "manager_pays", "gas": "not_applicable" }
  utilities_config JSONB DEFAULT '{}',
  
  -- Questionnaire (future)
  questionnaire_enabled BOOLEAN DEFAULT false,
  questionnaire_config JSONB,
  
  -- Status tracking
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'completed', 'cancelled')),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_tenancy_requirements_property ON tenancy_requirements(property_id);
CREATE INDEX idx_tenancy_requirements_invitation ON tenancy_requirements(invitation_id);
CREATE INDEX idx_tenancy_requirements_tenancy ON tenancy_requirements(tenancy_id);
CREATE INDEX idx_tenancy_requirements_status ON tenancy_requirements(status);

-- Enable RLS
ALTER TABLE public.tenancy_requirements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Managers can create requirements for their properties"
ON public.tenancy_requirements
FOR INSERT
WITH CHECK (
  auth.uid() = created_by 
  AND is_property_manager(auth.uid(), property_id)
);

CREATE POLICY "Managers can view requirements for their properties"
ON public.tenancy_requirements
FOR SELECT
USING (
  is_property_manager(auth.uid(), property_id) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Managers can update requirements for their properties"
ON public.tenancy_requirements
FOR UPDATE
USING (is_property_manager(auth.uid(), property_id))
WITH CHECK (is_property_manager(auth.uid(), property_id));

CREATE POLICY "Managers can delete draft requirements"
ON public.tenancy_requirements
FOR DELETE
USING (
  is_property_manager(auth.uid(), property_id) 
  AND status = 'draft'
);

CREATE POLICY "Tenants can view their tenancy requirements"
ON public.tenancy_requirements
FOR SELECT
USING (
  tenancy_id IN (
    SELECT id FROM property_tenants WHERE tenant_id = auth.uid()
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_tenancy_requirements_updated_at
BEFORE UPDATE ON tenancy_requirements
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Add tenancy_requirements_id to invitations table for linking
ALTER TABLE public.invitations 
ADD COLUMN tenancy_requirements_id UUID REFERENCES tenancy_requirements(id) ON DELETE SET NULL;