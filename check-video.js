const https = require('https');

const videoUrl = 'https://pjlzzuoplxrftrqbhbfl.supabase.co/storage/v1/object/public/background-video-forum-page/Background_vid_forumpg.mp4';

console.log(`Checking video URL: ${videoUrl}`);

const req = https.request(videoUrl, { method: 'HEAD' }, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Content-Type: ${res.headers['content-type']}`);
  console.log(`Content-Length: ${res.headers['content-length']} bytes (${(res.headers['content-length'] / 1024 / 1024).toFixed(2)} MB)`);
  
  if (res.statusCode === 200) {
    console.log('Video file exists and is accessible!');
  } else {
    console.log('Video file might not exist or is not accessible.');
  }
});

req.on('error', (err) => {
  console.error('Error checking video:', err.message);
});

req.end(); 