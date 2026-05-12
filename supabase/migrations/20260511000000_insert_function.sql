-- Create a database function to insert documents bypassing RLS
CREATE OR REPLACE FUNCTION public.insert_property_document(
  p_property_id UUID,
  p_uploaded_by UUID,
  p_document_title TEXT,
  p_file_name TEXT,
  p_file_path TEXT,
  p_file_type TEXT,
  p_file_size_bytes BIGINT,
  p_mime_type TEXT,
  p_version INTEGER,
  p_description TEXT,
  p_is_latest_version BOOLEAN,
  p_document_category TEXT,
  p_tenancy_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO property_documents (
    property_id,
    uploaded_by,
    document_title,
    file_name,
    file_path,
    file_type,
    file_size_bytes,
    mime_type,
    version,
    description,
    is_latest_version,
    document_category,
    tenancy_id
  )
  VALUES (
    p_property_id,
    p_uploaded_by,
    p_document_title,
    p_file_name,
    p_file_path,
    p_file_type,
    p_file_size_bytes,
    p_mime_type,
    p_version,
    p_description,
    p_is_latest_version,
    p_document_category,
    p_tenancy_id
  )
  RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.insert_property_document TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_property_document TO anon;
GRANT EXECUTE ON FUNCTION public.insert_property_document TO service_role;