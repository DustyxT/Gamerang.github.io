/**
 * Upload Poster Image to Supabase
 * 
 * This script uploads the generated poster image to Supabase storage.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Supabase configuration
const supabaseUrl = 'https://pjlzzuoplxrftrqbhbfl.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || process.argv[2];

if (!supabaseKey) {
  console.error('Error: Supabase key not provided.');
  console.log('Usage: node upload-poster.js <supabase-key>');
  console.log('   or: set SUPABASE_KEY in .env file');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Path to the poster image
const posterPath = path.join(__dirname, 'temp', 'poster.jpg');

// Check if poster image exists
if (!fs.existsSync(posterPath)) {
  console.error('Error: Poster image not found.');
  console.log('Please run generate-poster.js first to create the poster image.');
  process.exit(1);
}

// Upload poster image to Supabase
async function uploadPoster() {
  try {
    console.log('Uploading poster image to Supabase...');
    
    const fileContent = fs.readFileSync(posterPath);
    
    const { data, error } = await supabase.storage
      .from('background-video-forum-page')
      .upload('poster.jpg', fileContent, {
        contentType: 'image/jpeg',
        upsert: true
      });
    
    if (error) {
      throw error;
    }
    
    console.log('Poster image uploaded successfully!');
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('background-video-forum-page')
      .getPublicUrl('poster.jpg');
    
    console.log('Public URL:', publicUrl);
    console.log('Update your code to use this URL for the poster image.');
    
  } catch (error) {
    console.error('Error uploading poster image:', error);
  }
}

uploadPoster(); 