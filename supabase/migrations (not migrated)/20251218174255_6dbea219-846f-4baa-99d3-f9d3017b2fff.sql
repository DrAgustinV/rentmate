
-- Create inspection_type enum
DO $$ BEGIN
  CREATE TYPE inspection_type AS ENUM ('move_in', 'move_out');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create inspection_status enum
DO $$ BEGIN
  CREATE TYPE inspection_status AS ENUM ('draft', 'in_progress', 'pending_signatures', 'completed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create condition_rating enum
DO $$ BEGIN
  CREATE TYPE condition_rating AS ENUM ('excellent', 'good', 'fair', 'poor', 'damaged');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create tenancy_inspections table
CREATE TABLE public.tenancy_inspections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenancy_id UUID NOT NULL REFERENCES public.property_tenants(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  inspection_type inspection_type NOT NULL,
  status inspection_status NOT NULL DEFAULT 'draft',
  template_document_id UUID REFERENCES public.property_documents(id),
  inspection_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  overall_condition TEXT,
  -- Manager signature
  manager_signed_at TIMESTAMP WITH TIME ZONE,
  manager_signature_data JSONB,
  manager_id UUID REFERENCES public.profiles(id),
  -- Tenant signature
  tenant_signed_at TIMESTAMP WITH TIME ZONE,
  tenant_signature_data JSONB,
  tenant_id UUID REFERENCES public.profiles(id),
  -- PDF export
  pdf_url TEXT,
  pdf_generated_at TIMESTAMP WITH TIME ZONE,
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create inspection_items table for room-by-room inspections
CREATE TABLE public.inspection_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inspection_id UUID NOT NULL REFERENCES public.tenancy_inspections(id) ON DELETE CASCADE,
  room_name TEXT NOT NULL,
  room_order INTEGER NOT NULL DEFAULT 0,
  condition condition_rating,
  notes TEXT,
  photos TEXT[] DEFAULT '{}',
  videos TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_tenancy_inspections_tenancy_id ON public.tenancy_inspections(tenancy_id);
CREATE INDEX idx_tenancy_inspections_property_id ON public.tenancy_inspections(property_id);
CREATE INDEX idx_tenancy_inspections_status ON public.tenancy_inspections(status);
CREATE INDEX idx_inspection_items_inspection_id ON public.inspection_items(inspection_id);

-- Enable RLS
ALTER TABLE public.tenancy_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for tenancy_inspections
CREATE POLICY "Managers can view inspections for their properties"
  ON public.tenancy_inspections FOR SELECT
  USING (is_property_manager(auth.uid(), property_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can create inspections for their properties"
  ON public.tenancy_inspections FOR INSERT
  WITH CHECK (is_property_manager(auth.uid(), property_id) AND auth.uid() = created_by);

CREATE POLICY "Managers can update inspections for their properties"
  ON public.tenancy_inspections FOR UPDATE
  USING (is_property_manager(auth.uid(), property_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can delete draft inspections"
  ON public.tenancy_inspections FOR DELETE
  USING (is_property_manager(auth.uid(), property_id) AND status = 'draft');

CREATE POLICY "Tenants can view their inspections"
  ON public.tenancy_inspections FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM property_tenants pt
    WHERE pt.id = tenancy_inspections.tenancy_id
    AND pt.tenant_id = auth.uid()
  ));

CREATE POLICY "Tenants can sign their inspections"
  ON public.tenancy_inspections FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM property_tenants pt
    WHERE pt.id = tenancy_inspections.tenancy_id
    AND pt.tenant_id = auth.uid()
  ) AND status = 'pending_signatures');

-- RLS policies for inspection_items
CREATE POLICY "Users can view inspection items for accessible inspections"
  ON public.inspection_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM tenancy_inspections ti
    WHERE ti.id = inspection_items.inspection_id
    AND (is_property_manager(auth.uid(), ti.property_id) 
         OR has_role(auth.uid(), 'admin'::app_role)
         OR EXISTS (
           SELECT 1 FROM property_tenants pt
           WHERE pt.id = ti.tenancy_id AND pt.tenant_id = auth.uid()
         ))
  ));

CREATE POLICY "Managers can create inspection items"
  ON public.inspection_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM tenancy_inspections ti
    WHERE ti.id = inspection_items.inspection_id
    AND is_property_manager(auth.uid(), ti.property_id)
  ));

CREATE POLICY "Managers can update inspection items"
  ON public.inspection_items FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM tenancy_inspections ti
    WHERE ti.id = inspection_items.inspection_id
    AND is_property_manager(auth.uid(), ti.property_id)
  ));

CREATE POLICY "Managers can delete inspection items"
  ON public.inspection_items FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM tenancy_inspections ti
    WHERE ti.id = inspection_items.inspection_id
    AND is_property_manager(auth.uid(), ti.property_id)
    AND ti.status IN ('draft', 'in_progress')
  ));

-- Trigger for updated_at
CREATE TRIGGER update_tenancy_inspections_updated_at
  BEFORE UPDATE ON public.tenancy_inspections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_inspection_items_updated_at
  BEFORE UPDATE ON public.inspection_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for inspection media
INSERT INTO storage.buckets (id, name, public)
VALUES ('inspection-media', 'inspection-media', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for inspection media
CREATE POLICY "Users can view inspection media for accessible inspections"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'inspection-media' AND (
    EXISTS (
      SELECT 1 FROM tenancy_inspections ti
      JOIN inspection_items ii ON ii.inspection_id = ti.id
      WHERE (storage.foldername(name))[1] = ti.id::text
      AND (is_property_manager(auth.uid(), ti.property_id)
           OR EXISTS (
             SELECT 1 FROM property_tenants pt
             WHERE pt.id = ti.tenancy_id AND pt.tenant_id = auth.uid()
           ))
    )
  ));

CREATE POLICY "Managers can upload inspection media"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'inspection-media' AND (
    EXISTS (
      SELECT 1 FROM tenancy_inspections ti
      WHERE (storage.foldername(name))[1] = ti.id::text
      AND is_property_manager(auth.uid(), ti.property_id)
    )
  ));

CREATE POLICY "Managers can delete inspection media"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'inspection-media' AND (
    EXISTS (
      SELECT 1 FROM tenancy_inspections ti
      WHERE (storage.foldername(name))[1] = ti.id::text
      AND is_property_manager(auth.uid(), ti.property_id)
      AND ti.status IN ('draft', 'in_progress')
    )
  ));
