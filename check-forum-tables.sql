-- Check if tables exist
SELECT 
    table_name,
    CASE 
        WHEN table_name IN ('profiles', 'threads', 'thread_replies') THEN 'Forum Table'
        ELSE 'Other Table'
    END as table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'threads', 'thread_replies')
ORDER BY table_name;

-- Check existing policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'threads', 'thread_replies')
ORDER BY tablename, policyname;

-- Check if storage bucket exists
SELECT 
    id,
    name,
    public,
    created_at
FROM storage.buckets 
WHERE id = 'thread-images';

-- Check storage policies
SELECT 
    schemaname,
    tablename,
    policyname
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
AND policyname LIKE '%thread%'; 