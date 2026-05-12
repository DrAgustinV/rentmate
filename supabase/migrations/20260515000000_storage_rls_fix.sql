-- Add proper RLS policies for storage bucket uploads
-- This allows authenticated users to upload to the property-documents bucket

-- Drop overly permissive policies (if they exist)
DROP POLICY IF EXISTS "Anyone can upload to property-documents" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload to property-documents anon" ON storage.objects;
DROP POLICY IF EXISTS "property_documents_all_insert" ON storage.objects;
DROP POLICY IF EXISTS "property_documents_all_insert_anon" ON storage.objects;

-- Create proper insert policy for authenticated users
-- Users can upload if they're authenticated (service role bypasses all RLS anyway)
CREATE POLICY "property_documents_storage_insert_authenticated"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'property-documents'
);

-- Create select policy so users can view their uploads
DROP POLICY IF EXISTS "property_documents_storage_select_authenticated" ON storage.objects;

CREATE POLICY "property_documents_storage_select_authenticated"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'property-documents'
);

-- Create delete policy for uploads
DROP POLICY IF EXISTS "property_documents_storage_delete_authenticated" ON storage.objects;

CREATE POLICY "property_documents_storage_delete_authenticated"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'property-documents'
);