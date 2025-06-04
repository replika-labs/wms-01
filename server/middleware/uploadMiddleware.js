const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const uploadDir = path.join(__dirname, '../uploads/products');
const thumbnailDir = path.join(__dirname, '../uploads/products/thumbnails');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

if (!fs.existsSync(thumbnailDir)) {
  fs.mkdirSync(thumbnailDir, { recursive: true });
}

// Multer configuration
const storage = multer.memoryStorage(); // Store in memory for processing

const fileFilter = (req, file, cb) => {
  // Check file type
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 10 // Maximum 10 files
  }
});

// Image processing function
const processImage = async (buffer, filename) => {
  try {
    const timestamp = Date.now();
    const extension = '.jpg'; // Convert all to JPG for consistency
    const baseName = `${filename}_${timestamp}`;
    
    // Main image processing (max 1200px width, maintain aspect ratio)
    const mainImagePath = path.join(uploadDir, `${baseName}${extension}`);
    await sharp(buffer)
      .resize(1200, 1200, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 85 })
      .toFile(mainImagePath);

    // Thumbnail generation (200x200px square)
    const thumbnailPath = path.join(thumbnailDir, `${baseName}_thumb${extension}`);
    await sharp(buffer)
      .resize(200, 200, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 80 })
      .toFile(thumbnailPath);

    return {
      mainImage: `/uploads/products/${baseName}${extension}`,
      thumbnail: `/uploads/products/thumbnails/${baseName}_thumb${extension}`,
      originalName: filename
    };
  } catch (error) {
    console.error('Image processing error:', error);
    throw new Error('Failed to process image');
  }
};

// Middleware for multiple file upload
const uploadMultiple = upload.array('photos', 10);

// Middleware wrapper that handles processing
const uploadProductPhotos = async (req, res, next) => {
  uploadMultiple(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ message: 'File too large. Maximum size is 5MB.' });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({ message: 'Too many files. Maximum is 10 files.' });
        }
        return res.status(400).json({ message: err.message });
      }
      return res.status(400).json({ message: err.message });
    }

    // If no files uploaded, continue
    if (!req.files || req.files.length === 0) {
      return next();
    }

    try {
      // Process all uploaded images
      const processedImages = [];
      
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const baseFilename = path.parse(file.originalname).name;
        
        const processed = await processImage(file.buffer, baseFilename);
        
        processedImages.push({
          photoUrl: processed.mainImage,
          thumbnailUrl: processed.thumbnail,
          originalFileName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
          sortOrder: i,
          isMainPhoto: i === 0 // First image is main photo by default
        });
      }
      
      // Attach processed images to request
      req.processedImages = processedImages;
      next();
      
    } catch (error) {
      console.error('Image processing error:', error);
      res.status(500).json({ message: 'Failed to process uploaded images' });
    }
  });
};

module.exports = {
  uploadProductPhotos,
  processImage
}; 