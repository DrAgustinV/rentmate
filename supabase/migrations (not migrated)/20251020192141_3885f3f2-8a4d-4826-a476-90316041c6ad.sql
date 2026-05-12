-- Add RLS policy for managers to view profiles of document uploaders
-- This allows the profiles join in property_documents queries to work
CREATE POLICY "Managers can view uploaders of their property documents"
ON profiles FOR SELECT
USING (
  id IN (
    SELECT pd.uploaded_by 
    FROM property_documents pd
    JOIN properties p ON p.id = pd.property_id
    WHERE p.manager_id = auth.uid()
  )
);