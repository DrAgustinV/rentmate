-- Add YouSign as a signature provider
INSERT INTO qualified_signature_providers (
  provider_code,
  provider_name,
  country_codes,
  protocol_scheme,
  installation_url,
  is_active,
  config
) VALUES (
  'yousign',
  'YouSign',
  ARRAY['ES', 'FR', 'DE', 'IT', 'PT', 'NL', 'BE', 'AT', 'LU', 'IE', 'GB', 'CH'],
  'https://',
  'https://yousign.com/',
  true,
  '{"signature_level": "electronic_signature", "delivery_mode": "email", "authentication_mode": "otp_email"}'::jsonb
);