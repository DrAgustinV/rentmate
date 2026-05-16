-- ============================================================================
-- HARD RESET: Delete all properties AND all associated data
--
-- Use this for a complete clean slate — removes properties and everything
-- linked to them (tenants, requirements, contracts, payments, tickets, etc.)
-- for a given manager.
--
-- This leverages ON DELETE CASCADE on properties.id, so deleting a property
-- automatically removes:
--   property_tenants → contract_signatures, rent_agreements,
--                       property_documents, tickets, inspections
--   invitations
--   tenancy_requirements
--   rent_payments
--   ticket_templates
--   recurring_schedules
--   utility_payments
--
-- NOT deleted: auth.users, profiles, subscriptions, stripe accounts, etc.
--
-- Usage:
--   1. Set the manager email at the top
--   2. Run via Supabase SQL editor or psql:
--      psql "$SUPABASE_DB_URL" -f supabase/scripts/reset_all_properties.sql
--
-- WARNING: This is destructive. All property data will be permanently lost.
-- ============================================================================

DO $$
DECLARE
  target_user_id UUID;
  prop_count INT;
  tenant_count INT;
  inv_count INT;
  req_count INT;
  doc_count INT;
  ticket_count INT;
BEGIN
  -- ==================================================================
  -- CONFIGURATION — change this to the manager's email address
  -- ==================================================================
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = 'manager@example.com';  -- ← CHANGE THIS

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Manager not found — check the email address';
  END IF;

  RAISE NOTICE '==========================================';
  RAISE NOTICE 'HARD RESET for manager: %', target_user_id;
  RAISE NOTICE '==========================================';

  -- Count what will be deleted (informational)
  SELECT COUNT(*) INTO prop_count FROM properties WHERE manager_id = target_user_id;
  SELECT COUNT(*) INTO tenant_count FROM property_tenants
    WHERE property_id IN (SELECT id FROM properties WHERE manager_id = target_user_id);
  SELECT COUNT(*) INTO inv_count FROM invitations
    WHERE property_id IN (SELECT id FROM properties WHERE manager_id = target_user_id);
  SELECT COUNT(*) INTO req_count FROM tenancy_requirements
    WHERE property_id IN (SELECT id FROM properties WHERE manager_id = target_user_id);
  SELECT COUNT(*) INTO doc_count FROM property_documents
    WHERE property_id IN (SELECT id FROM properties WHERE manager_id = target_user_id);
  SELECT COUNT(*) INTO ticket_count FROM tickets
    WHERE property_id IN (SELECT id FROM properties WHERE manager_id = target_user_id);

  RAISE NOTICE 'Found: % properties, % tenants, % invitations,', prop_count, tenant_count, inv_count;
  RAISE NOTICE '       % requirements, % documents, % tickets', req_count, doc_count, ticket_count;
  RAISE NOTICE '';

  -- Delete properties — everything else cascades via ON DELETE CASCADE
  DELETE FROM properties WHERE manager_id = target_user_id;

  RAISE NOTICE '------------------------------------------';
  RAISE NOTICE '  Properties deleted:     %', prop_count;
  RAISE NOTICE '  Manager profile kept    ✓';
  RAISE NOTICE '  Auth user kept          ✓';
  RAISE NOTICE '------------------------------------------';
  RAISE NOTICE 'Hard reset complete. All property data deleted.';
END $$;

-- Verify nothing remains
SELECT COUNT(*) AS remaining_properties
FROM properties
WHERE manager_id = (SELECT id FROM auth.users WHERE email = 'manager@example.com');
