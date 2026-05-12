-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Managers can delete draft requirements" ON tenancy_requirements;

-- Create new policy that allows managers to delete both draft and sent requirements
CREATE POLICY "Managers can delete draft or sent requirements"
  ON tenancy_requirements FOR DELETE
  USING (
    is_property_manager(auth.uid(), property_id) 
    AND status IN ('draft', 'sent')
  );