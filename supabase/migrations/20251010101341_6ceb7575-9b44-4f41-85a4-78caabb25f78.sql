-- Create property_documents table
CREATE TABLE public.property_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  parent_document_id UUID REFERENCES public.property_documents(id) ON DELETE SET NULL,
  description TEXT,
  is_latest_version BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_property_documents_property ON public.property_documents(property_id);
CREATE INDEX idx_property_documents_parent ON public.property_documents(parent_document_id);
CREATE INDEX idx_property_documents_latest ON public.property_documents(property_id, is_latest_version);

-- Enable RLS
ALTER TABLE public.property_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view documents for their properties
CREATE POLICY "Users can view property documents"
ON public.property_documents FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = property_documents.property_id
    AND (p.manager_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.property_tenants pt
      WHERE pt.property_id = p.id AND pt.tenant_id = auth.uid()
    ))
  ) OR has_role(auth.uid(), 'admin'::app_role)
);

-- RLS Policy: Users can upload documents
CREATE POLICY "Users can upload property documents"
ON public.property_documents FOR INSERT
WITH CHECK (
  auth.uid() = uploaded_by
  AND EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = property_documents.property_id
    AND p.status = 'active'::property_status
    AND (p.manager_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.property_tenants pt
      WHERE pt.property_id = p.id AND pt.tenant_id = auth.uid()
    ))
  )
);

-- RLS Policy: Only managers can delete documents
CREATE POLICY "Managers can delete property documents"
ON public.property_documents FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = property_documents.property_id
    AND p.manager_id = auth.uid()
  ) OR has_role(auth.uid(), 'admin'::app_role)
);

-- Database function: Validate document upload
CREATE OR REPLACE FUNCTION public.can_upload_property_document(
  _property_id UUID,
  _file_size_bytes BIGINT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_count INTEGER;
  max_docs INTEGER;
  max_size_mb INTEGER;
  property_status_val property_status;
BEGIN
  -- Check property status
  SELECT status INTO property_status_val FROM properties WHERE id = _property_id;
  IF property_status_val != 'active' THEN
    RETURN false;
  END IF;
  
  -- Get settings
  SELECT (setting_value->>'value')::INTEGER INTO max_docs 
  FROM system_settings WHERE setting_key = 'property_doc_max_count';
  
  SELECT (setting_value->>'value')::INTEGER INTO max_size_mb 
  FROM system_settings WHERE setting_key = 'property_doc_max_size_mb';
  
  -- Check current count (only latest versions)
  SELECT COUNT(*) INTO current_count 
  FROM property_documents 
  WHERE property_id = _property_id AND is_latest_version = true;
  
  -- Validate count
  IF current_count >= max_docs THEN
    RETURN false;
  END IF;
  
  -- Validate size
  IF _file_size_bytes > (max_size_mb * 1024 * 1024) THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- Add system settings
INSERT INTO public.system_settings (setting_key, setting_value, description) VALUES
  ('property_doc_max_size_mb', '{"value": 50}', 'Maximum document size in MB'),
  ('property_doc_max_count', '{"value": 50}', 'Maximum number of documents per property');

-- Create storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-documents', 'property-documents', false);

-- Storage RLS: Users can view documents
CREATE POLICY "Users can view property documents in storage"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'property-documents'
  AND EXISTS (
    SELECT 1 FROM public.property_documents pd
    JOIN public.properties p ON p.id = pd.property_id
    WHERE pd.file_path = storage.objects.name
    AND (p.manager_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.property_tenants pt
      WHERE pt.property_id = p.id AND pt.tenant_id = auth.uid()
    ))
  )
);

-- Storage RLS: Users can upload documents
CREATE POLICY "Users can upload property documents to storage"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'property-documents'
);

-- Storage RLS: Managers can delete documents
CREATE POLICY "Managers can delete property documents from storage"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'property-documents'
  AND EXISTS (
    SELECT 1 FROM public.property_documents pd
    JOIN public.properties p ON p.id = pd.property_id
    WHERE pd.file_path = storage.objects.name
    AND p.manager_id = auth.uid()
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_property_documents_updated_at
BEFORE UPDATE ON public.property_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();