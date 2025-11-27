-- Add features_display and limitations_display columns for translatable pricing features
ALTER TABLE public.subscription_plans 
ADD COLUMN IF NOT EXISTS features_display JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS limitations_display JSONB DEFAULT '{}';

COMMENT ON COLUMN public.subscription_plans.features_display IS 'Translatable feature bullet points. Format: {"en": ["Feature 1"], "es": ["Característica 1"]}';
COMMENT ON COLUMN public.subscription_plans.limitations_display IS 'Translatable limitation bullet points for free plan. Format: {"en": ["No X"], "es": ["Sin X"]}';

-- Seed Free plan features
UPDATE subscription_plans SET 
  features_display = '{
    "en": ["Unlimited properties", "Basic property management", "Tenant invitations", "Maintenance tracking", "Ticket system", "0 digital signatures"],
    "es": ["Propiedades ilimitadas", "Gestión básica de propiedades", "Invitaciones a inquilinos", "Seguimiento de mantenimiento", "Sistema de tickets", "0 firmas digitales"]
  }'::jsonb,
  limitations_display = '{
    "en": ["No automated payments", "No digital signatures", "No KYC verification", "No document templates"],
    "es": ["Sin pagos automatizados", "Sin firmas digitales", "Sin verificación KYC", "Sin plantillas de documentos"]
  }'::jsonb
WHERE slug = 'free';

-- Seed Pro plan features
UPDATE subscription_plans SET 
  features_display = '{
    "en": ["Unlimited properties", "100 digital signatures/year", "Automated payment collection", "Document templates", "KYC verification", "Priority support", "€2 per additional signature"],
    "es": ["Propiedades ilimitadas", "100 firmas digitales/año", "Cobro automatizado de pagos", "Plantillas de documentos", "Verificación KYC", "Soporte prioritario", "€2 por firma adicional"]
  }'::jsonb,
  limitations_display = '{}'::jsonb
WHERE slug = 'pro';

-- Seed Enterprise plan features
UPDATE subscription_plans SET 
  features_display = '{
    "en": ["All Pro features", "9999 digital signatures/year", "White-labeling", "API access", "Advanced analytics", "Dedicated account manager", "Custom integrations", "SLA guarantee"],
    "es": ["Todas las funciones Pro", "9999 firmas digitales/año", "Marca blanca", "Acceso API", "Análisis avanzado", "Gerente de cuenta dedicado", "Integraciones personalizadas", "Garantía SLA"]
  }'::jsonb,
  limitations_display = '{}'::jsonb
WHERE slug = 'enterprise';