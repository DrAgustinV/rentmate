-- Create repair_shops table
CREATE TABLE public.repair_shops (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  manager_id UUID NOT NULL,
  
  -- Business Info
  company_name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT NOT NULL,
  
  -- Address
  address TEXT,
  city TEXT,
  postal_code TEXT,
  
  -- Specializations
  specializations TEXT[] DEFAULT '{}',
  
  -- Business Details
  license_number TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_repair_shops_manager ON public.repair_shops(manager_id);
CREATE INDEX idx_repair_shops_active ON public.repair_shops(manager_id, is_active);

-- Enable RLS
ALTER TABLE public.repair_shops ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Managers can view own repair shops"
  ON public.repair_shops FOR SELECT
  USING (auth.uid() = manager_id);

CREATE POLICY "Managers can create repair shops"
  ON public.repair_shops FOR INSERT
  WITH CHECK (auth.uid() = manager_id);

CREATE POLICY "Managers can update own repair shops"
  ON public.repair_shops FOR UPDATE
  USING (auth.uid() = manager_id);

CREATE POLICY "Managers can delete own repair shops"
  ON public.repair_shops FOR DELETE
  USING (auth.uid() = manager_id);

CREATE POLICY "Admins can view all repair shops"
  ON public.repair_shops FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_repair_shops_updated_at
  BEFORE UPDATE ON public.repair_shops
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- System setting for limits
INSERT INTO public.system_settings (setting_key, setting_value, description)
VALUES (
  'max_repair_shops_per_manager',
  '{"value": 50}'::jsonb,
  'Maximum number of repair shop contacts per manager'
);