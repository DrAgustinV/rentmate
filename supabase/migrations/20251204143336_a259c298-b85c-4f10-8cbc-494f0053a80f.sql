-- Fix function_search_path_mutable: ensure update_contract_signatures_updated_at has a fixed search_path
CREATE OR REPLACE FUNCTION public.update_contract_signatures_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;