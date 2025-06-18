-- FIX STORAGE BUCKET ISSUE FOR GAMERANG
-- This script specifically addresses the 'games-images' bucket not found error
-- Run this in your Supabase Dashboard SQL Editor

-- ============================================================
-- 1. GRANT STORAGE PERMISSIONS
-- ============================================================

-- Ensure storage schema is accessible
GRANT USAGE ON SCHEMA storage TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA storage TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA storage TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA storage TO postgres, anon, authenticated, service_role;

-- ============================================================
-- 2. CLEAN UP EXISTING STORAGE POLICIES
-- ============================================================

-- Remove any conflicting policies
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload" ON storage.objects;
DROP POLICY IF EXISTS "Public upload" ON storage.objects;
DROP POLICY IF EXISTS "Enable read access for all users" ON storage.objects;
DROP POLICY IF EXISTS "games_images_public_read" ON storage.objects;
DROP POLICY IF EXISTS "games_images_auth_upload" ON storage.objects;
DROP POLICY IF EXISTS "games_images_public_upload" ON storage.objects;
DROP POLICY IF EXISTS "games_images_authenticated_upload" ON storage.objects;
DROP POLICY IF EXISTS "games_images_authenticated_update" ON storage.objects;
DROP POLICY IF EXISTS "games_images_authenticated_delete" ON storage.objects;

-- ============================================================
-- 3. RECREATE STORAGE BUCKET
-- ============================================================

-- Delete existing bucket (if any) to ensure clean setup
DELETE FROM storage.buckets WHERE id = 'games-images';

-- Create the games-images bucket with proper configuration
INSERT INTO storage.buckets (
  id, 
  name, 
  public, 
  file_size_limit, 
  allowed_mime_types,
  created_at,
  updated_at
) VALUES (
  'games-images',
  'games-images',
  true,
  52428800,  -- 50MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
  NOW(),
  NOW()
);

-- ============================================================
-- 4. CREATE STORAGE POLICIES
-- ============================================================

-- Policy for public read access to images
CREATE POLICY "games_images_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'games-images');

-- Policy for authenticated users to upload images
CREATE POLICY "games_images_authenticated_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'games-images' 
    AND auth.role() = 'authenticated'
  );

-- Policy for authenticated users to update images
CREATE POLICY "games_images_authenticated_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'games-images' 
    AND auth.role() = 'authenticated'
  );

-- Policy for authenticated users to delete images
CREATE POLICY "games_images_authenticated_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'games-images' 
    AND auth.role() = 'authenticated'
  );

-- ============================================================
-- 5. GRANT NECESSARY PERMISSIONS
-- ============================================================

-- Grant permissions on storage tables
GRANT ALL ON storage.objects TO authenticated, anon;
GRANT ALL ON storage.buckets TO authenticated, anon;

-- ============================================================
-- 6. VERIFICATION
-- ============================================================

-- Verify the bucket was created successfully
DO $$
DECLARE
  bucket_exists BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM storage.buckets WHERE id = 'games-images') INTO bucket_exists;
  
  IF bucket_exists THEN
    RAISE NOTICE 'SUCCESS: Storage bucket "games-images" created successfully!';
  ELSE
    RAISE EXCEPTION 'FAILED: Storage bucket "games-images" was not created properly';
  END IF;
END $$;

-- Show bucket configuration for verification
SELECT 
  id, 
  name, 
  public, 
  file_size_limit, 
  allowed_mime_types,
  created_at
FROM storage.buckets 
WHERE id = 'games-images';

-- Show storage policies for verification
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage' 
AND policyname LIKE '%games_images%'; 