-- ============================================================================
-- SOFT RESET: Delete all tenancy data, keep properties
--
-- Use this after significant code changes to reset tenancy state
-- while preserving property records and manager profiles.
--
-- Usage:
--   1. Set the manager email at the top
--   2. Run via Supabase SQL editor or psql:
--      psql "$SUPABASE_DB_URL" -f supabase/scripts/reset_tenancy_data.sql
--
-- Idempotent: safe to run multiple times
-- ============================================================================

DO $$
DECLARE
  target_user_id UUID;
  prop_count INT;
  tenant_count INT;
  req_count INT;
  inv_count INT;
  sig_count INT;
  doc_count INT;
  ticket_count INT;
  insp_count INT;
  rent_agree_count INT;
  rent_pay_count INT;
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
  RAISE NOTICE 'Resetting tenancy data for manager: %', target_user_id;
  RAISE NOTICE '==========================================';

  -- 1. Tenancy requirements (SET NULL from property_tenants, must be explicit)
  SELECT COUNT(*) INTO req_count FROM tenancy_requirements
  WHERE property_id IN (SELECT id FROM properties WHERE manager_id = target_user_id);
  DELETE FROM tenancy_requirements
  WHERE property_id IN (SELECT id FROM properties WHERE manager_id = target_user_id);
  RAISE NOTICE '  ✓ tenancy_requirements: % deleted', req_count;

  -- 2. Invitations
  SELECT COUNT(*) INTO inv_count FROM invitations
  WHERE property_id IN (SELECT id FROM properties WHERE manager_id = target_user_id);
  DELETE FROM invitations
  WHERE property_id IN (SELECT id FROM properties WHERE manager_id = target_user_id);
  RAISE NOTICE '  ✓ invitations: % deleted', inv_count;

  -- 3. Rent payments (FK to property + rent_agreements)
  SELECT COUNT(*) INTO rent_pay_count FROM rent_payments
  WHERE property_id IN (SELECT id FROM properties WHERE manager_id = target_user_id);
  DELETE FROM rent_payments
  WHERE property_id IN (SELECT id FROM properties WHERE manager_id = target_user_id);
  RAISE NOTICE '  ✓ rent_payments: % deleted', rent_pay_count;

  -- 4. Utility payments
  DELETE FROM utility_payments
  WHERE property_id IN (SELECT id FROM properties WHERE manager_id = target_user_id);

  -- 5. Ticket templates
  DELETE FROM ticket_templates
  WHERE property_id IN (SELECT id FROM properties WHERE manager_id = target_user_id);

  -- 6. Recurring schedules
  DELETE FROM recurring_schedules
  WHERE property_id IN (SELECT id FROM properties WHERE manager_id = target_user_id);

  -- 7. Rent agreements
  SELECT COUNT(*) INTO rent_agree_count FROM rent_agreements
  WHERE property_id IN (SELECT id FROM properties WHERE manager_id = target_user_id);
  DELETE FROM rent_agreements
  WHERE property_id IN (SELECT id FROM properties WHERE manager_id = target_user_id);
  RAISE NOTICE '  ✓ rent_agreements: % deleted', rent_agree_count;

  -- 8. Contract signatures
  SELECT COUNT(*) INTO sig_count FROM contract_signatures
  WHERE property_id IN (SELECT id FROM properties WHERE manager_id = target_user_id);
  DELETE FROM contract_signatures
  WHERE property_id IN (SELECT id FROM properties WHERE manager_id = target_user_id);
  RAISE NOTICE '  ✓ contract_signatures: % deleted', sig_count;

  -- 9. Property documents
  SELECT COUNT(*) INTO doc_count FROM property_documents
  WHERE property_id IN (SELECT id FROM properties WHERE manager_id = target_user_id);
  DELETE FROM property_documents
  WHERE property_id IN (SELECT id FROM properties WHERE manager_id = target_user_id);
  RAISE NOTICE '  ✓ property_documents: % deleted', doc_count;

  -- 10. Tickets
  SELECT COUNT(*) INTO ticket_count FROM tickets
  WHERE property_id IN (SELECT id FROM properties WHERE manager_id = target_user_id);
  DELETE FROM tickets
  WHERE property_id IN (SELECT id FROM properties WHERE manager_id = target_user_id);
  RAISE NOTICE '  ✓ tickets: % deleted', ticket_count;

  -- 11. Tenancy inspections
  SELECT COUNT(*) INTO insp_count FROM tenancy_inspections
  WHERE property_id IN (SELECT id FROM properties WHERE manager_id = target_user_id);
  DELETE FROM tenancy_inspections
  WHERE property_id IN (SELECT id FROM properties WHERE manager_id = target_user_id);
  RAISE NOTICE '  ✓ tenancy_inspections: % deleted', insp_count;

  -- 12. Property tenants (last — CASCADE handles most children above)
  SELECT COUNT(*) INTO tenant_count FROM property_tenants
  WHERE property_id IN (SELECT id FROM properties WHERE manager_id = target_user_id);
  DELETE FROM property_tenants
  WHERE property_id IN (SELECT id FROM properties WHERE manager_id = target_user_id);
  RAISE NOTICE '  ✓ property_tenants: % deleted', tenant_count;

  -- Summary
  SELECT COUNT(*) INTO prop_count FROM properties WHERE manager_id = target_user_id;
  RAISE NOTICE '------------------------------------------';
  RAISE NOTICE '  Properties kept:        %', prop_count;
  RAISE NOTICE '  Properties untouched    ✓';
  RAISE NOTICE '  Manager profile kept    ✓';
  RAISE NOTICE '------------------------------------------';
  RAISE NOTICE 'Tenancy data reset complete.';
END $$;
