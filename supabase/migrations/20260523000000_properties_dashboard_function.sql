-- Create RPC function for properties dashboard
-- Returns dashboard data for each property: occupancy status, tenant name, payment status, open tickets count

CREATE OR REPLACE FUNCTION "public"."get_properties_dashboard"("p_property_ids" "uuid"[])
RETURNS TABLE(
    "property_id" "uuid",
    "occupancy_status" "text",
    "tenant_name" "text",
    "payment_status" "text",
    "open_tickets_count" integer
)
LANGUAGE "sql" STABLE SECURITY DEFINER
SET "search_path" TO 'public'
AS $$
WITH property_tenancy AS (
    SELECT
        p.id as property_id,
        CASE
            WHEN pt.tenancy_status = 'active' THEN 'Active'::TEXT
            WHEN pt.tenancy_status = 'ending_tenancy' THEN 'Ending'::TEXT
            WHEN pt.tenancy_status = 'historic' THEN 'Historic'::TEXT
            ELSE 'Vacant'::TEXT
        END as occupancy_status,
        COALESCE(pr.first_name || ' ' || pr.last_name, pr.email) as tenant_name,
        pt.tenancy_status as tenancy_status
    FROM unnest(p_property_ids) AS pid
    JOIN public.properties p ON p.id = pid
    LEFT JOIN LATERAL (
        SELECT pt2.tenant_id, pt2.tenancy_status
        FROM public.property_tenants pt2
        WHERE pt2.property_id = p.id
        AND pt2.tenancy_status IN ('active', 'ending_tenancy', 'historic')
        ORDER BY
            CASE pt2.tenancy_status
                WHEN 'active' THEN 1
                WHEN 'ending_tenancy' THEN 2
                WHEN 'historic' THEN 3
            END
        LIMIT 1
    ) pt ON true
    LEFT JOIN public.profiles pr ON pr.id = pt.tenant_id
),
latest_payment AS (
    SELECT
        rp.property_id,
        rp.status as payment_status
    FROM public.rent_payments rp
    WHERE rp.property_id = ANY(p_property_ids)
    AND rp.created_at = (
        SELECT MAX(rp2.created_at)
        FROM public.rent_payments rp2
        WHERE rp2.property_id = rp.property_id
    )
    LIMIT 1
),
property_payment_status AS (
    SELECT
        pt.property_id,
        pt.occupancy_status,
        pt.tenant_name,
        pt.tenancy_status,
        CASE
            WHEN pt.occupancy_status = 'Vacant' THEN 'No rent'::TEXT
            WHEN pt.occupancy_status = 'Historic' THEN 'Closed'::TEXT
            WHEN lp.payment_status IS NULL THEN 'No rent'::TEXT
            WHEN lp.payment_status = 'completed' OR lp.payment_status = 'paid' THEN 'Paid'::TEXT
            WHEN lp.payment_status = 'pending' OR lp.payment_status = 'due' THEN 'Due'::TEXT
            WHEN lp.payment_status = 'partial' THEN 'Partial'::TEXT
            WHEN lp.payment_status = 'overdue' THEN 'Overdue'::TEXT
            ELSE 'Due'::TEXT
        END as payment_status
    FROM property_tenancy pt
    LEFT JOIN latest_payment lp ON lp.property_id = pt.property_id
),
open_tickets AS (
    SELECT
        t.property_id,
        COUNT(*)::INTEGER as open_count
    FROM public.tickets t
    WHERE t.property_id = ANY(p_property_ids)
    AND t.status IN ('open', 'in_progress')
    GROUP BY t.property_id
)
SELECT
    pps.property_id,
    pps.occupancy_status,
    pps.tenant_name,
    pps.payment_status,
    COALESCE(ot.open_count, 0)::INTEGER as open_tickets_count
FROM property_payment_status pps
LEFT JOIN open_tickets ot ON ot.property_id = pps.property_id
ORDER BY pps.property_id;
$$;

ALTER FUNCTION "public"."get_properties_dashboard"("p_property_ids" "uuid"[]) OWNER TO "postgres";

GRANT ALL ON FUNCTION "public"."get_properties_dashboard"("p_property_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."get_properties_dashboard"("p_property_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_properties_dashboard"("p_property_ids" "uuid"[]) TO "service_role";