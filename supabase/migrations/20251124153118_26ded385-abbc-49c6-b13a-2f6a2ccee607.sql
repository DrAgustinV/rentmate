-- Allow managers to delete contract signatures they initiated
-- This enables canceling signatures to choose a different method
CREATE POLICY "Managers can delete signatures they initiated"
ON contract_signatures 
FOR DELETE
TO authenticated
USING (
  auth.uid() = initiated_by
  AND workflow_status IN ('in_progress', 'pending')
);