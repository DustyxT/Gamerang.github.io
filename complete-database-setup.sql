-- COMPLETE DATABASE SETUP FOR GAMERANG WEBSITE
-- Run this in your Supabase Dashboard SQL Editor
-- This script has full permission to create all necessary tables and configurations

-- ============================================================
-- 1. AUTHENTICATION SETUP
-- ============================================================

-- Drop existing problematic trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create improved user profile function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    'user'
  );
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log error but don't fail the auth user creation
    RAISE LOG 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- 2. STORAGE SETUP  
-- ============================================================

-- First, ensure storage schema is accessible
GRANT USAGE ON SCHEMA storage TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA storage TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA storage TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA storage TO postgres, anon, authenticated, service_role;

-- Clean up existing policies first
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload" ON storage.objects;
DROP POLICY IF EXISTS "Public upload" ON storage.objects;
DROP POLICY IF EXISTS "Enable read access for all users" ON storage.objects;
DROP POLICY IF EXISTS "games_images_public_read" ON storage.objects;
DROP POLICY IF EXISTS "games_images_auth_upload" ON storage.objects;
DROP POLICY IF EXISTS "games_images_public_upload" ON storage.objects;

-- Delete the bucket if it exists (to recreate with proper settings)
DELETE FROM storage.buckets WHERE id = 'games-images';

-- Create the storage bucket with proper configuration
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

-- Create comprehensive storage policies for games-images bucket
CREATE POLICY "games_images_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'games-images');

CREATE POLICY "games_images_authenticated_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'games-images' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "games_images_authenticated_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'games-images' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "games_images_authenticated_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'games-images' 
    AND auth.role() = 'authenticated'
  );

-- Grant proper permissions on storage tables
GRANT ALL ON storage.objects TO authenticated, anon;
GRANT ALL ON storage.buckets TO authenticated, anon;

-- ============================================================
-- 3. GAMES TABLE OPTIMIZATION
-- ============================================================

-- Ensure games table has all necessary columns with proper indexes
CREATE INDEX IF NOT EXISTS idx_games_created_at ON games(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_games_genre ON games(genre);
CREATE INDEX IF NOT EXISTS idx_games_title ON games(title);
CREATE INDEX IF NOT EXISTS idx_games_user_id ON games(user_id);

-- ============================================================
-- 4. PROFILES TABLE OPTIMIZATION  
-- ============================================================

-- Ensure profiles table is properly indexed
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- ============================================================
-- 5. ENABLE ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
DROP POLICY IF EXISTS "profiles_public_read" ON profiles;
CREATE POLICY "profiles_public_read" ON profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "profiles_own_update" ON profiles;
CREATE POLICY "profiles_own_update" ON profiles 
FOR UPDATE USING (auth.uid() = id);

-- Create RLS policies for games
DROP POLICY IF EXISTS "games_public_read" ON games;
CREATE POLICY "games_public_read" ON games FOR SELECT USING (true);

DROP POLICY IF EXISTS "games_auth_insert" ON games;
CREATE POLICY "games_auth_insert" ON games 
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "games_own_update" ON games;
CREATE POLICY "games_own_update" ON games 
FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================
-- 6. VERIFICATION AND CLEANUP
-- ============================================================

-- Verify bucket creation
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'games-images') THEN
    RAISE EXCEPTION 'Failed to create games-images bucket';
  END IF;
  RAISE NOTICE 'Storage bucket games-images created successfully';
END $$;

-- Update table statistics
ANALYZE profiles;
ANALYZE games; 