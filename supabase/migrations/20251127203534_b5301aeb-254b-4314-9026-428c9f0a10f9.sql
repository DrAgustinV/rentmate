-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Anyone can view active subscription plans" ON public.subscription_plans;

-- Create new policy that allows both anonymous and authenticated users
CREATE POLICY "Public can view active subscription plans" 
ON public.subscription_plans
FOR SELECT
TO anon, authenticated
USING (status = 'active');