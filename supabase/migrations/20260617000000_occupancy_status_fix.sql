-- Fix occupancy status in get_property_tenant_status:
-- 1. Treat self-managed pending tenancies as occupied (manager chose the date, no tenant onboarding)
-- 2. Add pending_tenants CTE for tenant-linked future-start tenancies → show as invited
-- 3. Rename 'free' → 'vacant' for clarity

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
  "started_at" timestamptz,
  "end_date" "date",
  "rent_amount_cents" bigint
)
LANGUAGE "plpgsql" SECURITY DEFINER
SET "search_path" TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH active_tenants AS (
    -- Active, ending_tenancy, or self-managed pending (tenant_id IS NULL = manager chose the date)
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
    AND (
      pt.tenancy_status IN ('active', 'ending_tenancy')
      OR (pt.tenancy_status = 'pending' AND pt.tenant_id IS NULL)
    )
    LIMIT 1
  ),
  pending_tenants AS (
    -- Tenant-linked pending tenancies (future start date, tenant onboarding future)
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
    AND pt.tenancy_status = 'pending'
    AND pt.tenant_id IS NOT NULL
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
      WHEN EXISTS (SELECT 1 FROM pending_tenants) THEN 'invited'::TEXT
      WHEN (SELECT count FROM pending_invites) > 0 THEN 'invited'::TEXT
      ELSE 'vacant'::TEXT
    END as status,
    COALESCE((SELECT a.full_name FROM active_tenants a), (SELECT p.full_name FROM pending_tenants p)) as tenant_name,
    COALESCE((SELECT a.tenant_email FROM active_tenants a), (SELECT p.tenant_email FROM pending_tenants p)) as tenant_email,
    COALESCE((SELECT count FROM pending_invites), 0) as pending_invites,
    COALESCE((SELECT a.manager_tenant_name FROM active_tenants a), (SELECT p.manager_tenant_name FROM pending_tenants p)) as manager_tenant_name,
    COALESCE((SELECT a.manager_tenant_surname FROM active_tenants a), (SELECT p.manager_tenant_surname FROM pending_tenants p)) as manager_tenant_surname,
    COALESCE((SELECT a.manager_tenant_phone FROM active_tenants a), (SELECT p.manager_tenant_phone FROM pending_tenants p)) as manager_tenant_phone,
    COALESCE((SELECT a.started_at FROM active_tenants a), (SELECT p.started_at FROM pending_tenants p)) as started_at,
    COALESCE((SELECT a.end_date FROM active_tenants a), (SELECT p.end_date FROM pending_tenants p)) as end_date,
    COALESCE((SELECT a.rent_amount_cents FROM active_tenants a), (SELECT p.rent_amount_cents FROM pending_tenants p)) as rent_amount_cents;
END;
$$;

ALTER FUNCTION "public"."get_property_tenant_status"("p_property_id" "uuid") OWNER TO "postgres";
