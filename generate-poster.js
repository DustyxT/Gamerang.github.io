/**
 * Generate Poster Image for Video Background
 * 
 * This script creates a poster image from the video background
 * to improve initial loading performance.
 * 
 * Requires ffmpeg to be installed or offers a browser-based alternative.
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

// URL of the video
const videoUrl = 'https://pjlzzuoplxrftrqbhbfl.supabase.co/storage/v1/object/public/background-video-forum-page/Background_vid_forumpg.mp4';

// Create temp directory if it doesn't exist
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Output paths
const videoPath = path.join(tempDir, 'video.mp4');
const posterPath = path.join(tempDir, 'poster.jpg');

// Check if ffmpeg is installed
function checkFfmpeg() {
  return new Promise((resolve) => {
    exec('ffmpeg -version', (error) => {
      resolve(!error);
    });
  });
}

// Create a browser-based poster capture tool
function createBrowserCaptureTool() {
  const htmlPath = path.join(tempDir, 'capture-poster.html');
  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <title>Create Video Poster</title>
    <style>
      body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
      video { width: 100%; max-height: 400px; }
      button { padding: 10px 20px; background: #0066cc; color: white; border: none; cursor: pointer; }
      canvas { display: none; }
      .instructions { background: #f0f0f0; padding: 15px; border-radius: 5px; margin: 20px 0; }
    </style>
  </head>
  <body>
    <h1>Create Video Poster Image</h1>
    <div class="instructions">
      <h3>Instructions:</h3>
      <ol>
        <li>Play the video below</li>
        <li>Pause at a frame you want to use as poster</li>
        <li>Click "Capture Frame as Poster"</li>
        <li>The image will be downloaded as "poster.jpg"</li>
        <li>Move the downloaded image to the "temp" folder in your project</li>
      </ol>
    </div>
    <video id="video" controls>
      <source src="video.mp4" type="video/mp4">
      Your browser does not support the video tag.
    </video>
    <div style="margin: 20px 0;">
      <button id="captureBtn">Capture Frame as Poster</button>
    </div>
    <canvas id="canvas"></canvas>
    <script>
      const video = document.getElementById('video');
      const canvas = document.getElementById('canvas');
      const captureBtn = document.getElementById('captureBtn');
      
      captureBtn.addEventListener('click', () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const link = document.createElement('a');
        link.download = 'poster.jpg';
        link.href = canvas.toDataURL('image/jpeg', 0.8);
        link.click();
        
        alert('Poster image downloaded! Move it to the "temp" folder in your project.');
      });
    </script>
  </body>
  </html>
  `;
  
  fs.writeFileSync(htmlPath, html);
  console.log(`\nCreated HTML file to manually capture poster image: ${htmlPath}`);
  console.log('Open this file in a browser after the video downloads, play the video, and click "Capture Frame as Poster"');
}

// Download the video using Node.js native https
function downloadVideo() {
  return new Promise((resolve, reject) => {
    console.log('Downloading video...');
    
    const file = fs.createWriteStream(videoPath);
    https.get(videoUrl, (response) => {
      // Check if the request was successful
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download video: ${response.statusCode}`));
        return;
      }
      
      // Get the total size for progress calculation
      const totalSize = parseInt(response.headers['content-length'], 10);
      let downloadedSize = 0;
      
      // Show download progress
      response.on('data', (chunk) => {
        downloadedSize += chunk.length;
        const percent = Math.round((downloadedSize / totalSize) * 100);
        process.stdout.write(`\rDownloading: ${percent}%`);
      });
      
      // Pipe the response to the file
      response.pipe(file);
      
      // When the download is complete
      file.on('finish', () => {
        process.stdout.write('\rDownload complete!      \n');
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(videoPath, () => {}); // Delete the file on error
      reject(err);
    });
  });
}

// Main function
async function main() {
  try {
    // Download the video
    await downloadVideo();
    console.log('Video downloaded successfully.');
    
    // Check if FFmpeg is installed
    const hasFfmpeg = await checkFfmpeg();
    
    if (hasFfmpeg) {
      console.log('Generating poster image with FFmpeg...');
      
      // Generate poster image using ffmpeg
      exec(`ffmpeg -i "${videoPath}" -ss 00:00:01 -vframes 1 -q:v 2 "${posterPath}"`, (ffmpegError) => {
        if (ffmpegError) {
          console.error('Error generating poster image with FFmpeg:', ffmpegError);
          console.log('Falling back to browser-based solution...');
          createBrowserCaptureTool();
        } else {
          console.log(`Poster image saved to: ${posterPath}`);
          console.log('Now you can upload this poster image to your Supabase storage bucket.');
        }
      });
    } else {
      console.log('FFmpeg is not installed. Using browser-based solution instead.');
      createBrowserCaptureTool();
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

main(); 