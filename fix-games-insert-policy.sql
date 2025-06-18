-- FIX GAMES INSERT POLICY
-- This fixes the RLS policy that's preventing game submissions from the server
-- Run this in your Supabase SQL Editor

-- ============================================================
-- 1. FIX THE INSERT POLICY FOR GAMES
-- ============================================================

-- Drop the problematic policy
DROP POLICY IF EXISTS "games_authenticated_insert" ON games;

-- Create a new policy that allows both authenticated users and server-side inserts
CREATE POLICY "games_insert_policy" ON games 
FOR INSERT WITH CHECK (
  -- Allow if user is authenticated OR if this is a server-side insert with user_id
  auth.role() = 'authenticated' 
  OR (auth.role() = 'anon' AND user_id IS NOT NULL)
);

-- ============================================================
-- 2. VERIFICATION
-- ============================================================

-- Check the new policy
SELECT policyname, schemaname, tablename, cmd, with_check
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'games' AND cmd = 'INSERT';

-- ============================================================
-- 3. SUCCESS MESSAGE
-- ============================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'games' 
    AND policyname = 'games_insert_policy'
    AND cmd = 'INSERT'
  ) THEN
    RAISE NOTICE '✅ SUCCESS: Games insert policy fixed!';
    RAISE NOTICE 'Server-side game submissions should now work.';
  ELSE
    RAISE EXCEPTION '❌ FAILED: Games insert policy not created properly';
  END IF;
END $$; 