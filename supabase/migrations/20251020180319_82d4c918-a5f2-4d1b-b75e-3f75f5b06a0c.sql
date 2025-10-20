-- Add explicit RLS policy for managers to view their property templates
-- This works alongside the existing policy but uses a simpler, more direct approach
CREATE POLICY "Managers can view property templates directly"
ON property_documents FOR SELECT
USING (
  document_category = 'property' 
  AND property_id IN (
    SELECT id FROM properties WHERE manager_id = auth.uid()
  )
);