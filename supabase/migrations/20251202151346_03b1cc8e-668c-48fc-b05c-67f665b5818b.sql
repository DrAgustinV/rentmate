-- Drop the broken policy
DROP POLICY IF EXISTS "Users can view their qualified contracts" ON storage.objects;

-- Create corrected policy with [2] instead of [1]
CREATE POLICY "Users can view their qualified contracts"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id = 'qualified-contracts'
  AND EXISTS (
    SELECT 1
    FROM contract_signatures cs
    JOIN property_tenants pt ON cs.tenancy_id = pt.id
    WHERE cs.id::text = (storage.foldername(name))[2]
    AND (
      pt.tenant_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM properties p
        WHERE p.id = cs.property_id AND p.manager_id = auth.uid()
      )
    )
  )
);