-- Create games table for game submissions
CREATE TABLE IF NOT EXISTS public.games (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    genre TEXT NOT NULL,
    developer TEXT NOT NULL,
    publisher TEXT,
    release_date DATE NOT NULL,
    version TEXT NOT NULL,
    cover_image_url TEXT,
    screenshot_urls TEXT[],
    repack_size DECIMAL,
    repack_size_unit TEXT DEFAULT 'GB',
    original_size DECIMAL,
    original_size_unit TEXT,
    compression_ratio TEXT,
    repack_features TEXT NOT NULL,
    installation_notes TEXT,
    system_requirements JSONB,
    download_links JSONB,
    user_id UUID REFERENCES auth.users(id),
    submitted_by TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (Row Level Security)
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can insert their own games" ON public.games
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view all games" ON public.games
    FOR SELECT USING (true);

CREATE POLICY "Users can update their own games" ON public.games
    FOR UPDATE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS games_user_id_idx ON public.games(user_id);
CREATE INDEX IF NOT EXISTS games_status_idx ON public.games(status);
CREATE INDEX IF NOT EXISTS games_created_at_idx ON public.games(created_at);

-- Grant permissions
GRANT ALL ON public.games TO authenticated;
GRANT USAGE ON SEQUENCE public.games_id_seq TO authenticated; 