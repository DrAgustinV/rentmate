-- Create import_logs table for tracking bulk imports
CREATE TABLE IF NOT EXISTS public.import_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id UUID REFERENCES public.profiles(id) NOT NULL,
  import_type TEXT NOT NULL CHECK (import_type IN ('properties', 'properties_and_tenants', 'tenants_only')),
  file_name TEXT,
  file_size_bytes BIGINT,
  records_processed INT DEFAULT 0,
  records_succeeded INT DEFAULT 0,
  records_failed INT DEFAULT 0,
  error_log JSONB,
  processing_time_ms INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.import_logs ENABLE ROW LEVEL SECURITY;

-- Managers can view their own imports
CREATE POLICY "Managers can view own imports"
  ON public.import_logs FOR SELECT
  USING (auth.uid() = manager_id);

-- Managers can create import logs
CREATE POLICY "Managers can create import logs"
  ON public.import_logs FOR INSERT
  WITH CHECK (auth.uid() = manager_id);

-- System/Managers can update their own import logs
CREATE POLICY "Managers can update own imports"
  ON public.import_logs FOR UPDATE
  USING (auth.uid() = manager_id);

-- Admins can view all imports
CREATE POLICY "Admins can view all imports"
  ON public.import_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_import_logs_manager_id ON public.import_logs(manager_id);
CREATE INDEX IF NOT EXISTS idx_import_logs_created_at ON public.import_logs(created_at DESC);