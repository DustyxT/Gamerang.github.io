// Script to create or update a user as an admin
// Run with: node create-admin-user.js <email>

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://pjlzzuoplxrftrqbhbfl.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY; // This must be a service key with full access

if (!supabaseKey) {
  console.error('Error: SUPABASE_SERVICE_KEY environment variable is required');
  console.log('Create a .env file with your service key or pass it as an environment variable');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function makeUserAdmin(email) {
  if (!email) {
    console.error('Error: Email is required');
    console.log('Usage: node create-admin-user.js <email>');
    process.exit(1);
  }

  try {
    console.log(`Looking for user with email: ${email}`);
    
    // First, find the user by email
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('email', email)
      .single();

    if (userError) {
      console.error('Error finding user:', userError.message);
      return;
    }

    if (!userData) {
      console.error(`No user found with email: ${email}`);
      return;
    }

    console.log('User found:', userData);

    // Update the user's role to admin
    const { data: updateData, error: updateError } = await supabase
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', userData.id)
      .select();

    if (updateError) {
      console.error('Error updating user role:', updateError.message);
      return;
    }

    console.log(`User ${email} has been made an admin successfully!`);
    console.log('Updated user:', updateData);

  } catch (error) {
    console.error('Unexpected error:', error.message);
  }
}

// Get email from command line arguments
const email = process.argv[2];
makeUserAdmin(email); 