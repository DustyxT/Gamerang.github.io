-- TARGETED STORAGE FIX FOR GAMERANG
-- Based on actual database inspection via MCP connection
-- This fixes the specific issues found in your Supabase setup

-- ============================================================
-- 1. UPDATE BUCKET CONFIGURATION
-- ============================================================

-- Fix the bucket configuration (it exists but has null limits/types)
UPDATE storage.buckets 
SET 
  file_size_limit = 52428800,  -- 50MB limit
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
WHERE id = 'games-images';

-- ============================================================
-- 2. CLEAN UP CONFLICTING POLICIES
-- ============================================================

-- Remove the problematic policies that have null qualifiers
DROP POLICY IF EXISTS "Allow authenticated upload 1ebpsec_0" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload" ON storage.objects;
DROP POLICY IF EXISTS "Public upload" ON storage.objects;

-- Keep the working policies but ensure they're properly named
-- (These are already working: "Enable read access for all users" and "Public read access")

-- ============================================================
-- 3. ADD PROPER AUTHENTICATED UPLOAD POLICY
-- ============================================================

-- Create a proper authenticated upload policy with correct qualifier
CREATE POLICY "games_images_authenticated_upload" ON storage.objects 
FOR INSERT WITH CHECK (
  bucket_id = 'games-images' 
  AND auth.role() = 'authenticated'
);

-- ============================================================
-- 4. VERIFICATION
-- ============================================================

-- Show updated bucket config
SELECT 
  id, 
  name, 
  public, 
  file_size_limit, 
  allowed_mime_types
FROM storage.buckets 
WHERE id = 'games-images';

-- Show current policies
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
ORDER BY policyname; 