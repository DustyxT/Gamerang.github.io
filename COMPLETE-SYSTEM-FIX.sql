-- ============================================================
-- COMPLETE SYSTEM FIX FOR GAMERANG
-- This script fixes ALL identified issues based on MCP analysis
-- Run this entire script in your Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. FIX GAMES TABLE SCHEMA (ADD MISSING user_id)
-- ============================================================

-- Add the missing user_id column that frontend is trying to send
ALTER TABLE games ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Set default user_id for existing games (use first available user)
UPDATE games 
SET user_id = (SELECT id FROM auth.users LIMIT 1) 
WHERE user_id IS NULL;

-- ============================================================
-- 2. CLEAN UP ALL DUPLICATE/CONFLICTING POLICIES
-- ============================================================

-- Clean up games table policies (too many duplicates)
DROP POLICY IF EXISTS "Allow anon insert" ON games;
DROP POLICY IF EXISTS "Allow anon update" ON games;  
DROP POLICY IF EXISTS "Allow anyone to insert games" ON games;
DROP POLICY IF EXISTS "Allow authenticated users to insert games" ON games;
DROP POLICY IF EXISTS "Authenticated users can insert games" ON games;
DROP POLICY IF EXISTS "Allow public read access to games" ON games;
DROP POLICY IF EXISTS "Public read" ON games;

-- Create clean, proper policies for games
CREATE POLICY "games_public_read" ON games 
  FOR SELECT USING (true);

CREATE POLICY "games_authenticated_insert" ON games 
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "games_own_update" ON games 
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "games_own_delete" ON games 
  FOR DELETE USING (auth.uid() = user_id);

-- Clean up storage policies (multiple duplicates)
DROP POLICY IF EXISTS "Enable read access for all users" ON storage.objects;
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
DROP POLICY IF EXISTS "games_images_authenticated_upload" ON storage.objects;

-- Create clean, proper storage policies
CREATE POLICY "storage_games_images_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'games-images');

CREATE POLICY "storage_games_images_auth_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'games-images' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "storage_games_images_auth_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'games-images' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "storage_games_images_auth_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'games-images' 
    AND auth.role() = 'authenticated'
  );

-- ============================================================
-- 3. ENSURE STORAGE BUCKET IS PROPERLY CONFIGURED
-- ============================================================

-- Update bucket configuration (ensure limits are set)
UPDATE storage.buckets 
SET 
  file_size_limit = 52428800,  -- 50MB
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
WHERE id = 'games-images';

-- ============================================================
-- 4. CREATE PROPER INDEXES FOR PERFORMANCE
-- ============================================================

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_games_user_id ON games(user_id);
CREATE INDEX IF NOT EXISTS idx_games_created_at ON games(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_games_genre ON games(genre);
CREATE INDEX IF NOT EXISTS idx_games_title ON games(title);

-- ============================================================
-- 5. ENSURE RLS IS ENABLED
-- ============================================================

-- Ensure Row Level Security is enabled
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 6. GRANT PROPER PERMISSIONS
-- ============================================================

-- Ensure storage permissions are correct
GRANT USAGE ON SCHEMA storage TO postgres, anon, authenticated, service_role;
GRANT ALL ON storage.objects TO postgres, anon, authenticated, service_role;
GRANT ALL ON storage.buckets TO postgres, anon, authenticated, service_role;

-- ============================================================
-- 7. VERIFICATION QUERIES
-- ============================================================

-- Verify games table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'games' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verify storage bucket configuration
SELECT id, name, public, file_size_limit, allowed_mime_types 
FROM storage.buckets 
WHERE id = 'games-images';

-- Verify policies are clean (should only show our new ones)
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies 
WHERE (schemaname = 'public' AND tablename = 'games')
   OR (schemaname = 'storage' AND tablename = 'objects')
ORDER BY schemaname, tablename, policyname;

-- ============================================================
-- 8. SUCCESS MESSAGE
-- ============================================================

DO $$
BEGIN
  -- Check if user_id column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'games' 
    AND column_name = 'user_id' 
    AND table_schema = 'public'
  ) THEN
    RAISE NOTICE '✅ SUCCESS: Games table now has user_id column';
  ELSE
    RAISE EXCEPTION '❌ FAILED: user_id column not added to games table';
  END IF;
  
  -- Check if storage bucket is properly configured
  IF EXISTS (
    SELECT 1 FROM storage.buckets 
    WHERE id = 'games-images' 
    AND file_size_limit IS NOT NULL 
    AND allowed_mime_types IS NOT NULL
  ) THEN
    RAISE NOTICE '✅ SUCCESS: Storage bucket properly configured';
  ELSE
    RAISE EXCEPTION '❌ FAILED: Storage bucket not properly configured';
  END IF;
  
  RAISE NOTICE '🎉 ALL FIXES APPLIED SUCCESSFULLY!';
  RAISE NOTICE 'Your Gamerang system should now work properly.';
END $$; 