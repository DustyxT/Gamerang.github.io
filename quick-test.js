// QUICK TEST - Run this in browser console on http://localhost:3006/gamesubmit.html
console.log('🧪 QUICK SYSTEM TEST');

async function quickTest() {
    // Check if Supabase is loaded
    if (typeof window.supabase === 'undefined') {
        console.log('❌ Supabase not loaded - make sure you are on http://localhost:3006/gamesubmit.html');
        return;
    }
    
    console.log('✅ Supabase loaded');
    
    // Test storage bucket
    try {
        const { data: buckets, error } = await window.supabase.storage.listBuckets();
        if (error) {
            console.log('❌ Storage error:', error.message);
        } else {
            const gamesBucket = buckets.find(b => b.id === 'games-images');
            if (gamesBucket) {
                console.log('✅ Storage bucket found:', gamesBucket);
            } else {
                console.log('❌ games-images bucket not found');
            }
        }
    } catch (error) {
        console.log('❌ Storage test failed:', error.message);
    }
    
    // Test database schema
    try {
        const { data, error } = await window.supabase
            .from('games')
            .select('id, title, user_id')
            .limit(1);
            
        if (error) {
            console.log('❌ Database error:', error.message);
            if (error.message.includes('user_id')) {
                console.log('🔧 Need to run COMPLETE-SYSTEM-FIX.sql script');
            }
        } else {
            console.log('✅ Database schema correct!');
            console.log('   Sample data:', data);
        }
    } catch (error) {
        console.log('❌ Database test failed:', error.message);
    }
    
    console.log('🏁 Quick test complete!');
}

quickTest(); 