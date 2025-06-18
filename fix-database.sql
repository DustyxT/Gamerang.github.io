-- Fix authentication trigger for user signup
-- Run this in your Supabase Dashboard SQL Editor

-- 1. Drop the existing problematic trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Create a new, safer function
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

-- 3. Create the trigger again
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 4. Create storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('games-images', 'games-images', true, 52428800, '{"image/*"}')
ON CONFLICT (id) DO NOTHING;

-- 5. Drop existing policies if they exist
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload" ON storage.objects;

-- 6. Set up storage policies
CREATE POLICY "Public read access" ON storage.objects 
FOR SELECT USING (bucket_id = 'games-images');

CREATE POLICY "Authenticated upload" ON storage.objects 
FOR INSERT WITH CHECK (bucket_id = 'games-images' AND auth.role() = 'authenticated'); 