const express = require('express');
const asyncHandler = require('express-async-handler');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { uploadProductPhotos } = require('../middleware/uploadMiddleware');
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductCategories
} = require('../controllers/productController');
const {
  getProductMaterials,
  addProductMaterial,
  updateProductMaterial,
  removeProductMaterial,
  checkMaterialAvailability
} = require('../controllers/productMaterialController');
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

// GET /api/products/categories - Get all product categories
router.get('/categories', protect, getProductCategories);

// GET /api/products - Get all products with filtering and pagination
router.get('/', protect, getProducts);

// GET /api/products/:id - Get single product by ID with all relationships
router.get('/:id', protect, getProductById);

// POST /api/products - Create new product with photos (protected by middleware protect and adminOnly)
router.post('/', protect, adminOnly, uploadProductPhotos, createProduct);

// PUT /api/products/:id - Update product (protected by middleware protect and adminOnly)
router.put('/:id', protect, adminOnly, uploadProductPhotos, updateProduct);

// DELETE /api/products/:id - Delete product (protected by middleware protect and adminOnly)
router.delete('/:id', protect, adminOnly, deleteProduct);

// Product Material Management Routes
// GET /api/products/:id/materials - Get materials required for a product
router.get('/:id/materials', protect, getProductMaterials);

// POST /api/products/:id/materials - Add material requirement to product
router.post('/:id/materials', protect, adminOnly, addProductMaterial);

// PUT /api/products/:id/materials/:materialId - Update material requirement
router.put('/:id/materials/:materialId', protect, adminOnly, updateProductMaterial);

// DELETE /api/products/:id/materials/:materialId - Remove material requirement
router.delete('/:id/materials/:materialId', protect, adminOnly, removeProductMaterial);

// GET /api/products/:id/materials/availability - Check material availability for production
router.get('/:id/materials/availability', protect, checkMaterialAvailability);

// PUT /api/products/:id/toggle-main-photo/:photoId - Toggle main photo (protected by middleware protect and adminOnly)
router.put('/:id/toggle-main-photo/:photoId', protect, adminOnly, asyncHandler(async (req, res) => {
  res.status(501).json({
    message: 'Photo management will be implemented in the next phase',
    error: 'Not Implemented'
  });
}));

// DELETE /api/products/:id/photos/:photoId - Delete product photo (protected by middleware protect and adminOnly)
router.delete('/:id/photos/:photoId', protect, adminOnly, asyncHandler(async (req, res) => {
  res.status(501).json({
    message: 'Photo management will be implemented in the next phase',
    error: 'Not Implemented'
  });
}));

// POST /api/products/:id/photos - Add product photos (protected by middleware protect and adminOnly)
router.post('/:id/photos', protect, adminOnly, uploadProductPhotos, asyncHandler(async (req, res) => {
  res.status(501).json({
    message: 'Photo management will be implemented in the next phase',
    error: 'Not Implemented'
  });
}));

// Update sort order for photos
router.put('/:id/photos/sort', protect, adminOnly, asyncHandler(async (req, res) => {
  res.status(501).json({
    message: 'Photo management will be implemented in the next phase',
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
