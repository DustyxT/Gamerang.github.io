// COMPREHENSIVE SYSTEM TEST AFTER FIXES
// Run this in your browser console on the gamesubmit.html page

console.log('🧪 TESTING COMPLETE GAMERANG SYSTEM AFTER FIXES');

// Initialize Supabase client (same as in your app)
const supabaseUrl = 'https://pjlzzuoplxrftrqbhbfl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqbHp6dW9wbHhyZnRycWJoYmZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgzMTcwNjgsImV4cCI6MjA2Mzg5MzA2OH0.1U-dUVRY3qDPYsHEa0EttgKWpCRnlX3BS5SPE2qBExA';
const testSupabase = supabase.createClient(supabaseUrl, supabaseKey);

async function runCompleteSystemTest() {
    const testResults = {
        auth: false,
        storage: false,
        database: false,
        policies: false,
        fileUpload: false,
        gameSubmission: false
    };

    // Test 1: Authentication
    console.log('\n1️⃣ Testing Authentication...');
    try {
        const { data: { session }, error } = await testSupabase.auth.getSession();
        if (session) {
            console.log('✅ Authentication working!');
            console.log('   User ID:', session.user.id);
            testResults.auth = true;
        } else {
            console.log('⚠️ No active session - please login first');
        }
    } catch (error) {
        console.log('❌ Authentication failed:', error.message);
    }

    // Test 2: Storage Buckets
    console.log('\n2️⃣ Testing Storage Buckets...');
    try {
        const { data: buckets, error } = await testSupabase.storage.listBuckets();
        if (error) {
            console.log('❌ Storage failed:', error.message);
        } else {
            const gamesBucket = buckets.find(b => b.id === 'games-images');
            if (gamesBucket) {
                console.log('✅ Storage bucket exists!');
                console.log('   Bucket config:', gamesBucket);
                
                // Test bucket permissions
                const { data, error: permError } = await testSupabase.storage
                    .from('games-images')
                    .list('', { limit: 1 });
                
                if (permError) {
                    console.log('⚠️ Bucket permission issue:', permError.message);
                } else {
                    console.log('✅ Bucket permissions working!');
                    testResults.storage = true;
                }
            } else {
                console.log('❌ games-images bucket not found');
                console.log('Available buckets:', buckets.map(b => b.id));
            }
        }
    } catch (error) {
        console.log('❌ Storage test failed:', error.message);
    }

    // Test 3: Database Schema (check if user_id column exists)
    console.log('\n3️⃣ Testing Database Schema...');
    try {
        // Try to select with user_id column
        const { data, error } = await testSupabase
            .from('games')
            .select('id, title, user_id')
            .limit(1);
            
        if (error) {
            console.log('❌ Database schema issue:', error.message);
            if (error.message.includes('user_id')) {
                console.log('🔧 user_id column missing - run COMPLETE-SYSTEM-FIX.sql');
            }
        } else {
            console.log('✅ Database schema correct!');
            console.log('   Sample game data:', data);
            testResults.database = true;
        }
    } catch (error) {
        console.log('❌ Database test failed:', error.message);
    }

    // Test 4: Storage Policies
    console.log('\n4️⃣ Testing Storage Policies...');
    try {
        // Test read access (should work for anyone)
        const { data: publicRead, error: readError } = await testSupabase.storage
            .from('games-images')
            .list('covers', { limit: 1 });
            
        if (readError) {
            console.log('❌ Public read policy not working:', readError.message);
        } else {
            console.log('✅ Public read policy working!');
            testResults.policies = true;
        }
    } catch (error) {
        console.log('❌ Policy test failed:', error.message);
    }

    // Test 5: File Upload Simulation (if authenticated)
    if (testResults.auth && testResults.storage) {
        console.log('\n5️⃣ Testing File Upload Simulation...');
        try {
            // Create a small test file
            const testFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
            const testPath = `test/${Date.now()}-test.txt`;
            
            const { data: uploadData, error: uploadError } = await testSupabase.storage
                .from('games-images')
                .upload(testPath, testFile);
                
            if (uploadError) {
                console.log('❌ File upload failed:', uploadError.message);
            } else {
                console.log('✅ File upload working!');
                console.log('   Uploaded to:', testPath);
                
                // Clean up test file
                await testSupabase.storage
                    .from('games-images')
                    .remove([testPath]);
                console.log('   Test file cleaned up');
                
                testResults.fileUpload = true;
            }
        } catch (error) {
            console.log('❌ File upload test failed:', error.message);
        }
    }

    // Test 6: Game Submission API
    if (testResults.auth && testResults.database) {
        console.log('\n6️⃣ Testing Game Submission API...');
        try {
            const testGameData = {
                title: 'Test Game - Fix Verification',
                description: 'This is a test game to verify the fixes work',
                genre: 'Test',
                developer: 'Test Developer',
                release_date: '2023-01-01',
                version: '1.0.0',
                cover_image_url: 'https://example.com/test.jpg',
                repack_size: 1.0,
                repack_size_unit: 'GB',
                repack_features: 'Test features',
                user_id: (await testSupabase.auth.getSession()).data.session.user.id
            };

            const response = await fetch('/api/submit-game', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(testGameData)
            });

            const result = await response.json();

            if (response.ok && result.success) {
                console.log('✅ Game submission API working!');
                console.log('   Game created:', result.game);
                testResults.gameSubmission = true;
                
                // Clean up test game
                await testSupabase
                    .from('games')
                    .delete()
                    .eq('id', result.game.id);
                console.log('   Test game cleaned up');
            } else {
                console.log('❌ Game submission failed:', result.message);
            }
        } catch (error) {
            console.log('❌ Game submission test failed:', error.message);
        }
    }

    // Final Results
    console.log('\n🏁 TEST RESULTS SUMMARY:');
    console.log('========================');
    Object.entries(testResults).forEach(([test, passed]) => {
        console.log(`${passed ? '✅' : '❌'} ${test.toUpperCase()}: ${passed ? 'PASSED' : 'FAILED'}`);
    });

    const totalTests = Object.keys(testResults).length;
    const passedTests = Object.values(testResults).filter(Boolean).length;
    
    console.log(`\n📊 OVERALL: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
        console.log('🎉 ALL SYSTEMS WORKING! Your Gamerang site is fully functional!');
    } else {
        console.log('⚠️ Some issues remain. Please run COMPLETE-SYSTEM-FIX.sql script.');
    }
    
    return testResults;
}

// Run the test
runCompleteSystemTest(); 