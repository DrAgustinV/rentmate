-- Create ticket templates table
CREATE TABLE public.ticket_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type ticket_type NOT NULL,
  priority ticket_priority DEFAULT 'medium' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create recurring schedules table
CREATE TABLE public.recurring_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES public.ticket_templates(id) ON DELETE CASCADE NOT NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
  start_date DATE NOT NULL,
  next_run_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.ticket_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ticket_templates
CREATE POLICY "Managers can view templates for their properties"
ON public.ticket_templates FOR SELECT
USING (
  is_property_manager(auth.uid(), property_id) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Managers can create templates for their properties"
ON public.ticket_templates FOR INSERT
WITH CHECK (
  auth.uid() = created_by 
  AND is_property_manager(auth.uid(), property_id)
);

CREATE POLICY "Managers can update templates for their properties"
ON public.ticket_templates FOR UPDATE
USING (
  is_property_manager(auth.uid(), property_id) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Managers can delete templates for their properties"
ON public.ticket_templates FOR DELETE
USING (
  is_property_manager(auth.uid(), property_id) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- RLS Policies for recurring_schedules
CREATE POLICY "Managers can view schedules for their properties"
ON public.recurring_schedules FOR SELECT
USING (
  is_property_manager(auth.uid(), property_id) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Managers can create schedules for their properties"
ON public.recurring_schedules FOR INSERT
WITH CHECK (
  auth.uid() = created_by 
  AND is_property_manager(auth.uid(), property_id)
);

CREATE POLICY "Managers can update schedules for their properties"
ON public.recurring_schedules FOR UPDATE
USING (
  is_property_manager(auth.uid(), property_id) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Managers can delete schedules for their properties"
ON public.recurring_schedules FOR DELETE
USING (
  is_property_manager(auth.uid(), property_id) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Indexes for performance
CREATE INDEX idx_ticket_templates_property ON public.ticket_templates(property_id);
CREATE INDEX idx_ticket_templates_created_by ON public.ticket_templates(created_by);
CREATE INDEX idx_recurring_schedules_property ON public.recurring_schedules(property_id);
CREATE INDEX idx_recurring_schedules_template ON public.recurring_schedules(template_id);
CREATE INDEX idx_recurring_schedules_next_run ON public.recurring_schedules(next_run_date) WHERE is_active = true;

-- Trigger for updated_at on ticket_templates
CREATE TRIGGER update_ticket_templates_updated_at
BEFORE UPDATE ON public.ticket_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updated_at on recurring_schedules
CREATE TRIGGER update_recurring_schedules_updated_at
BEFORE UPDATE ON public.recurring_schedules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();