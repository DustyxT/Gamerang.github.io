const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pjlzzuoplxrftrqbhbfl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqbHp6dW9wbHhyZnFycWJoYmZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgzMTcwNjgsImV4cCI6MjA2Mzg5MzA2OH0.1U-dUVRY3qDPYsHEa0EttgKWpCRnlX3BS5SPE2qBExA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCompleteSetup() {
    console.log('🧪 TESTING COMPLETE SETUP');
    console.log('==========================\n');
    
    let testResults = {
        authentication: false,
        storage: false,
        gameSubmission: false,
        database: false
    };

    // Test 1: Authentication
    console.log('1️⃣ Testing Authentication...');
    try {
        const testEmail = `test-complete-${Date.now()}@example.com`;
        const { data, error } = await supabase.auth.signUp({
            email: testEmail,
            password: 'testpass123'
        });

        if (error) {
            console.log('❌ Auth failed:', error.message);
        } else {
            console.log('✅ Authentication working!');
            testResults.authentication = true;
            if (data.user) {
                console.log('   User created:', data.user.id);
            }
        }
    } catch (error) {
        console.log('❌ Auth test failed:', error.message);
    }

    // Test 2: Storage Bucket
    console.log('\n2️⃣ Testing Storage Bucket...');
    try {
        const { data: buckets, error } = await supabase.storage.listBuckets();
        if (error) {
            console.log('❌ Storage failed:', error.message);
        } else {
            const gamesBucket = buckets.find(b => b.name === 'games-images');
            if (gamesBucket) {
                console.log('✅ Storage bucket exists!');
                console.log('   Bucket config:', gamesBucket);
                testResults.storage = true;
            } else {
                console.log('❌ games-images bucket not found');
            }
        }
    } catch (error) {
        console.log('❌ Storage test failed:', error.message);
    }

    // Test 3: Database Connection
    console.log('\n3️⃣ Testing Database Connection...');
    try {
        const { data, error } = await supabase.from('games').select('count').limit(1);
        if (error) {
            console.log('❌ Database failed:', error.message);
        } else {
            console.log('✅ Database connection working!');
            testResults.database = true;
        }
    } catch (error) {
        console.log('❌ Database test failed:', error.message);
    }

    // Test 4: Game Submission API
    console.log('\n4️⃣ Testing Game Submission API...');
    try {
        const testGame = {
            title: 'Complete Test Game',
            description: 'Test after complete setup',
            genre: 'Test',
            developer: 'Test Dev',
            release_date: '2024-01-01',
            version: '1.0',
            cover_image_url: 'https://example.com/cover.jpg',
            repack_size: 5.5,
            repack_size_unit: 'GB',
            repack_features: 'Test features'
        };

        const response = await fetch('http://localhost:3006/api/submit-game', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testGame)
        });

        if (response.ok) {
            console.log('✅ Game submission API working!');
            testResults.gameSubmission = true;
            const result = await response.json();
            console.log('   Game ID:', result.game?.id);
        } else {
            console.log('❌ Game submission failed:', response.status);
        }
    } catch (error) {
        console.log('❌ Game submission test failed:', error.message);
    }

    // Final Results
    console.log('\n🎯 FINAL RESULTS:');
    console.log('==================');
    console.log(`Authentication: ${testResults.authentication ? '✅' : '❌'}`);
    console.log(`Storage Bucket: ${testResults.storage ? '✅' : '❌'}`);
    console.log(`Database: ${testResults.database ? '✅' : '❌'}`);
    console.log(`Game Submission: ${testResults.gameSubmission ? '✅' : '❌'}`);
    
    const totalTests = Object.keys(testResults).length;
    const passedTests = Object.values(testResults).filter(Boolean).length;
    
    console.log(`\n📊 SCORE: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
        console.log('🎉 ALL SYSTEMS FUNCTIONAL! Your website is ready!');
    } else {
        console.log('⚠️  Some issues remain. Check the failed tests above.');
    }
}

testCompleteSetup().catch(console.error); 