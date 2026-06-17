-- Fix get_property_tenant_status to handle self-managed tenancies
-- Self-managed tenancies have tenant_id = NULL and use manager_tenant_name/surname instead
-- The function must LEFT JOIN profiles (not INNER JOIN) and fall back to manager_tenant fields
-- Also add rent_amount_cents from the active rent agreement

DROP FUNCTION IF EXISTS "public"."get_property_tenant_status";

CREATE OR REPLACE FUNCTION "public"."get_property_tenant_status"("p_property_id" "uuid")
RETURNS TABLE(
  "status" "text",
  "tenant_name" "text",
  "tenant_email" "text",
  "pending_invites" integer,
  "manager_tenant_name" "text",
  "manager_tenant_surname" "text",
  "manager_tenant_phone" "text",
  "started_at" "date",
  "end_date" "date",
  "rent_amount_cents" integer
)
LANGUAGE "plpgsql" SECURITY DEFINER
SET "search_path" TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH active_tenants AS (
    SELECT
      pt.tenant_id,
      pt.id as tenancy_id,
      COALESCE(
        p.first_name || ' ' || p.last_name,
        NULLIF(TRIM(pt.manager_tenant_name || ' ' || COALESCE(pt.manager_tenant_surname, '')), ''),
        pt.manager_tenant_name,
        p.email
      ) as full_name,
      p.email as tenant_email,
      pt.manager_tenant_name,
      pt.manager_tenant_surname,
      pt.manager_tenant_phone,
      pt.started_at,
      pt.end_date,
      ra.rent_amount_cents
    FROM public.property_tenants pt
    LEFT JOIN public.profiles p ON p.id = pt.tenant_id
    LEFT JOIN public.rent_agreements ra ON ra.tenancy_id = pt.id AND ra.is_active = true
    WHERE pt.property_id = p_property_id
    AND pt.tenancy_status IN ('active', 'ending_tenancy')
    LIMIT 1
  ),
  pending_invites AS (
    SELECT COUNT(*)::INTEGER as count
    FROM public.invitations
    WHERE property_id = p_property_id
    AND invitations.status = 'pending'
  )
  SELECT
    CASE
      WHEN EXISTS (SELECT 1 FROM active_tenants) THEN 'occupied'::TEXT
      WHEN (SELECT count FROM pending_invites) > 0 THEN 'invited'::TEXT
      ELSE 'free'::TEXT
    END as status,
    (SELECT full_name FROM active_tenants) as tenant_name,
    (SELECT tenant_email FROM active_tenants) as tenant_email,
    COALESCE((SELECT count FROM pending_invites), 0) as pending_invites,
    (SELECT manager_tenant_name FROM active_tenants) as manager_tenant_name,
    (SELECT manager_tenant_surname FROM active_tenants) as manager_tenant_surname,
    (SELECT manager_tenant_phone FROM active_tenants) as manager_tenant_phone,
    (SELECT started_at FROM active_tenants) as started_at,
    (SELECT end_date FROM active_tenants) as end_date,
    (SELECT rent_amount_cents FROM active_tenants) as rent_amount_cents;
END;
$$;

ALTER FUNCTION "public"."get_property_tenant_status"("p_property_id" "uuid") OWNER TO "postgres";
