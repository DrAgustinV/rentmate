-- Add carousel_items JSONB column to brand_settings
ALTER TABLE public.brand_settings 
ADD COLUMN IF NOT EXISTS carousel_items jsonb DEFAULT '[
  {
    "image_url": "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&auto=format&fit=crop",
    "title": {"en": "Automated Rent Collection", "es": "Cobro Automático de Alquiler"},
    "description": {"en": "Collect rent automatically via SEPA Direct Debit", "es": "Cobra el alquiler automáticamente mediante SEPA Direct Debit"}
  },
  {
    "image_url": "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&auto=format&fit=crop",
    "title": {"en": "Digital Contracts", "es": "Contratos Digitales"},
    "description": {"en": "Sign contracts digitally with legal validity", "es": "Firma contratos digitalmente con validez legal"}
  },
  {
    "image_url": "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&auto=format&fit=crop",
    "title": {"en": "Smart Maintenance", "es": "Mantenimiento Inteligente"},
    "description": {"en": "Track and schedule property maintenance tasks", "es": "Gestiona y programa tareas de mantenimiento"}
  },
  {
    "image_url": "https://images.unsplash.com/photo-1633265486064-086b219458ec?w=800&auto=format&fit=crop",
    "title": {"en": "Verified Tenants", "es": "Inquilinos Verificados"},
    "description": {"en": "KYC verification for trusted tenancies", "es": "Verificación KYC para arrendamientos de confianza"}
  }
]'::jsonb;