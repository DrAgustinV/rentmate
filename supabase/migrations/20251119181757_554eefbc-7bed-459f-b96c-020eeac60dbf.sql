-- Create privacy_requests table for GDPR rights management
CREATE TABLE IF NOT EXISTS public.privacy_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL CHECK (request_type IN ('access', 'rectification', 'erasure', 'restriction', 'objection', 'portability')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected')),
  request_details TEXT,
  response_details TEXT,
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create data_retention_audit table for tracking data retention enforcement
CREATE TABLE IF NOT EXISTS public.data_retention_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  policy_type TEXT NOT NULL,
  affected_records INTEGER NOT NULL DEFAULT 0,
  anonymized_records INTEGER NOT NULL DEFAULT 0,
  deleted_records INTEGER NOT NULL DEFAULT 0,
  execution_details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.privacy_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_retention_audit ENABLE ROW LEVEL SECURITY;

-- RLS Policies for privacy_requests
CREATE POLICY "Users can view own privacy requests"
  ON public.privacy_requests
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own privacy requests"
  ON public.privacy_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all privacy requests"
  ON public.privacy_requests
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for data_retention_audit
CREATE POLICY "Only admins can view data retention audit logs"
  ON public.data_retention_audit
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert audit logs"
  ON public.data_retention_audit
  FOR INSERT
  WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_privacy_requests_updated_at
  BEFORE UPDATE ON public.privacy_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert data retention policies into system_settings
INSERT INTO public.system_settings (setting_key, setting_value, description)
VALUES (
  'data_retention_policies',
  '{
    "tenant_data_after_tenancy_end": "3 years",
    "inactive_account_anonymization": "5 years",
    "financial_records": "7 years",
    "analytics_data": "2 years",
    "ticket_data": "3 years"
  }'::jsonb,
  'Data retention periods for different types of data in compliance with GDPR'
)
ON CONFLICT (setting_key) DO UPDATE
SET setting_value = EXCLUDED.setting_value,
    description = EXCLUDED.description,
    updated_at = now();