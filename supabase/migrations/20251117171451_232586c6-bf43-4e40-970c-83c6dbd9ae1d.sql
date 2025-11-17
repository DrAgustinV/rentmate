-- Step 1: Add generic qualified signature columns to contract_signatures table
ALTER TABLE contract_signatures 
ADD COLUMN IF NOT EXISTS qualified_signature_provider TEXT,
ADD COLUMN IF NOT EXISTS qualified_signature_session_id TEXT,
ADD COLUMN IF NOT EXISTS qualified_signature_callback_url TEXT,
ADD COLUMN IF NOT EXISTS qualified_signature_metadata JSONB;

-- Create index for session lookups
CREATE INDEX IF NOT EXISTS idx_contract_signatures_qualified_session 
ON contract_signatures(qualified_signature_session_id) 
WHERE qualified_signature_session_id IS NOT NULL;

-- Step 2: Create qualified_signature_providers table for country-specific provider configuration
CREATE TABLE IF NOT EXISTS qualified_signature_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_code TEXT NOT NULL UNIQUE,
  provider_name TEXT NOT NULL,
  country_codes TEXT[] NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  protocol_scheme TEXT NOT NULL,
  installation_url TEXT,
  config JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for country lookups
CREATE INDEX IF NOT EXISTS idx_qualified_providers_countries 
ON qualified_signature_providers USING GIN(country_codes);

-- Step 3: Create qualified_signature_logs table for audit trail
CREATE TABLE IF NOT EXISTS qualified_signature_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_signature_id UUID REFERENCES contract_signatures(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  provider_code TEXT NOT NULL,
  event_type TEXT NOT NULL,
  certificate_info JSONB,
  signature_data TEXT,
  error_message TEXT,
  user_agent TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for contract signature lookups
CREATE INDEX IF NOT EXISTS idx_qualified_logs_contract_signature 
ON qualified_signature_logs(contract_signature_id);

-- Create index for session lookups
CREATE INDEX IF NOT EXISTS idx_qualified_logs_session 
ON qualified_signature_logs(session_id);

-- Step 4: Insert AutoFirma provider configuration
INSERT INTO qualified_signature_providers (
  provider_code,
  provider_name,
  country_codes,
  is_active,
  protocol_scheme,
  installation_url,
  config
) VALUES (
  'autofirma',
  'AutoFirma',
  ARRAY['Spain'],
  true,
  'autofirma://',
  'https://firmaelectronica.gob.es/Home/Descargas.html',
  '{"signature_algorithm": "SHA256withRSA", "signature_format": "PAdES", "certificate_types": ["DNIe", "FNMT"]}'::jsonb
) ON CONFLICT (provider_code) DO NOTHING;

-- Step 5: Create storage bucket for qualified signature documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('qualified-contracts', 'qualified-contracts', false)
ON CONFLICT (id) DO NOTHING;

-- Step 6: Set RLS policies for qualified signature storage
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can view their qualified contracts'
  ) THEN
    CREATE POLICY "Users can view their qualified contracts"
    ON storage.objects FOR SELECT
    USING (
      bucket_id = 'qualified-contracts' 
      AND (
        EXISTS (
          SELECT 1 FROM contract_signatures cs
          JOIN property_tenants pt ON cs.tenancy_id = pt.id
          WHERE cs.id::text = (storage.foldername(name))[1]
          AND (pt.tenant_id = auth.uid() OR 
               EXISTS (SELECT 1 FROM properties p WHERE p.id = cs.property_id AND p.manager_id = auth.uid()))
        )
      )
    );
  END IF;
END $$;

-- Step 7: RLS policies for qualified_signature_logs
ALTER TABLE qualified_signature_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'qualified_signature_logs' 
    AND policyname = 'Users can view logs for accessible contracts'
  ) THEN
    CREATE POLICY "Users can view logs for accessible contracts"
    ON qualified_signature_logs FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM contract_signatures cs
        JOIN property_tenants pt ON cs.tenancy_id = pt.id
        WHERE cs.id = qualified_signature_logs.contract_signature_id
        AND (
          pt.tenant_id = auth.uid() OR 
          EXISTS (SELECT 1 FROM properties p WHERE p.id = cs.property_id AND p.manager_id = auth.uid()) OR
          has_role(auth.uid(), 'admin'::app_role)
        )
      )
    );
  END IF;
END $$;

-- Step 8: RLS policies for qualified_signature_providers
ALTER TABLE qualified_signature_providers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'qualified_signature_providers' 
    AND policyname = 'Anyone can view active providers'
  ) THEN
    CREATE POLICY "Anyone can view active providers"
    ON qualified_signature_providers FOR SELECT
    USING (is_active = true);
  END IF;
END $$;