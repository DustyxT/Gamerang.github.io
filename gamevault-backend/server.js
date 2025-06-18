const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Enable CORS for all origins (adjust as needed)
app.use(cors());

// Setup storage for multer to save uploaded files
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Save images in uploads/ folder
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)){
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Save with original name + timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({ storage: storage });

// To parse JSON bodies from frontend (if sent as JSON)
app.use(express.json());

// Endpoint to receive form submission with multiple files
// Use multer fields to handle specific file inputs (e.g. coverImage and screenshots)
app.post('/submit-game', upload.fields([
  { name: 'coverImage', maxCount: 1 },
  { name: 'screenshots', maxCount: 5 }
]), (req, res) => {
  try {
    // Access text fields from req.body
    const formData = req.body;

    // Access file info from req.files
    const coverImage = req.files['coverImage'] ? req.files['coverImage'][0].filename : null;
    const screenshots = req.files['screenshots'] ? req.files['screenshots'].map(f => f.filename) : [];

    // Prepare a game data object to save
    const gameData = {
      title: formData.gameTitle,
      description: formData.gameDescription,
      genre: formData.gameGenre,
      developer: formData.gameDeveloper,
      publisher: formData.gamePublisher,
      releaseDate: formData.releaseDate,
      version: formData.gameVersion,
      repackSize: formData.repackSize + (formData.sizeUnit || ''),
      originalSize: formData.originalSize || '',
      coverImage: coverImage ? `/uploads/${coverImage}` : null,
      screenshots: screenshots.map(s => `/uploads/${s}`),
      systemRequirements: {
        minimum: {
          os: formData.minOS,
          processor: formData.minProcessor,
          memory: formData.minMemory,
          graphics: formData.minGraphics,
          storage: formData.minStorage
        },
        recommended: {
          os: formData.recOS,
          processor: formData.recProcessor,
          memory: formData.recMemory,
          graphics: formData.recGraphics,
          storage: formData.recStorage
        }
      },
      downloadLinks: []
      // You can add parsing for multiple download links here if you want
    };

    // Save data as JSON file (you can also save to a DB)
    const saveDir = 'submitted_games/';
    if (!fs.existsSync(saveDir)) {
      fs.mkdirSync(saveDir);
    }

    // Filename safe version of title
    const safeTitle = gameData.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');

    const filePath = path.join(saveDir, safeTitle + '.json');

    fs.writeFileSync(filePath, JSON.stringify(gameData, null, 2), 'utf-8');

    return res.status(200).json({ message: 'Game submitted successfully!' });
  } catch (error) {
    console.error('Submission error:', error);
    return res.status(500).json({ message: 'Server error during submission' });
  }
});

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
