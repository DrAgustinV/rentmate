-- Fix get_property_tenant_status to properly identify occupied vs free properties
CREATE OR REPLACE FUNCTION public.get_property_tenant_status(p_property_id uuid)
RETURNS TABLE(status text, tenant_name text, tenant_email text, pending_invites integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH active_tenants AS (
    SELECT 
      pt.tenant_id,
      COALESCE(p.first_name || ' ' || p.last_name, p.email) as full_name,
      p.email
    FROM property_tenants pt
    JOIN profiles p ON p.id = pt.tenant_id
    WHERE pt.property_id = p_property_id
    AND pt.tenancy_status IN ('active', 'ending_tenancy')
    LIMIT 1
  ),
  pending_invites AS (
    SELECT COUNT(*)::INTEGER as count
    FROM invitations
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
    (SELECT email FROM active_tenants) as tenant_email,
    COALESCE((SELECT count FROM pending_invites), 0) as pending_invites;
END;
$function$;