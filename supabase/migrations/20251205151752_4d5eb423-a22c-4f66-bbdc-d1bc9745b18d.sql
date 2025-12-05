-- Create batch RPC function for property status indicators
CREATE OR REPLACE FUNCTION public.get_properties_status_indicators(p_property_ids UUID[])
RETURNS TABLE (
  property_id UUID,
  rent_overdue BOOLEAN,
  rent_has_data BOOLEAN,
  utility_overdue BOOLEAN,
  utility_has_data BOOLEAN,
  tickets_open BOOLEAN,
  tickets_has_data BOOLEAN,
  maintenance_overdue BOOLEAN,
  maintenance_has_data BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    p.id as property_id,
    EXISTS(
      SELECT 1 FROM rent_payments rp 
      WHERE rp.property_id = p.id 
      AND rp.status = 'overdue'
    ) as rent_overdue,
    EXISTS(
      SELECT 1 FROM rent_payments rp 
      WHERE rp.property_id = p.id
    ) as rent_has_data,
    EXISTS(
      SELECT 1 FROM utility_payments up 
      WHERE up.property_id = p.id 
      AND up.status = 'overdue'
    ) as utility_overdue,
    EXISTS(
      SELECT 1 FROM utility_payments up 
      WHERE up.property_id = p.id
    ) as utility_has_data,
    EXISTS(
      SELECT 1 FROM tickets t 
      WHERE t.property_id = p.id 
      AND t.status IN ('open', 'in_progress')
    ) as tickets_open,
    EXISTS(
      SELECT 1 FROM tickets t 
      WHERE t.property_id = p.id
    ) as tickets_has_data,
    EXISTS(
      SELECT 1 FROM recurring_schedules rs 
      WHERE rs.property_id = p.id 
      AND rs.is_active = true 
      AND rs.next_run_date < CURRENT_DATE
    ) as maintenance_overdue,
    EXISTS(
      SELECT 1 FROM recurring_schedules rs 
      WHERE rs.property_id = p.id 
      AND rs.is_active = true
    ) as maintenance_has_data
  FROM unnest(p_property_ids) AS pid
  JOIN properties p ON p.id = pid
  WHERE is_property_manager(auth.uid(), p.id);
$$;