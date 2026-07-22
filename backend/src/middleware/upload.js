// backend/src/middleware/upload.js
// Multer configuration for SVG file uploads – validates file type and size

const multer = require('multer');
const path = require('path');

// Configure storage (memory storage for processing)
const storage = multer.memoryStorage();

// File filter – only allow SVG files
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/svg+xml', 'text/xml', 'application/xml'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedMimeTypes.includes(file.mimetype) || ext === '.svg') {
    cb(null, true);
  } else {
    cb(new Error('Only SVG files are allowed'), false);
  }
};

// Max file size (5MB)
const limits = {
  fileSize: 5 * 1024 * 1024, // 5MB
};

const upload = multer({
  storage,
  fileFilter,
  limits,
});

// Middleware to handle single file upload with field name "svg"
const uploadSvg = upload.single('svg');

// Middleware for multiple SVGs (for bulk upload)
const uploadMultipleSvgs = upload.array('svgs', 12); // max 12 files

module.exports = {
  uploadSvg,
  uploadMultipleSvgs,
};