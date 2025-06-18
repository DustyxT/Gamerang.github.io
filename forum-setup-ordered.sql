-- STEP 1: Create tables first (if they don't exist)
-- ================================================

-- Create profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create threads table
CREATE TABLE IF NOT EXISTS public.threads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    author_username TEXT NOT NULL,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    images TEXT[] DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    view_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    dislikes INTEGER DEFAULT 0,
    hearts INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create thread_replies table
CREATE TABLE IF NOT EXISTS public.thread_replies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    thread_id UUID REFERENCES public.threads(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    author_username TEXT NOT NULL,
    parent_id UUID REFERENCES public.thread_replies(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- STEP 2: Enable RLS
-- ==================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thread_replies ENABLE ROW LEVEL SECURITY;

-- STEP 3: Drop existing policies (now that tables exist)
-- ======================================================

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Threads are viewable by everyone" ON public.threads;
DROP POLICY IF EXISTS "Authenticated users can create threads" ON public.threads;
DROP POLICY IF EXISTS "Users can update own threads" ON public.threads;
DROP POLICY IF EXISTS "Users can delete own threads" ON public.threads;
DROP POLICY IF EXISTS "Thread replies are viewable by everyone" ON public.thread_replies;
DROP POLICY IF EXISTS "Authenticated users can create replies" ON public.thread_replies;
DROP POLICY IF EXISTS "Users can update own replies" ON public.thread_replies;
DROP POLICY IF EXISTS "Users can delete own replies" ON public.thread_replies;

-- STEP 4: Create new policies
-- ===========================

-- Policies for profiles
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Policies for threads
CREATE POLICY "Threads are viewable by everyone" ON public.threads
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create threads" ON public.threads
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own threads" ON public.threads
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own threads" ON public.threads
    FOR DELETE USING (auth.uid() = user_id);

-- Policies for thread_replies
CREATE POLICY "Thread replies are viewable by everyone" ON public.thread_replies
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create replies" ON public.thread_replies
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own replies" ON public.thread_replies
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own replies" ON public.thread_replies
    FOR DELETE USING (auth.uid() = user_id);

-- STEP 5: Create indexes
-- ======================

CREATE INDEX IF NOT EXISTS idx_threads_user_id ON public.threads(user_id);
CREATE INDEX IF NOT EXISTS idx_threads_category ON public.threads(category);
CREATE INDEX IF NOT EXISTS idx_threads_created_at ON public.threads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_thread_replies_thread_id ON public.thread_replies(thread_id);
CREATE INDEX IF NOT EXISTS idx_thread_replies_user_id ON public.thread_replies(user_id);

-- STEP 6: Create function and trigger
-- ===================================

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

-- STEP 7: Create storage bucket
-- =============================

INSERT INTO storage.buckets (id, name, public)
VALUES ('thread-images', 'thread-images', true)
ON CONFLICT (id) DO NOTHING;

-- STEP 8: Storage policies
-- ========================

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