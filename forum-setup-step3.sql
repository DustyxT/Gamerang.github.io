-- STEP 3: Create Indexes, Functions, Triggers and Storage
-- Run this AFTER step 2 completes successfully

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_threads_user_id ON public.threads(user_id);
CREATE INDEX IF NOT EXISTS idx_threads_category ON public.threads(category);
CREATE INDEX IF NOT EXISTS idx_threads_created_at ON public.threads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_thread_replies_thread_id ON public.thread_replies(thread_id);
CREATE INDEX IF NOT EXISTS idx_thread_replies_user_id ON public.thread_replies(user_id);

-- Create or replace function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username, email)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'username', new.email),
        new.email
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create storage bucket for thread images
INSERT INTO storage.buckets (id, name, public)
VALUES ('thread-images', 'thread-images', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies
DROP POLICY IF EXISTS "Thread images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload thread images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own thread images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own thread images" ON storage.objects;

-- Create new storage policies
CREATE POLICY "Thread images are publicly accessible" ON storage.objects
    FOR SELECT USING (bucket_id = 'thread-images');

CREATE POLICY "Authenticated users can upload thread images" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'thread-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update own thread images" ON storage.objects
    FOR UPDATE USING (bucket_id = 'thread-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own thread images" ON storage.objects
    FOR DELETE USING (bucket_id = 'thread-images' AND auth.uid()::text = (storage.foldername(name))[1]); 