-- Fix Security Warning 1: Make property-photos bucket private and add RLS policies
-- Update property-photos bucket to be private
UPDATE storage.buckets 
SET public = false 
WHERE name = 'property-photos';

-- Add RLS policies for property-photos bucket
-- Policy 1: Property managers can upload photos for their properties
CREATE POLICY "Property managers can upload photos" 
ON storage.objects
FOR INSERT 
WITH CHECK (
  bucket_id = 'property-photos' AND
  EXISTS (
    SELECT 1 FROM properties 
    WHERE id = (storage.foldername(name))[1]::uuid 
    AND manager_id = auth.uid()
  )
);

-- Policy 2: Property managers can view photos of their properties
CREATE POLICY "Property managers can view their property photos" 
ON storage.objects
FOR SELECT 
USING (
  bucket_id = 'property-photos' AND
  EXISTS (
    SELECT 1 FROM properties 
    WHERE id = (storage.foldername(name))[1]::uuid 
    AND manager_id = auth.uid()
  )
);

-- Policy 3: Tenants can view photos of properties they're assigned to
CREATE POLICY "Tenants can view assigned property photos" 
ON storage.objects
FOR SELECT 
USING (
  bucket_id = 'property-photos' AND
  EXISTS (
    SELECT 1 FROM property_tenants pt
    JOIN properties p ON p.id = pt.property_id
    WHERE p.id = (storage.foldername(name))[1]::uuid 
    AND pt.tenant_id = auth.uid()
    AND pt.tenancy_status IN ('active', 'ending_tenancy')
  )
);

-- Policy 4: Property managers can update photos for their properties
CREATE POLICY "Property managers can update their property photos" 
ON storage.objects
FOR UPDATE 
USING (
  bucket_id = 'property-photos' AND
  EXISTS (
    SELECT 1 FROM properties 
    WHERE id = (storage.foldername(name))[1]::uuid 
    AND manager_id = auth.uid()
  )
);

-- Policy 5: Property managers can delete photos for their properties
CREATE POLICY "Property managers can delete their property photos" 
ON storage.objects
FOR DELETE 
USING (
  bucket_id = 'property-photos' AND
  EXISTS (
    SELECT 1 FROM properties 
    WHERE id = (storage.foldername(name))[1]::uuid 
    AND manager_id = auth.uid()
  )
);

-- Policy 6: Admins have full access
CREATE POLICY "Admins can manage all property photos" 
ON storage.objects
FOR ALL 
USING (
  bucket_id = 'property-photos' AND
  has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  bucket_id = 'property-photos' AND
  has_role(auth.uid(), 'admin'::app_role)
);