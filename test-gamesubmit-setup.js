// Test script to verify gamesubmit setup
console.log('🔍 Testing Gamesubmit Setup...');

// Initialize Supabase
const supabaseUrl = 'https://pjlzzuoplxrftrqbhbfl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqbHp6dW9wbHhyZnRycWJoYmZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgzMTcwNjgsImV4cCI6MjA2Mzg5MzA2OH0.1U-dUVRY3qDPYsHEa0EttgKWpCRnlX3BS5SPE2qBExA';

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSetup() {
    try {
        console.log('1. Testing Supabase connection...');
        
        // Test auth status
        const { data: { session }, error: authError } = await supabase.auth.getSession();
        console.log('Auth status:', session ? 'Logged in' : 'Not logged in');
        
        // Test storage buckets
        console.log('2. Checking storage buckets...');
        const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
        if (bucketError) {
            console.error('Bucket error:', bucketError);
        } else {
            console.log('Available buckets:', buckets.map(b => b.id));
        }
        
        // Check if games table exists
        console.log('3. Checking games table...');
        const { data: games, error: tableError } = await supabase
            .from('games')
            .select('id')
            .limit(1);
            
        if (tableError) {
            console.error('Games table error:', tableError);
            if (tableError.message.includes('relation "public.games" does not exist')) {
                console.log('Games table does not exist. Creating it...');
                console.log('Please run this SQL in your Supabase SQL editor:');
                console.log(`
-- Create games table
CREATE TABLE IF NOT EXISTS public.games (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    genre TEXT NOT NULL,
    developer TEXT NOT NULL,
    publisher TEXT,
    release_date DATE NOT NULL,
    version TEXT NOT NULL,
    cover_image_url TEXT,
    screenshot_urls TEXT[],
    repack_size NUMERIC,
    repack_size_unit TEXT,
    original_size NUMERIC,
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

-- Enable RLS
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

-- Allow users to insert their own games
CREATE POLICY "Users can insert their own games" ON public.games
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to read all games
CREATE POLICY "Anyone can read games" ON public.games
    FOR SELECT USING (true);

-- Allow users to update their own games
CREATE POLICY "Users can update their own games" ON public.games
    FOR UPDATE USING (auth.uid() = user_id);
                `);
            }
        } else {
            console.log('✅ Games table exists and is accessible');
        }
        
        // Test storage bucket creation
        console.log('4. Testing storage bucket creation...');
        const { data: createBucket, error: createError } = await supabase.storage.createBucket('games-images', {
            public: true,
            allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
            fileSizeLimit: 52428800 // 50MB
        });
        
        if (createError && !createError.message.includes('already exists')) {
            console.error('Create bucket error:', createError);
        } else {
            console.log('✅ Storage bucket ready');
        }
        
        console.log('✅ Setup test complete!');
        
    } catch (error) {
        console.error('❌ Setup test failed:', error);
    }
}

// Run test
testSetup(); 