-- Fix profiles RLS policy to allow tenants to view their own profile in rent agreement contexts
-- This allows the join in useRentAgreements to work for tenants

-- Drop the existing policy if it exists and recreate with better logic
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Create comprehensive profile view policy
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = id
  OR
  -- Allow viewing profile when it's the tenant's own profile accessed through rent_agreements
  id IN (
    SELECT tenant_id 
    FROM public.rent_agreements 
    WHERE tenant_id = auth.uid()
  )
);

-- Ensure rent_payments has proper tenant access policy
DROP POLICY IF EXISTS "Tenants can view their rent payments" ON public.rent_payments;

CREATE POLICY "Tenants can view their rent payments"
ON public.rent_payments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM public.rent_agreements ra
    WHERE ra.id = rent_payments.rent_agreement_id
    AND ra.tenant_id = auth.uid()
  )
);