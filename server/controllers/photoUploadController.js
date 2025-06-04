const asyncHandler = require('express-async-handler');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');
const { ProductProgressPhoto, ProductProgressReport } = require('../models');
const { sequelize } = require('../config/database');

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/product-progress');
    try {
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-random-original.ext
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = file.originalname.replace(ext, '').substring(0, 50); // Limit name length
    cb(null, `${uniqueSuffix}-${name}${ext}`);
  }
});

// File filter for images only
const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp',
    'image/gif'
  ];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, PNG, WebP, GIF) are allowed'), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 10 // Maximum 10 files per upload
  },
  fileFilter: fileFilter
});

// @desc    Upload photos for product progress report
// @route   POST /api/product-progress/:reportId/photos
// @access  Private
const uploadProductProgressPhotos = asyncHandler(async (req, res) => {
  const { reportId } = req.params;
  const { photoType = 'progress', captions = [] } = req.body;

  try {
    // Verify product progress report exists
    const productProgressReport = await ProductProgressReport.findByPk(reportId);
    if (!productProgressReport) {
      return res.status(404).json({
        success: false,
        message: 'Product progress report not found'
      });
    }

    // Check if files were uploaded
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    const transaction = await sequelize.transaction();
    
    try {
      // Get current max sort order for this report
      const maxSortOrder = await ProductProgressPhoto.max('sortOrder', {
        where: { productProgressReportId: reportId, isActive: true },
        transaction
      }) || -1;

      const photoRecords = [];
      const processedPhotos = [];

      // Process each uploaded file
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const caption = Array.isArray(captions) ? captions[i] : captions;
        
        // Generate thumbnail
        const thumbnailPath = await generateThumbnail(file.path, file.filename);
        
        // Optimize main image
        const optimizedPath = await optimizeImage(file.path, file.filename);
        
        // Create photo record
        const photoRecord = {
          productProgressReportId: reportId,
          photoUrl: `/uploads/product-progress/optimized-${file.filename}`,
          thumbnailUrl: `/uploads/product-progress/thumb-${file.filename}`,
          photoCaption: caption || null,
          photoType: photoType,
          sortOrder: maxSortOrder + 1 + i,
          originalFileName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
          uploadedAt: new Date()
        };

        photoRecords.push(photoRecord);
        
        processedPhotos.push({
          originalName: file.originalname,
          size: file.size,
          url: photoRecord.photoUrl,
          thumbnailUrl: photoRecord.thumbnailUrl,
          type: photoType
        });
      }

      // Bulk create photo records
      const createdPhotos = await ProductProgressPhoto.bulkCreate(photoRecords, { transaction });

      await transaction.commit();

      res.json({
        success: true,
        message: `Successfully uploaded ${createdPhotos.length} photos`,
        photos: createdPhotos.map((photo, index) => ({
          id: photo.id,
          url: photo.photoUrl,
          thumbnailUrl: photo.thumbnailUrl,
          caption: photo.photoCaption,
          type: photo.photoType,
          sortOrder: photo.sortOrder,
          originalFileName: photo.originalFileName,
          fileSize: photo.fileSize,
          uploadedAt: photo.uploadedAt,
          processed: processedPhotos[index]
        }))
      });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    console.error('Error uploading photos:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload photos',
      error: error.message
    });
  }
});

// @desc    Update photo details (caption, type, sort order)
// @route   PUT /api/product-progress/photos/:photoId
// @access  Private
const updateProductProgressPhoto = asyncHandler(async (req, res) => {
  const { photoId } = req.params;
  const { photoCaption, photoType, sortOrder } = req.body;

  try {
    const photo = await ProductProgressPhoto.findByPk(photoId);
    
    if (!photo) {
      return res.status(404).json({
        success: false,
        message: 'Photo not found'
      });
    }

    const updateData = {};
    if (photoCaption !== undefined) updateData.photoCaption = photoCaption;
    if (photoType !== undefined) updateData.photoType = photoType;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

    await photo.update(updateData);

    res.json({
      success: true,
      message: 'Photo updated successfully',
      photo: {
        id: photo.id,
        url: photo.photoUrl,
        thumbnailUrl: photo.thumbnailUrl,
        caption: photo.photoCaption,
        type: photo.photoType,
        sortOrder: photo.sortOrder
      }
    });

  } catch (error) {
    console.error('Error updating photo:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update photo',
      error: error.message
    });
  }
});

// @desc    Delete product progress photo
// @route   DELETE /api/product-progress/photos/:photoId
// @access  Private
const deleteProductProgressPhoto = asyncHandler(async (req, res) => {
  const { photoId } = req.params;

  try {
    const photo = await ProductProgressPhoto.findByPk(photoId);
    
    if (!photo) {
      return res.status(404).json({
        success: false,
        message: 'Photo not found'
      });
    }

    // Delete physical files
    try {
      const photoPath = path.join(__dirname, '../uploads/product-progress', path.basename(photo.photoUrl));
      const thumbnailPath = path.join(__dirname, '../uploads/product-progress', path.basename(photo.thumbnailUrl));
      
      await fs.unlink(photoPath).catch(() => {}); // Ignore if file doesn't exist
      await fs.unlink(thumbnailPath).catch(() => {}); // Ignore if file doesn't exist
    } catch (fileError) {
      console.warn('Could not delete physical files:', fileError.message);
    }

    // Mark as inactive instead of hard delete (soft delete)
    await photo.update({ isActive: false });

    res.json({
      success: true,
      message: 'Photo deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting photo:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete photo',
      error: error.message
    });
  }
});

// @desc    Get photos for product progress report
// @route   GET /api/product-progress/:reportId/photos
// @access  Private  
const getProductProgressPhotos = asyncHandler(async (req, res) => {
  const { reportId } = req.params;
  const { type } = req.query;

  try {
    let whereClause = { 
      productProgressReportId: reportId,
      isActive: true 
    };

    if (type) {
      whereClause.photoType = type;
    }

    const photos = await ProductProgressPhoto.findAll({
      where: whereClause,
      order: [['sortOrder', 'ASC'], ['uploadedAt', 'ASC']]
    });

    // Group photos by type
    const groupedPhotos = photos.reduce((groups, photo) => {
      const type = photo.photoType;
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push({
        id: photo.id,
        url: photo.photoUrl,
        thumbnailUrl: photo.thumbnailUrl,
        caption: photo.photoCaption,
        type: photo.photoType,
        sortOrder: photo.sortOrder,
        originalFileName: photo.originalFileName,
        fileSize: photo.fileSize,
        uploadedAt: photo.uploadedAt
      });
      return groups;
    }, {});

    res.json({
      success: true,
      reportId,
      totalPhotos: photos.length,
      photos: groupedPhotos,
      photosList: photos.map(photo => ({
        id: photo.id,
        url: photo.photoUrl,
        thumbnailUrl: photo.thumbnailUrl,
        caption: photo.photoCaption,
        type: photo.photoType,
        sortOrder: photo.sortOrder,
        uploadedAt: photo.uploadedAt
      }))
    });

  } catch (error) {
    console.error('Error fetching photos:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch photos',
      error: error.message
    });
  }
});

// Helper function to generate thumbnail
async function generateThumbnail(imagePath, filename) {
  try {
    const thumbnailPath = path.join(path.dirname(imagePath), `thumb-${filename}`);
    
    await sharp(imagePath)
      .resize(300, 300, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 80 })
      .toFile(thumbnailPath);
    
    return thumbnailPath;
  } catch (error) {
    console.error('Error generating thumbnail:', error);
    throw error;
  }
}

// Helper function to optimize image
async function optimizeImage(imagePath, filename) {
  try {
    const optimizedPath = path.join(path.dirname(imagePath), `optimized-${filename}`);
    
    await sharp(imagePath)
      .resize(1200, 1200, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 85 })
      .toFile(optimizedPath);
    
    return optimizedPath;
  } catch (error) {
    console.error('Error optimizing image:', error);
    throw error;
  }
}

module.exports = {
  upload,
  uploadProductProgressPhotos,
  updateProductProgressPhoto,
  deleteProductProgressPhoto,
  getProductProgressPhotos
}; 