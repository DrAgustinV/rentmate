-- Allow tenant_email to be nullable for self-managed tenancies
ALTER TABLE public.tenancy_requirements ALTER COLUMN tenant_email DROP NOT NULL;