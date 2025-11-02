-- Create contract_signatures table
CREATE TABLE IF NOT EXISTS public.contract_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenancy_id UUID NOT NULL REFERENCES public.property_tenants(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  workflow_id TEXT, -- Viafirma workflow ID (null in mock mode)
  workflow_status TEXT NOT NULL DEFAULT 'pending' CHECK (workflow_status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled')),
  manager_signed_at TIMESTAMPTZ,
  manager_signature_method TEXT CHECK (manager_signature_method IN ('certificado_digital', 'clave', 'qualified_signature')),
  manager_signature_ip TEXT,
  tenant_signed_at TIMESTAMPTZ,
  tenant_signature_method TEXT CHECK (tenant_signature_method IN ('certificado_digital', 'clave', 'qualified_signature')),
  tenant_signature_ip TEXT,
  signed_document_url TEXT, -- URL to final signed PDF
  initiated_by UUID NOT NULL REFERENCES auth.users(id),
  initiated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create signature_events table (audit log)
CREATE TABLE IF NOT EXISTS public.signature_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_signature_id UUID NOT NULL REFERENCES public.contract_signatures(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('initiated', 'manager_signed', 'tenant_signed', 'completed', 'failed', 'cancelled', 'expired', 'reminder_sent')),
  event_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_contract_signatures_tenancy ON public.contract_signatures(tenancy_id);
CREATE INDEX idx_contract_signatures_property ON public.contract_signatures(property_id);
CREATE INDEX idx_contract_signatures_workflow_status ON public.contract_signatures(workflow_status);
CREATE INDEX idx_signature_events_contract_signature ON public.signature_events(contract_signature_id);
CREATE INDEX idx_signature_events_created_at ON public.signature_events(created_at DESC);

-- Enable RLS
ALTER TABLE public.contract_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signature_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for contract_signatures
CREATE POLICY "Managers can view signatures for their properties"
  ON public.contract_signatures FOR SELECT
  USING (is_property_manager(auth.uid(), property_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Tenants can view their signatures"
  ON public.contract_signatures FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.property_tenants pt
      WHERE pt.id = contract_signatures.tenancy_id
      AND pt.tenant_id = auth.uid()
    )
  );

CREATE POLICY "Managers can initiate signatures for their properties"
  ON public.contract_signatures FOR INSERT
  WITH CHECK (
    auth.uid() = initiated_by 
    AND is_property_manager(auth.uid(), property_id)
  );

CREATE POLICY "System can update signatures"
  ON public.contract_signatures FOR UPDATE
  USING (
    is_property_manager(auth.uid(), property_id) 
    OR has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.property_tenants pt
      WHERE pt.id = contract_signatures.tenancy_id
      AND pt.tenant_id = auth.uid()
    )
  );

-- RLS Policies for signature_events
CREATE POLICY "Users can view signature events for accessible contracts"
  ON public.signature_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.contract_signatures cs
      WHERE cs.id = signature_events.contract_signature_id
      AND (
        is_property_manager(auth.uid(), cs.property_id)
        OR EXISTS (
          SELECT 1 FROM public.property_tenants pt
          WHERE pt.id = cs.tenancy_id
          AND pt.tenant_id = auth.uid()
        )
        OR has_role(auth.uid(), 'admin'::app_role)
      )
    )
  );

CREATE POLICY "System can insert signature events"
  ON public.signature_events FOR INSERT
  WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_contract_signatures_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_contract_signatures_updated_at
  BEFORE UPDATE ON public.contract_signatures
  FOR EACH ROW
  EXECUTE FUNCTION update_contract_signatures_updated_at();