/**
 * Video Optimizer for Gamerang
 * 
 * This script helps optimize background videos for better performance.
 * It requires ffmpeg to be installed on your system.
 * 
 * Usage:
 * node video-optimizer.js <input-video-path>
 * 
 * Note: The current optimized video is 'Background_vid_forumpg.mp4' in the Supabase storage bucket.
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');

// Check if ffmpeg is installed
function checkFfmpeg() {
  return new Promise((resolve) => {
    exec('ffmpeg -version', (error) => {
      resolve(!error);
    });
  });
}

// Get input file from command line args
const inputFile = process.argv[2];

if (!inputFile) {
  console.error('Please provide an input video file path');
  console.log('Usage: node video-optimizer.js <input-video-path>');
  process.exit(1);
}

// Check if file exists
if (!fs.existsSync(inputFile)) {
  console.error(`File not found: ${inputFile}`);
  process.exit(1);
}

// Parse file details
const fileInfo = path.parse(inputFile);
const outputDir = path.join(fileInfo.dir, 'optimized');

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Define quality presets
const qualityPresets = [
  {
    name: 'high',
    suffix: '',
    webm: {
      cmd: `-c:v libvpx-vp9 -crf 30 -b:v 1500k -vf "scale=1280:-1" -an`
    },
    mp4: {
      cmd: `-c:v libx264 -crf 23 -preset slow -vf "scale=1280:-1" -an -movflags +faststart`
    },
    h265: {
      cmd: `-c:v libx265 -crf 26 -preset medium -vf "scale=1280:-1" -an -tag:v hvc1 -movflags +faststart`
    }
  },
  {
    name: 'medium',
    suffix: '-medium',
    webm: {
      cmd: `-c:v libvpx-vp9 -crf 33 -b:v 800k -vf "scale=854:-1" -an`
    },
    mp4: {
      cmd: `-c:v libx264 -crf 28 -preset medium -vf "scale=854:-1" -an -movflags +faststart`
    },
    h265: {
      cmd: `-c:v libx265 -crf 30 -preset medium -vf "scale=854:-1" -an -tag:v hvc1 -movflags +faststart`
    }
  },
  {
    name: 'low',
    suffix: '-low',
    webm: {
      cmd: `-c:v libvpx-vp9 -crf 36 -b:v 400k -vf "scale=640:-1" -an`
    },
    mp4: {
      cmd: `-c:v libx264 -crf 32 -preset fast -vf "scale=640:-1" -an -movflags +faststart`
    },
    h265: {
      cmd: `-c:v libx265 -crf 33 -preset fast -vf "scale=640:-1" -an -tag:v hvc1 -movflags +faststart`
    }
  }
];

// Create a simple poster image without ffmpeg
function createSimplePosterImage() {
  const posterOutput = path.join(outputDir, 'poster.jpg');
  
  // Copy the input file to the output directory as a fallback
  fs.copyFileSync(inputFile, path.join(outputDir, path.basename(inputFile)));
  
  console.log(`\nCopied original video to: ${path.join(outputDir, path.basename(inputFile))}`);
  console.log(`\nTo create optimized versions, please install FFmpeg: https://ffmpeg.org/download.html`);
  
  // Create a simple HTML file to help generate a poster image
  const htmlPath = path.join(outputDir, 'create-poster.html');
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
    </style>
  </head>
  <body>
    <h1>Create Video Poster Image</h1>
    <p>Since FFmpeg is not installed, use this page to create a poster image:</p>
    <video id="video" controls src="${path.basename(inputFile)}"></video>
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
      });
    </script>
  </body>
  </html>
  `;
  
  fs.writeFileSync(htmlPath, html);
  console.log(`\nCreated HTML file to manually capture poster image: ${htmlPath}`);
  console.log('Open this file in a browser, play the video, and click "Capture Frame as Poster"');
}

// Main function
async function main() {
  const hasFfmpeg = await checkFfmpeg();
  
  if (!hasFfmpeg) {
    console.log('FFmpeg is not installed. Creating a simple fallback solution...');
    createSimplePosterImage();
    return;
  }
  
  // Generate poster image from the video
  console.log('Generating poster image...');
  const posterOutput = path.join(outputDir, 'poster.jpg');
  exec(`ffmpeg -i "${inputFile}" -ss 00:00:01 -vframes 1 -q:v 2 "${posterOutput}"`, (error) => {
    if (error) {
      console.error('Error generating poster image:', error);
    } else {
      console.log(`Poster image saved to: ${posterOutput}`);
    }
  });

  // Process each quality preset
  console.log('Starting video optimization...');
  qualityPresets.forEach(preset => {
    console.log(`\nProcessing ${preset.name} quality...`);
    
    // WebM version
    const webmOutput = path.join(outputDir, `${fileInfo.name}${preset.suffix}.webm`);
    console.log(`Creating WebM version: ${webmOutput}`);
    exec(`ffmpeg -i "${inputFile}" ${preset.webm.cmd} "${webmOutput}"`, (error) => {
      if (error) {
        console.error(`Error creating WebM ${preset.name} version:`, error);
      } else {
        console.log(`WebM ${preset.name} version created successfully`);
        // Get file size
        const stats = fs.statSync(webmOutput);
        console.log(`File size: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
      }
    });
    
    // MP4 version
    const mp4Output = path.join(outputDir, `${fileInfo.name}${preset.suffix}.mp4`);
    console.log(`Creating MP4 version: ${mp4Output}`);
    exec(`ffmpeg -i "${inputFile}" ${preset.mp4.cmd} "${mp4Output}"`, (error) => {
      if (error) {
        console.error(`Error creating MP4 ${preset.name} version:`, error);
      } else {
        console.log(`MP4 ${preset.name} version created successfully`);
        // Get file size
        const stats = fs.statSync(mp4Output);
        console.log(`File size: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
      }
    });
    
    // H.265 version
    const h265Output = path.join(outputDir, `${fileInfo.name}${preset.suffix}-h265.mp4`);
    console.log(`Creating H.265 version: ${h265Output}`);
    exec(`ffmpeg -i "${inputFile}" ${preset.h265.cmd} "${h265Output}"`, (error) => {
      if (error) {
        console.error(`Error creating H.265 ${preset.name} version:`, error);
      } else {
        console.log(`H.265 ${preset.name} version created successfully`);
        // Get file size
        const stats = fs.statSync(h265Output);
        console.log(`File size: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
      }
    });
  });

  console.log('\nOptimization tasks started. This may take some time to complete...');
  console.log('You can upload the optimized files to your Supabase storage bucket when complete.');
}

main(); 