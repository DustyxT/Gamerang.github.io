-- Drop existing policies if they exist (to avoid conflicts)
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
DROP POLICY IF EXISTS "Thread images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload thread images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own thread images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own thread images" ON storage.objects;

-- Create profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    last_seen TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Add Indexes for profiles table
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(LOWER(username));
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen ON public.profiles(last_seen DESC NULLS LAST);

-- Explicitly add last_seen column if it wasn't created by the above
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW());

-- Create threads table
CREATE TABLE IF NOT EXISTS public.threads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    author_username TEXT NOT NULL,
    category UUID REFERENCES public.forum_categories(id),
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_threads_user_id ON public.threads(user_id);
CREATE INDEX IF NOT EXISTS idx_threads_category ON public.threads(category);
CREATE INDEX IF NOT EXISTS idx_threads_created_at ON public.threads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_threads_comment_count ON public.threads(comment_count DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_threads_view_count ON public.threads(view_count DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_thread_replies_thread_id ON public.thread_replies(thread_id);
CREATE INDEX IF NOT EXISTS idx_thread_replies_user_id ON public.thread_replies(user_id);
CREATE INDEX IF NOT EXISTS idx_thread_replies_created_at ON public.thread_replies(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thread_replies ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Create RLS policies for threads
CREATE POLICY "Threads are viewable by everyone" ON public.threads
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create threads" ON public.threads
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own threads" ON public.threads
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own threads" ON public.threads
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for thread_replies
CREATE POLICY "Thread replies are viewable by everyone" ON public.thread_replies
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create replies" ON public.thread_replies
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own replies" ON public.thread_replies
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own replies" ON public.thread_replies
    FOR DELETE USING (auth.uid() = user_id);

-- Create or replace function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create storage bucket for thread images (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('thread-images', 'thread-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies
CREATE POLICY "Thread images are publicly accessible" ON storage.objects
    FOR SELECT USING (bucket_id = 'thread-images');

CREATE POLICY "Authenticated users can upload thread images" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (bucket_id = 'thread-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update own thread images" ON storage.objects
    FOR UPDATE TO authenticated USING (bucket_id = 'thread-images' AND auth.uid()::text = (storage.foldername(name))[1])
    WITH CHECK (bucket_id = 'thread-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own thread images" ON storage.objects
    FOR DELETE TO authenticated USING (bucket_id = 'thread-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =====================================================================================
-- GAMES TABLE (Required by get_popular_games function)
-- =====================================================================================
CREATE TABLE IF NOT EXISTS public.games (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id), -- Optional: if games are user-submitted
    title TEXT NOT NULL,
    description TEXT,
    cover_image_url TEXT,
    genre TEXT,
    release_date DATE,
    developer TEXT,
    publisher TEXT,
    platform TEXT,
    rating NUMERIC(2,1), -- e.g., 4.5
    view_count INTEGER DEFAULT 0,
    download_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Indexes for games table (basic)
CREATE INDEX IF NOT EXISTS idx_games_title ON public.games(title);
CREATE INDEX IF NOT EXISTS idx_games_created_at ON public.games(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_games_genre ON public.games(genre);


-- RLS for games table (basic example - adjust as needed)
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view games" ON public.games;
CREATE POLICY "Public can view games" ON public.games
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert games" ON public.games;
CREATE POLICY "Authenticated users can insert games" ON public.games
    FOR INSERT TO authenticated WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update their own games" ON public.games;
CREATE POLICY "Users can update their own games" ON public.games
    FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own games" ON public.games;
CREATE POLICY "Users can delete their own games" ON public.games
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Grant usage on public schema to authenticated role
GRANT USAGE ON SCHEMA public TO authenticated;

-- =====================================================================================
-- RPC FUNCTIONS
-- =====================================================================================

-- Function to check if a username is available
DROP FUNCTION IF EXISTS public.check_username_available(TEXT);
CREATE OR REPLACE FUNCTION public.check_username_available(input_username TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY INVOKER
AS $$
BEGIN
    RETURN NOT EXISTS (
        SELECT 1 
        FROM public.profiles 
        WHERE LOWER(username) = LOWER(input_username)
    );
END;
$$;
GRANT EXECUTE ON FUNCTION public.check_username_available(TEXT) TO authenticated, anon;

-- Restore full get_thread_list function
DROP FUNCTION IF EXISTS public.get_thread_list(INTEGER, INTEGER, TEXT, UUID);
CREATE OR REPLACE FUNCTION public.get_thread_list(
    page_number INTEGER DEFAULT 1,
    page_size INTEGER DEFAULT 10,
    p_sort_option TEXT DEFAULT 'newest',
    p_category_id_filter UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID, user_id UUID, author_username TEXT, category_id UUID, category_name TEXT, title TEXT, content TEXT,
    images TEXT[], tags TEXT[], view_count INTEGER, comment_count INTEGER, likes INTEGER, dislikes INTEGER, hearts INTEGER,
    created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ, total_threads BIGINT, total_pages BIGINT, is_pinned BOOLEAN, is_locked BOOLEAN
)
LANGUAGE plpgsql STABLE SECURITY INVOKER
AS $$
DECLARE
    offset_val INTEGER;
    v_total_threads BIGINT;
    query_conditions TEXT := '';
    order_by_clause TEXT;
    final_query TEXT;
    count_query TEXT;
BEGIN
    offset_val := (page_number - 1) * page_size;

    -- Build WHERE clause conditions
    IF p_category_id_filter IS NOT NULL THEN
        query_conditions := format(' WHERE t.category = %L::UUID ', p_category_id_filter);
    END IF;

    -- Count total threads with the same conditions
    count_query := 'SELECT COUNT(*) FROM public.threads t' || query_conditions;
    EXECUTE count_query INTO v_total_threads;

    -- Sorting
    CASE p_sort_option
        WHEN 'most_comments' THEN order_by_clause := ' ORDER BY t.comment_count DESC, t.created_at DESC ';
        WHEN 'most_views' THEN order_by_clause := ' ORDER BY t.view_count DESC, t.created_at DESC ';
        ELSE order_by_clause := ' ORDER BY t.created_at DESC '; -- Default to newest
    END CASE;

    final_query := format(
        'SELECT 
            t.id, t.user_id, t.author_username, 
            t.category AS category_id, 
            fc.name AS category_name,
            t.title, t.content, t.images, t.tags, 
            t.view_count, t.comment_count, t.likes, t.dislikes, t.hearts, 
            t.created_at, t.updated_at,
            %L::BIGINT AS total_threads,
            CEIL(CASE WHEN %L::BIGINT = 0 THEN 0 ELSE %L::NUMERIC / GREATEST(%L::NUMERIC, 1) END)::BIGINT AS total_pages,
            COALESCE(t.is_pinned, FALSE) AS is_pinned,
            COALESCE(t.is_locked, FALSE) AS is_locked
        FROM public.threads t
        LEFT JOIN public.forum_categories fc ON t.category = fc.id ' 
        || query_conditions 
        || order_by_clause  
        || 'LIMIT %L OFFSET %L', 
        v_total_threads, 
        v_total_threads, v_total_threads, page_size, 
        page_size, offset_val 
    );
    
    -- RAISE NOTICE 'Final Query for get_thread_list: %', final_query;
    RETURN QUERY EXECUTE final_query;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in get_thread_list: %', SQLERRM;
        RAISE NOTICE 'SQLSTATE: %', SQLSTATE;
        RAISE NOTICE 'Query attempted: %', final_query;
        RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_thread_list(INTEGER, INTEGER, TEXT, UUID) TO authenticated;

/* -- Original get_thread_list and its DROP function are commented out below for this test
DROP FUNCTION IF EXISTS public.get_thread_list(INTEGER, INTEGER, TEXT, UUID);
CREATE OR REPLACE FUNCTION public.get_thread_list(
    page_number INTEGER DEFAULT 1,
// ... (rest of the original complex get_thread_list function is commented out) ...
END;
$$;
*/

-- Function to get recently active users
DROP FUNCTION IF EXISTS public.get_recently_active_users(INTEGER);
CREATE OR REPLACE FUNCTION public.get_recently_active_users(p_limit INTEGER DEFAULT 5)
RETURNS TABLE(active_username TEXT, active_avatar_url TEXT, is_online BOOLEAN, last_seen_timestamp TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.username AS active_username,
        p.avatar_url AS active_avatar_url,
        (p.last_seen > NOW() - INTERVAL '5 minutes') AS is_online,
        p.last_seen AS last_seen_timestamp
    FROM public.profiles p
    ORDER BY p.last_seen DESC NULLS LAST
    LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_recently_active_users(INTEGER) TO authenticated;

-- Function to get top contributors
-- Contribution score: 2 points per thread, 1 point per reply
DROP FUNCTION IF EXISTS public.get_top_contributors(INTEGER);
CREATE OR REPLACE FUNCTION public.get_top_contributors(p_limit INTEGER DEFAULT 5)
RETURNS TABLE(
    contributor_user_id UUID, 
    contributor_username TEXT, 
    contributor_avatar_url TEXT, 
    contribution_score BIGINT
)
LANGUAGE sql STABLE SECURITY INVOKER
AS $$
    WITH user_contributions AS (
        SELECT 
            p.id AS user_id, 
            (COUNT(DISTINCT t.id) * 2)::BIGINT AS thread_points, -- Explicitly cast to BIGINT
            (COUNT(DISTINCT tr.id) * 1)::BIGINT AS reply_points   -- Explicitly cast to BIGINT
        FROM public.profiles p
        LEFT JOIN public.threads t ON p.id = t.user_id
        LEFT JOIN public.thread_replies tr ON p.id = tr.user_id
        GROUP BY p.id
    )
    SELECT 
        p.id AS contributor_user_id,
        p.username AS contributor_username,
        p.avatar_url AS contributor_avatar_url,
        (COALESCE(uc.thread_points, 0) + COALESCE(uc.reply_points, 0))::BIGINT AS contribution_score
    FROM public.profiles p
    LEFT JOIN user_contributions uc ON p.id = uc.user_id -- Use LEFT JOIN here
    ORDER BY contribution_score DESC, p.username ASC -- Added secondary sort for consistent ordering
    LIMIT p_limit;
$$;

-- Function to get forum statistics
DROP FUNCTION IF EXISTS public.get_forum_stats();
CREATE OR REPLACE FUNCTION public.get_forum_stats()
RETURNS TABLE(total_threads BIGINT, total_replies BIGINT, total_users BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER -- Changed to SECURITY DEFINER
AS $$
    SELECT
        (SELECT COUNT(*) FROM public.threads) AS total_threads,
        (SELECT COUNT(*) FROM public.thread_replies) AS total_replies,
        (SELECT COUNT(*) FROM public.profiles) AS total_users; -- Count from profiles for safety
$$;

/* -- Function get_trending_tags removed as the UI component was removed
DROP FUNCTION IF EXISTS public.get_trending_tags(INTEGER);
CREATE OR REPLACE FUNCTION public.get_trending_tags(p_limit INTEGER DEFAULT 10) 
RETURNS TABLE(tag_name TEXT, tag_count BIGINT) 
LANGUAGE sql STABLE SECURITY INVOKER
AS $$
    SELECT 
        t.tag AS tag_name, 
        COUNT(t.tag) AS tag_count 
    FROM (SELECT unnest(tags) AS tag FROM public.threads) t 
    WHERE t.tag IS NOT NULL AND t.tag <> ''
    GROUP BY t.tag 
    ORDER BY tag_count DESC 
    LIMIT p_limit; 
$$;
*/

-- Function to get popular games (placeholder for actual popularity logic)
-- Assumes a 'games' table exists with id, title, and cover_image_url
DROP FUNCTION IF EXISTS public.get_popular_games(INTEGER);
CREATE OR REPLACE FUNCTION public.get_popular_games(p_limit INTEGER DEFAULT 4)
RETURNS TABLE(game_id UUID, game_name TEXT, game_image_url TEXT)
LANGUAGE sql STABLE SECURITY INVOKER
AS $$
    SELECT 
        g.id AS game_id,
        g.title AS game_name,       -- Assuming 'title' is the column for game name
        g.cover_image_url AS game_image_url -- Assuming 'cover_image_url'
    FROM public.games g  -- Make sure this 'games' table exists and has these columns
    -- Add actual popularity logic here, e.g., ORDER BY g.view_count DESC, g.downloads DESC
    ORDER BY g.created_at DESC -- Placeholder: newest games as "popular"
    LIMIT p_limit;
$$;

-- Trigger to update last_seen on profile update
CREATE OR REPLACE FUNCTION public.update_profile_last_seen()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY INVOKER
AS $$
BEGIN
    NEW.last_seen = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_updated ON public.profiles;
CREATE TRIGGER on_profile_updated
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_profile_last_seen();

-- Grant execute permission on new functions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_recently_active_users(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_top_contributors(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_forum_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_popular_games(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_thread_list(INTEGER, INTEGER, TEXT, UUID) TO authenticated;

-- Explicit SELECT grants for tables used in get_forum_stats and other functions
GRANT SELECT ON TABLE public.profiles TO authenticated;
GRANT SELECT ON TABLE public.threads TO authenticated;
GRANT SELECT ON TABLE public.thread_replies TO authenticated;
GRANT SELECT ON TABLE public.games TO authenticated; -- For get_popular_games 