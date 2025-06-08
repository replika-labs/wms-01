const express = require('express');
const asyncHandler = require('express-async-handler');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { uploadProductPhotos } = require('../middleware/uploadMiddleware');
// const { Product, Material, ProductColour, ProductVariation, ProductPhoto } = require('../models'); // DISABLED: Using Prisma now
const {
  getProductColours,
  getProductColourById,
  createProductColour,
  updateProductColour,
  deleteProductColour
} = require('../controllers/productColourController');
const {
  getProductVariations,
  getProductVariationById,
  createProductVariation,
  updateProductVariation,
  deleteProductVariation
} = require('../controllers/productVariationController');

const router = express.Router();

// TEMPORARY: Disable Sequelize-based routes until conversion to Prisma is complete
// All routes below are temporarily disabled and return 501 Not Implemented

// GET /api/products - Get all products with main photo (protected by middleware protect)
router.get('/', protect, asyncHandler(async (req, res) => {
  res.status(501).json({
    message: 'This endpoint is temporarily disabled during Sequelize to Prisma migration',
    error: 'Not Implemented'
  });
}));

// GET /api/products/:id - Get single product by ID with all photos (protected by middleware protect)
router.get('/:id', protect, asyncHandler(async (req, res) => {
  res.status(501).json({
    message: 'This endpoint is temporarily disabled during Sequelize to Prisma migration',
    error: 'Not Implemented'
  });
}));

// POST /api/products - Create new product with photos (protected by middleware protect and adminOnly)
router.post('/', protect, adminOnly, uploadProductPhotos, asyncHandler(async (req, res) => {
  res.status(501).json({
    message: 'This endpoint is temporarily disabled during Sequelize to Prisma migration',
    error: 'Not Implemented'
  });
}));

// PUT /api/products/:id - Update product (protected by middleware protect and adminOnly)
router.put('/:id', protect, adminOnly, asyncHandler(async (req, res) => {
  res.status(501).json({
    message: 'This endpoint is temporarily disabled during Sequelize to Prisma migration',
    error: 'Not Implemented'
  });
}));

// DELETE /api/products/:id - Delete product (protected by middleware protect and adminOnly)
router.delete('/:id', protect, adminOnly, asyncHandler(async (req, res) => {
  res.status(501).json({
    message: 'This endpoint is temporarily disabled during Sequelize to Prisma migration',
    error: 'Not Implemented'
  });
}));

// PUT /api/products/:id/toggle-main-photo/:photoId - Toggle main photo (protected by middleware protect and adminOnly)
router.put('/:id/toggle-main-photo/:photoId', protect, adminOnly, asyncHandler(async (req, res) => {
  res.status(501).json({
    message: 'This endpoint is temporarily disabled during Sequelize to Prisma migration',
    error: 'Not Implemented'
  });
}));

// DELETE /api/products/:id/photos/:photoId - Delete product photo (protected by middleware protect and adminOnly)
router.delete('/:id/photos/:photoId', protect, adminOnly, asyncHandler(async (req, res) => {
  res.status(501).json({
    message: 'This endpoint is temporarily disabled during Sequelize to Prisma migration',
    error: 'Not Implemented'
  });
}));

// POST /api/products/:id/photos - Add product photos (protected by middleware protect and adminOnly)
router.post('/:id/photos', protect, adminOnly, uploadProductPhotos, asyncHandler(async (req, res) => {
  res.status(501).json({
    message: 'This endpoint is temporarily disabled during Sequelize to Prisma migration',
    error: 'Not Implemented'
  });
}));

// Update sort order for photos
router.put('/:id/photos/sort', protect, adminOnly, asyncHandler(async (req, res) => {
  res.status(501).json({
    message: 'This endpoint is temporarily disabled during Sequelize to Prisma migration',
    error: 'Not Implemented'
  });
}));

// Product Colour Routes
router.get('/colours', protect, getProductColours);
router.get('/colours/:id', protect, getProductColourById);
router.post('/colours', protect, adminOnly, createProductColour);
router.put('/colours/:id', protect, adminOnly, updateProductColour);
router.delete('/colours/:id', protect, adminOnly, deleteProductColour);

// Product Variation Routes
router.get('/variations', protect, getProductVariations);
router.get('/variations/:id', protect, getProductVariationById);
router.post('/variations', protect, adminOnly, createProductVariation);
router.put('/variations/:id', protect, adminOnly, updateProductVariation);
router.delete('/variations/:id', protect, adminOnly, deleteProductVariation);

module.exports = router; 
