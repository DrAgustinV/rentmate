-- Add avatar_url column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;

-- Create storage bucket for profile photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('profile-photos', 'profile-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Users can upload their own profile photo
CREATE POLICY "Users can upload own profile photo" ON storage.objects 
FOR INSERT WITH CHECK (
  bucket_id = 'profile-photos' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can update their own profile photo
CREATE POLICY "Users can update own profile photo" ON storage.objects 
FOR UPDATE USING (
  bucket_id = 'profile-photos' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own profile photo
CREATE POLICY "Users can delete own profile photo" ON storage.objects 
FOR DELETE USING (
  bucket_id = 'profile-photos' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Authenticated users can view profile photos
CREATE POLICY "Authenticated users can view profile photos" ON storage.objects 
FOR SELECT USING (
  bucket_id = 'profile-photos' AND auth.role() = 'authenticated'
);