-- Tenancy status redesign: add possession_date, vacate_date, grace_days
-- Rename planned_ending_date → end_date for clarity
-- Add trigger to derive tenancy_status from date fields

ALTER TABLE property_tenants
  ADD COLUMN IF NOT EXISTS possession_date date,
  ADD COLUMN IF NOT EXISTS vacate_date date;

ALTER TABLE property_tenants
  ADD COLUMN IF NOT EXISTS grace_days integer NOT NULL DEFAULT 60;

ALTER TABLE property_tenants RENAME COLUMN planned_ending_date TO end_date;

-- Trigger function: derive tenancy_status from date fields
CREATE OR REPLACE FUNCTION derive_tenancy_status()
RETURNS trigger AS $$
BEGIN
  IF NEW.vacate_date IS NOT NULL THEN
    IF (NEW.vacate_date + (NEW.grace_days || ' days')::interval) < CURRENT_DATE THEN
      NEW.tenancy_status := 'historic';
    ELSE
      NEW.tenancy_status := 'ending_tenancy';
    END IF;
  ELSIF NEW.started_at > CURRENT_DATE THEN
    NEW.tenancy_status := 'pending';
  ELSE
    NEW.tenancy_status := 'active';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_derive_tenancy_status ON property_tenants;

CREATE TRIGGER trg_derive_tenancy_status
  BEFORE INSERT OR UPDATE OF started_at, vacate_date, grace_days
  ON property_tenants
  FOR EACH ROW
  EXECUTE FUNCTION derive_tenancy_status();
