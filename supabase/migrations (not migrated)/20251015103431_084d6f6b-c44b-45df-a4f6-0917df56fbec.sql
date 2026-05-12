-- Create standard maintenance templates table
CREATE TABLE standard_maintenance_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type ticket_type NOT NULL,
  priority ticket_priority NOT NULL DEFAULT 'medium',
  suggested_frequency TEXT NOT NULL,
  category TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE standard_maintenance_templates ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view active templates
CREATE POLICY "All users can view standard templates"
  ON standard_maintenance_templates FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Only admins can manage templates
CREATE POLICY "Only admins can manage standard templates"
  ON standard_maintenance_templates FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_standard_maintenance_templates_updated_at
  BEFORE UPDATE ON standard_maintenance_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add optional tracking column to ticket_templates
ALTER TABLE ticket_templates 
  ADD COLUMN source_standard_template_id UUID REFERENCES standard_maintenance_templates(id);

-- Seed 20 standard templates
INSERT INTO standard_maintenance_templates (title, description, type, priority, suggested_frequency, category) VALUES
  -- HVAC (3 tasks)
  ('HVAC Filter Replacement', 'Replace air filters in HVAC system to maintain air quality and system efficiency', 'maintenance', 'medium', 'monthly', 'HVAC'),
  ('Air Conditioner Inspection', 'Professional inspection of AC unit including refrigerant levels, electrical connections, and performance', 'inspection', 'medium', 'quarterly', 'HVAC'),
  ('Heating System Check', 'Annual inspection of heating system including furnace, boiler, or heat pump', 'inspection', 'high', 'yearly', 'HVAC'),
  
  -- Plumbing (3 tasks)
  ('Water Heater Inspection', 'Check water heater for leaks, sediment buildup, and proper temperature settings', 'inspection', 'medium', 'yearly', 'Plumbing'),
  ('Faucet & Pipe Leak Check', 'Inspect all faucets, pipes, and connections for leaks or corrosion', 'inspection', 'low', 'monthly', 'Plumbing'),
  ('Drain Cleaning', 'Clean drains and check for clogs in sinks, tubs, and showers', 'maintenance', 'low', 'quarterly', 'Plumbing'),
  
  -- Electrical (3 tasks)
  ('Smoke Detector Testing', 'Test all smoke detectors and replace batteries if needed', 'inspection', 'high', 'monthly', 'Electrical'),
  ('Carbon Monoxide Detector Testing', 'Test CO detectors and replace batteries if needed', 'inspection', 'high', 'monthly', 'Electrical'),
  ('Circuit Breaker Inspection', 'Check circuit breaker panel for loose connections, rust, or wear', 'inspection', 'medium', 'yearly', 'Electrical'),
  
  -- Appliances (3 tasks)
  ('Refrigerator Coil Cleaning', 'Clean refrigerator coils to improve efficiency and extend appliance life', 'cleaning', 'low', 'quarterly', 'Appliances'),
  ('Dishwasher Filter Cleaning', 'Remove and clean dishwasher filter to prevent clogs and odors', 'cleaning', 'low', 'monthly', 'Appliances'),
  ('Washing Machine Hose Check', 'Inspect washing machine hoses for cracks, leaks, or wear', 'inspection', 'medium', 'yearly', 'Appliances'),
  
  -- General Maintenance (5 tasks)
  ('Window Cleaning', 'Clean interior and exterior windows for better light and appearance', 'cleaning', 'low', 'monthly', 'General'),
  ('Gutter Cleaning', 'Remove debris from gutters and downspouts to prevent water damage', 'cleaning', 'medium', 'quarterly', 'General'),
  ('Exterior Painting Touch-up', 'Inspect and touch up exterior paint to prevent weather damage', 'maintenance', 'low', 'yearly', 'General'),
  ('Door Lock Lubrication', 'Lubricate door locks and hinges to ensure smooth operation', 'maintenance', 'low', 'quarterly', 'General'),
  ('Weatherstripping Check', 'Inspect and replace weatherstripping around doors and windows', 'inspection', 'low', 'yearly', 'General'),
  
  -- Safety (3 tasks)
  ('Fire Extinguisher Check', 'Inspect fire extinguisher pressure, location, and expiration date', 'inspection', 'high', 'yearly', 'Safety'),
  ('Emergency Exit Testing', 'Test all emergency exits and ensure they open properly', 'inspection', 'high', 'yearly', 'Safety'),
  ('First Aid Kit Inspection', 'Check first aid kit supplies and replace expired items', 'inspection', 'medium', 'quarterly', 'Safety');