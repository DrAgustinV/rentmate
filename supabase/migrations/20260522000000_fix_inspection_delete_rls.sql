-- Fix: Allow managers to delete any inspection (not just draft) for self-managed tenancies
-- Drop the draft-only delete policy
DROP POLICY IF EXISTS "Managers can delete draft inspections" ON "public"."tenancy_inspections";

-- Create a new policy: managers can delete any inspection for their properties
CREATE POLICY "Managers can delete inspections for their properties"
ON "public"."tenancy_inspections" FOR DELETE
USING (
  public.is_property_manager(auth.uid(), property_id)
);
