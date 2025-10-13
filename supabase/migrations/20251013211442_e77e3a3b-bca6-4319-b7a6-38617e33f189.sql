-- Create property-photos storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-photos', 'property-photos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for property-photos bucket
CREATE POLICY "Managers can upload property photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'property-photos' 
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM properties WHERE manager_id = auth.uid()
  )
);

CREATE POLICY "Anyone can view property photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'property-photos');

CREATE POLICY "Managers can update property photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'property-photos' 
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM properties WHERE manager_id = auth.uid()
  )
);

CREATE POLICY "Managers can delete property photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'property-photos' 
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM properties WHERE manager_id = auth.uid()
  )
);

-- Create function to get tenant status
CREATE OR REPLACE FUNCTION get_property_tenant_status(p_property_id UUID)
RETURNS TABLE (
  status TEXT,
  tenant_name TEXT,
  tenant_email TEXT,
  pending_invites INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    LIMIT 1
  ),
  pending_invites AS (
    SELECT COUNT(*)::INTEGER as count
    FROM invitations
    WHERE property_id = p_property_id
    AND status = 'pending'
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
$$;