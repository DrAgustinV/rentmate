-- Add default_role column to profiles table
-- Allows users to set their preferred role at sign-up (manager or tenant)

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS default_role TEXT CHECK (default_role IN ('manager', 'tenant'));

-- Add comment for documentation
COMMENT ON COLUMN profiles.default_role IS 'User-specified preferred role: manager or tenant. Set at sign-up, used for login landing and session role resolution.';

-- Backfill existing users based on data ownership:
-- Users who own properties → manager
-- Users with tenancies but no properties → tenant
UPDATE profiles
SET default_role = 'manager'
WHERE id IN (SELECT manager_id FROM properties GROUP BY manager_id)
  AND (default_role IS NULL);

UPDATE profiles
SET default_role = 'tenant'
WHERE id IN (SELECT tenant_id FROM property_tenants GROUP BY tenant_id)
  AND id NOT IN (SELECT manager_id FROM properties)
  AND (default_role IS NULL);
