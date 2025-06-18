import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Production configuration
const supabaseUrl = 'https://pjlzzuoplxrftrqbhbfl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqbHp6dW9wbHhyZnRycWJoYmZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgzMTcwNjgsImV4cCI6MjA2Mzg5MzA2OH0.1U-dUVRY3qDPYsHEa0EttgKWpCRnlX3BS5SPE2qBExA';

// Initialize Supabase client with additional options
const supabaseClient = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
    }
});

// Make Supabase available globally for non-module scripts
if (typeof window !== 'undefined') {
    window.supabase = supabaseClient;
}

// Export both names for backward compatibility
export { supabaseClient };
export { supabaseClient as supabase };
export default supabaseClient; 