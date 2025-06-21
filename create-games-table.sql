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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create storage bucket for game images if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('games-images', 'games-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy to allow authenticated users to upload
CREATE POLICY IF NOT EXISTS "Allow authenticated uploads to games-images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
    bucket_id = 'games-images' 
    AND auth.role() = 'authenticated'
);

-- Create storage policy to allow public reads
CREATE POLICY IF NOT EXISTS "Allow public reads from games-images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'games-images');

-- Create RLS policies for games table
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert games
CREATE POLICY IF NOT EXISTS "Allow authenticated users to insert games"
ON public.games
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Allow public to read all games
CREATE POLICY IF NOT EXISTS "Allow public to read games"
ON public.games
FOR SELECT
USING (true);

-- Allow users to update their own submissions
CREATE POLICY IF NOT EXISTS "Allow users to update own games"
ON public.games
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_games_title ON public.games(title);
CREATE INDEX IF NOT EXISTS idx_games_genre ON public.games(genre);
CREATE INDEX IF NOT EXISTS idx_games_developer ON public.games(developer);
CREATE INDEX IF NOT EXISTS idx_games_status ON public.games(status);
CREATE INDEX IF NOT EXISTS idx_games_created_at ON public.games(created_at);
CREATE INDEX IF NOT EXISTS idx_games_user_id ON public.games(user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER IF NOT EXISTS update_games_updated_at 
    BEFORE UPDATE ON public.games 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column(); 