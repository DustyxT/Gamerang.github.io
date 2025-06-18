-- STEP 2: Enable RLS and Create Policies
-- Run this AFTER step 1 completes successfully

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thread_replies ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies first
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

-- Create policies for profiles
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Create policies for threads
CREATE POLICY "Threads are viewable by everyone" ON public.threads
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create threads" ON public.threads
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own threads" ON public.threads
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own threads" ON public.threads
    FOR DELETE USING (auth.uid() = user_id);

-- Create policies for thread_replies
CREATE POLICY "Thread replies are viewable by everyone" ON public.thread_replies
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create replies" ON public.thread_replies
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own replies" ON public.thread_replies
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own replies" ON public.thread_replies
    FOR DELETE USING (auth.uid() = user_id); 