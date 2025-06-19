-- GAMERANG DATABASE CLEANUP SCRIPT
-- Phase 1.1: Resolve Conflicting RPC Functions
-- 
-- CRITICAL: This script fixes the conflicting get_thread_list functions
-- Frontend expects: page_number, page_size, p_sort_option, p_category_id_filter

-- Step 1: Check which functions exist
SELECT routine_name, specific_name 
FROM information_schema.routines 
WHERE routine_name = 'get_thread_list';

-- Step 2: Drop the OLD/CONFLICTING functions
-- We need to drop by specific signature since PostgreSQL allows function overloading

-- Drop Function 1 (uses p_category_filter - WRONG parameter name)
DROP FUNCTION IF EXISTS public.get_thread_list(
    page_number integer,
    page_size integer,
    p_sort_option text,
    p_category_filter text
);

-- Drop Function 3 (uses filter_category_id and search_term - DIFFERENT signature)
DROP FUNCTION IF EXISTS public.get_thread_list(
    page_number integer,
    page_size integer,
    filter_category_id uuid,
    search_term text
);

-- Function 2 is the CORRECT one that matches frontend:
-- get_thread_list(page_number, page_size, p_sort_option, p_category_id_filter)
-- This one should remain and work correctly.

-- Step 3: Verify only ONE function remains
SELECT routine_name, routine_type, 
       array_agg(parameter_name ORDER BY ordinal_position) as parameters
FROM information_schema.routines r
LEFT JOIN information_schema.parameters p ON r.specific_name = p.specific_name
WHERE routine_name = 'get_thread_list'
GROUP BY routine_name, routine_type;

-- Expected result: Only ONE get_thread_list function with parameters:
-- [page_number, page_size, p_sort_option, p_category_id_filter] 