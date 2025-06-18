-- WARNING: This will delete all forum data! 
-- Only run this if you want to start fresh

-- Drop all policies first
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

-- Drop storage policies
DROP POLICY IF EXISTS "Thread images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload thread images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own thread images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own thread images" ON storage.objects;

-- Drop trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop function
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Drop tables (CASCADE will drop dependent objects)
DROP TABLE IF EXISTS public.thread_replies CASCADE;
DROP TABLE IF EXISTS public.threads CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Note: Storage bucket cannot be dropped via SQL, must be done via Dashboard 