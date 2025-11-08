-- Fix circular RLS dependency on profiles table
-- The previous policy created a circular dependency where:
-- rent_agreements JOIN profiles -> profiles RLS checks rent_agreements
-- This causes the JOIN to fail silently for tenants

-- Drop all existing profile view policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Tenants can view their own profile in rent contexts" ON public.profiles;

-- Create simple, non-circular policy for profile access
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- The above simple policy is sufficient because:
-- 1. Managers can view their own profile (auth.uid() = id)
-- 2. Tenants can view their own profile (auth.uid() = id)
-- 3. The rent_agreements query already filters by tenant_id for tenants
-- 4. No circular dependency = JOIN works correctly