-- FIX STORAGE BUCKET PERMISSIONS
-- This fixes the specific issue preventing bucket listing in JavaScript
-- Run this in your Supabase SQL Editor

-- ============================================================
-- 1. CREATE MISSING BUCKET POLICIES
-- ============================================================

-- Allow anyone to list/read storage buckets (needed for JavaScript bucket check)
CREATE POLICY "allow_bucket_list" ON storage.buckets
  FOR SELECT USING (true);

-- ============================================================
-- 2. ENSURE STORAGE SCHEMA PERMISSIONS
-- ============================================================

-- Grant necessary permissions for bucket operations
GRANT USAGE ON SCHEMA storage TO anon, authenticated;
GRANT SELECT ON storage.buckets TO anon, authenticated;
GRANT SELECT ON storage.objects TO anon, authenticated;

-- ============================================================
-- 3. VERIFICATION
-- ============================================================

-- Check if policy was created
SELECT policyname, schemaname, tablename, cmd 
FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'buckets';

-- Show bucket info
SELECT id, name, public FROM storage.buckets WHERE id = 'games-images';

-- ============================================================
-- 4. SUCCESS MESSAGE
-- ============================================================

DO $$
BEGIN
  -- Check if bucket policy exists
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'buckets' 
    AND policyname = 'allow_bucket_list'
  ) THEN
    RAISE NOTICE '✅ SUCCESS: Storage bucket policies created!';
    RAISE NOTICE 'Your JavaScript should now be able to list buckets.';
  ELSE
    RAISE EXCEPTION '❌ FAILED: Storage bucket policy not created';
  END IF;
END $$; 