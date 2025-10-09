-- Create ticket enums
CREATE TYPE ticket_type AS ENUM ('issue', 'request', 'incident');
CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'cancelled');
CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Create system_settings table for configurable upload limits
CREATE TABLE public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value jsonb NOT NULL,
  description text,
  updated_by uuid REFERENCES public.profiles(id),
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Insert default settings
INSERT INTO public.system_settings (setting_key, setting_value, description) VALUES
  ('ticket_max_photos', '{"value": 5}'::jsonb, 'Maximum number of photos per ticket'),
  ('ticket_max_videos', '{"value": 3}'::jsonb, 'Maximum number of videos per ticket'),
  ('ticket_photo_max_size_mb', '{"value": 100}'::jsonb, 'Maximum photo size in MB'),
  ('ticket_video_max_size_mb', '{"value": 500}'::jsonb, 'Maximum video size in MB');

-- RLS policies for system_settings
CREATE POLICY "All authenticated users can view system settings"
ON public.system_settings
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Only admins can update system settings"
ON public.system_settings
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create tickets table (both managers and tenants can create)
CREATE TABLE public.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number text UNIQUE NOT NULL DEFAULT '',
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  created_by uuid REFERENCES public.profiles(id) NOT NULL,
  assigned_to uuid REFERENCES public.profiles(id),
  
  type ticket_type NOT NULL,
  status ticket_status DEFAULT 'open' NOT NULL,
  priority ticket_priority DEFAULT 'medium' NOT NULL,
  
  title text NOT NULL CHECK (char_length(title) <= 200 AND char_length(title) > 0),
  description text NOT NULL CHECK (char_length(description) <= 2000 AND char_length(description) > 0),
  
  resolution_notes text,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES public.profiles(id),
  
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Auto-increment ticket number function (corrected to return trigger)
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS trigger AS $$
DECLARE
  next_num integer;
  ticket_num text;
BEGIN
  SELECT COUNT(*) + 1 INTO next_num FROM public.tickets;
  ticket_num := 'TKT-' || LPAD(next_num::text, 6, '0');
  NEW.ticket_number := ticket_num;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-generation of ticket number
CREATE TRIGGER set_ticket_number
BEFORE INSERT ON public.tickets
FOR EACH ROW
WHEN (NEW.ticket_number = '')
EXECUTE FUNCTION generate_ticket_number();

-- Trigger for updated_at
CREATE TRIGGER update_tickets_updated_at
BEFORE UPDATE ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create ticket_attachments table (optional files)
CREATE TABLE public.ticket_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES public.tickets(id) ON DELETE CASCADE NOT NULL,
  file_path text NOT NULL,
  file_type text NOT NULL CHECK (file_type IN ('photo', 'video')),
  file_size_bytes bigint NOT NULL,
  original_filename text NOT NULL,
  uploaded_by uuid REFERENCES public.profiles(id) NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.ticket_attachments ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_ticket_attachments_ticket ON public.ticket_attachments(ticket_id);
CREATE INDEX idx_ticket_attachments_type ON public.ticket_attachments(ticket_id, file_type);

-- Create ticket_comments table (chat-style conversation)
CREATE TABLE public.ticket_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES public.tickets(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) NOT NULL,
  comment text NOT NULL CHECK (char_length(comment) <= 2000 AND char_length(comment) > 0),
  is_internal boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_ticket_comments_ticket ON public.ticket_comments(ticket_id);

-- Trigger for updated_at
CREATE TRIGGER update_ticket_comments_updated_at
BEFORE UPDATE ON public.ticket_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create ticket_activities table (audit trail)
CREATE TABLE public.ticket_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES public.tickets(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) NOT NULL,
  activity_type text NOT NULL,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.ticket_activities ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_ticket_activities_ticket ON public.ticket_activities(ticket_id);

-- Validation function: Can upload photo
CREATE OR REPLACE FUNCTION can_upload_photo(
  _ticket_id uuid,
  _file_size_bytes bigint
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count integer;
  max_photos integer;
  max_size_mb integer;
  ticket_status_val ticket_status;
BEGIN
  -- Check ticket status (can't upload to resolved/cancelled tickets)
  SELECT status INTO ticket_status_val FROM tickets WHERE id = _ticket_id;
  IF ticket_status_val IN ('resolved', 'cancelled') THEN
    RETURN false;
  END IF;
  
  -- Get settings
  SELECT (setting_value->>'value')::integer INTO max_photos 
  FROM system_settings WHERE setting_key = 'ticket_max_photos';
  
  SELECT (setting_value->>'value')::integer INTO max_size_mb 
  FROM system_settings WHERE setting_key = 'ticket_photo_max_size_mb';
  
  -- Check current count
  SELECT COUNT(*) INTO current_count 
  FROM ticket_attachments 
  WHERE ticket_id = _ticket_id AND file_type = 'photo';
  
  -- Validate count
  IF current_count >= max_photos THEN
    RETURN false;
  END IF;
  
  -- Validate size
  IF _file_size_bytes > (max_size_mb * 1024 * 1024) THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- Validation function: Can upload video
CREATE OR REPLACE FUNCTION can_upload_video(
  _ticket_id uuid,
  _file_size_bytes bigint
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count integer;
  max_videos integer;
  max_size_mb integer;
  ticket_status_val ticket_status;
BEGIN
  -- Check ticket status
  SELECT status INTO ticket_status_val FROM tickets WHERE id = _ticket_id;
  IF ticket_status_val IN ('resolved', 'cancelled') THEN
    RETURN false;
  END IF;
  
  -- Get settings
  SELECT (setting_value->>'value')::integer INTO max_videos 
  FROM system_settings WHERE setting_key = 'ticket_max_videos';
  
  SELECT (setting_value->>'value')::integer INTO max_size_mb 
  FROM system_settings WHERE setting_key = 'ticket_video_max_size_mb';
  
  -- Check current count
  SELECT COUNT(*) INTO current_count 
  FROM ticket_attachments 
  WHERE ticket_id = _ticket_id AND file_type = 'video';
  
  -- Validate count
  IF current_count >= max_videos THEN
    RETURN false;
  END IF;
  
  -- Validate size
  IF _file_size_bytes > (max_size_mb * 1024 * 1024) THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- RLS Policies for tickets
CREATE POLICY "Users can create tickets for their properties"
ON public.tickets
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = created_by AND
  (
    -- Tenants can create for their assigned properties
    EXISTS (
      SELECT 1 FROM property_tenants
      WHERE property_id = tickets.property_id
        AND tenant_id = auth.uid()
    ) OR
    -- Managers can create for their properties
    EXISTS (
      SELECT 1 FROM properties
      WHERE id = tickets.property_id
        AND manager_id = auth.uid()
    ) OR
    -- Admins can create for any property
    has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "Users can view tickets they created"
ON public.tickets
FOR SELECT
TO authenticated
USING (auth.uid() = created_by);

CREATE POLICY "Tenants can view tickets for their properties"
ON public.tickets
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM property_tenants
    WHERE property_id = tickets.property_id
      AND tenant_id = auth.uid()
  )
);

CREATE POLICY "Managers can view tickets for their properties"
ON public.tickets
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM properties
    WHERE id = tickets.property_id
      AND manager_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all tickets"
ON public.tickets
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can update tickets for their properties"
ON public.tickets
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM properties
    WHERE id = tickets.property_id
      AND manager_id = auth.uid()
  ) OR
  has_role(auth.uid(), 'admin'::app_role)
);

-- RLS Policies for ticket_attachments
CREATE POLICY "Users can view attachments for tickets they can access"
ON public.ticket_attachments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tickets t
    LEFT JOIN property_tenants pt ON pt.property_id = t.property_id
    LEFT JOIN properties p ON p.id = t.property_id
    WHERE t.id = ticket_attachments.ticket_id
      AND (
        t.created_by = auth.uid() OR
        pt.tenant_id = auth.uid() OR
        p.manager_id = auth.uid() OR
        has_role(auth.uid(), 'admin'::app_role)
      )
  )
);

CREATE POLICY "Users can upload attachments to their tickets"
ON public.ticket_attachments
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = uploaded_by AND
  EXISTS (
    SELECT 1 FROM tickets t
    LEFT JOIN property_tenants pt ON pt.property_id = t.property_id
    LEFT JOIN properties p ON p.id = t.property_id
    WHERE t.id = ticket_attachments.ticket_id
      AND t.status NOT IN ('resolved', 'cancelled')
      AND (
        t.created_by = auth.uid() OR
        pt.tenant_id = auth.uid() OR
        p.manager_id = auth.uid() OR
        has_role(auth.uid(), 'admin'::app_role)
      )
  )
);

CREATE POLICY "Users can delete their own attachments"
ON public.ticket_attachments
FOR DELETE
TO authenticated
USING (
  auth.uid() = uploaded_by AND
  EXISTS (
    SELECT 1 FROM tickets
    WHERE id = ticket_attachments.ticket_id
      AND status NOT IN ('resolved', 'cancelled')
  )
);

-- RLS Policies for ticket_comments
CREATE POLICY "Users can view non-internal comments for accessible tickets"
ON public.ticket_comments
FOR SELECT
TO authenticated
USING (
  (is_internal = false OR has_role(auth.uid(), 'admin'::app_role) OR
    EXISTS (
      SELECT 1 FROM tickets t
      JOIN properties p ON p.id = t.property_id
      WHERE t.id = ticket_comments.ticket_id
        AND p.manager_id = auth.uid()
    )
  ) AND
  EXISTS (
    SELECT 1 FROM tickets t
    LEFT JOIN property_tenants pt ON pt.property_id = t.property_id
    LEFT JOIN properties p ON p.id = t.property_id
    WHERE t.id = ticket_comments.ticket_id
      AND (
        t.created_by = auth.uid() OR
        pt.tenant_id = auth.uid() OR
        p.manager_id = auth.uid() OR
        has_role(auth.uid(), 'admin'::app_role)
      )
  )
);

CREATE POLICY "Users can add comments to accessible tickets"
ON public.ticket_comments
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM tickets t
    LEFT JOIN property_tenants pt ON pt.property_id = t.property_id
    LEFT JOIN properties p ON p.id = t.property_id
    WHERE t.id = ticket_comments.ticket_id
      AND t.status NOT IN ('resolved', 'cancelled')
      AND (
        t.created_by = auth.uid() OR
        pt.tenant_id = auth.uid() OR
        p.manager_id = auth.uid() OR
        has_role(auth.uid(), 'admin'::app_role)
      )
  )
);

-- RLS Policies for ticket_activities
CREATE POLICY "Users can view activities for accessible tickets"
ON public.ticket_activities
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tickets t
    LEFT JOIN property_tenants pt ON pt.property_id = t.property_id
    LEFT JOIN properties p ON p.id = t.property_id
    WHERE t.id = ticket_activities.ticket_id
      AND (
        t.created_by = auth.uid() OR
        pt.tenant_id = auth.uid() OR
        p.manager_id = auth.uid() OR
        has_role(auth.uid(), 'admin'::app_role)
      )
  )
);

-- Storage buckets for ticket files
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('ticket-photos', 'ticket-photos', false),
  ('ticket-videos', 'ticket-videos', false);

-- Storage RLS policies for ticket-photos
CREATE POLICY "Users can upload photos to accessible tickets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'ticket-photos' AND
  EXISTS (
    SELECT 1 FROM tickets t
    LEFT JOIN property_tenants pt ON pt.property_id = t.property_id
    LEFT JOIN properties p ON p.id = t.property_id
    WHERE t.id::text = (storage.foldername(name))[1]
      AND t.status NOT IN ('resolved', 'cancelled')
      AND (
        t.created_by = auth.uid() OR
        pt.tenant_id = auth.uid() OR
        p.manager_id = auth.uid() OR
        has_role(auth.uid(), 'admin'::app_role)
      )
  )
);

CREATE POLICY "Users can view photos for accessible tickets"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'ticket-photos' AND
  EXISTS (
    SELECT 1 FROM tickets t
    LEFT JOIN property_tenants pt ON pt.property_id = t.property_id
    LEFT JOIN properties p ON p.id = t.property_id
    WHERE t.id::text = (storage.foldername(name))[1]
      AND (
        t.created_by = auth.uid() OR
        pt.tenant_id = auth.uid() OR
        p.manager_id = auth.uid() OR
        has_role(auth.uid(), 'admin'::app_role)
      )
  )
);

CREATE POLICY "Users can delete their uploaded photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'ticket-photos' AND
  EXISTS (
    SELECT 1 FROM ticket_attachments ta
    JOIN tickets t ON t.id = ta.ticket_id
    WHERE ta.file_path = name
      AND ta.uploaded_by = auth.uid()
      AND t.status NOT IN ('resolved', 'cancelled')
  )
);

-- Storage RLS policies for ticket-videos
CREATE POLICY "Users can upload videos to accessible tickets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'ticket-videos' AND
  EXISTS (
    SELECT 1 FROM tickets t
    LEFT JOIN property_tenants pt ON pt.property_id = t.property_id
    LEFT JOIN properties p ON p.id = t.property_id
    WHERE t.id::text = (storage.foldername(name))[1]
      AND t.status NOT IN ('resolved', 'cancelled')
      AND (
        t.created_by = auth.uid() OR
        pt.tenant_id = auth.uid() OR
        p.manager_id = auth.uid() OR
        has_role(auth.uid(), 'admin'::app_role)
      )
  )
);

CREATE POLICY "Users can view videos for accessible tickets"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'ticket-videos' AND
  EXISTS (
    SELECT 1 FROM tickets t
    LEFT JOIN property_tenants pt ON pt.property_id = t.property_id
    LEFT JOIN properties p ON p.id = t.property_id
    WHERE t.id::text = (storage.foldername(name))[1]
      AND (
        t.created_by = auth.uid() OR
        pt.tenant_id = auth.uid() OR
        p.manager_id = auth.uid() OR
        has_role(auth.uid(), 'admin'::app_role)
      )
  )
);

CREATE POLICY "Users can delete their uploaded videos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'ticket-videos' AND
  EXISTS (
    SELECT 1 FROM ticket_attachments ta
    JOIN tickets t ON t.id = ta.ticket_id
    WHERE ta.file_path = name
      AND ta.uploaded_by = auth.uid()
      AND t.status NOT IN ('resolved', 'cancelled')
  )
);

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_attachments;