-- Create property_costs table for non-tenant-related property expenses
CREATE TABLE IF NOT EXISTS property_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  cost_category text NOT NULL CHECK (cost_category IN (
    'community_fee', 'property_tax', 'maintenance', 'exceptional', 'insurance', 'other'
  )),
  description text,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  currency text NOT NULL DEFAULT 'EUR',
  due_date date,
  paid_date date,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  recurrence text NOT NULL DEFAULT 'once' CHECK (recurrence IN ('once', 'monthly', 'quarterly', 'yearly')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_property_costs_property_id ON property_costs(property_id);

ALTER TABLE property_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Manager full access on own property costs" ON property_costs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = property_costs.property_id
      AND properties.manager_id = auth.uid()
    )
  );
