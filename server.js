const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const multer = require('multer');
const dotenv = require('dotenv');

// Load environment variables from .env (assuming it's in the project root)
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Configuration
const SERVER_DIR = path.join(__dirname, 'server'); // Path to the server/ folder
const PORT = process.env.PORT || 8080;
const SERVER_URL = process.env.SERVER_URL || `http://localhost:${PORT}`;

// Setup Express
const app = express();

// Multer setup for file uploads to a temporary location
const upload = multer({ dest: path.join(SERVER_DIR, 'temp') });

// Serve the entire server/ folder statically for GET requests
app.use('/', express.static(SERVER_DIR));

// POST route to handle file uploads
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { path: targetPath } = req.body;
    if (!targetPath) {
      return res.status(400).json({ error: 'No target path provided' });
    }

    // Sanitize the target path to prevent directory traversal
    const safePath = path.normalize(targetPath).replace(/^(\.\.[\/\\])+/, '');
    const destPath = path.join(SERVER_DIR, safePath);

    // Ensure the target directory exists
    await fs.mkdir(path.dirname(destPath), { recursive: true });

    // Move the uploaded file from temp to the target path
    await fs.rename(req.file.path, destPath);

    // Construct the public URL
    const relativePath = path.relative(SERVER_DIR, destPath).replace(/\\/g, '/');
    const publicUrl = `${SERVER_URL}/${relativePath}`;

    res.json({ message: 'File uploaded successfully', url: publicUrl });
  } catch (error) {
    console.error(`Upload error: ${error.message}`);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}, serving ${SERVER_DIR}`);
});