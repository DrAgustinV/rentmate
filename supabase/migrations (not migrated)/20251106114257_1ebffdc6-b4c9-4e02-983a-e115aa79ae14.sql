-- Add manager and tenant embed slugs to contract_signatures table
ALTER TABLE public.contract_signatures
ADD COLUMN manager_embed_slug TEXT,
ADD COLUMN tenant_embed_slug TEXT;