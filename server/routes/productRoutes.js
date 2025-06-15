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
  getProductCategories,
  getProductColors,
  getProductVariations,
  bulkDeleteProducts,
  bulkActivateProducts,
  bulkDeactivateProducts,
  checkProductDeletable,
  checkBulkDeleteProducts
} = require('../controllers/productController');

const {
  completeOrderStock,
  adjustProductStock,
  setProductStock,
  getProductStockMovements,
  bulkCompleteOrdersStock
} = require('../controllers/productStockController');

const {
  getProductColours,
  getProductColourById,
  createProductColour,
  updateProductColour,
  deleteProductColour
} = require('../controllers/productColourController');
const {
  getProductVariations: getIndividualProductVariations,
  getProductVariationById,
  createProductVariation,
  updateProductVariation,
  deleteProductVariation
} = require('../controllers/productVariationController');

const router = express.Router();

// GET /api/products/categories - Get all product categories
router.get('/categories', protect, getProductCategories);

// GET /api/products/colors - Get all available product colors
router.get('/colors', protect, getProductColors);

// GET /api/products/variations - Get all available product variations
router.get('/variations', protect, getProductVariations);

// GET /api/products - Get all products with filtering and pagination
router.get('/', protect, getProducts);

// GET /api/products/:id - Get single product by ID with all relationships
router.get('/:id', protect, getProductById);

// GET /api/products/:id/check-delete - Check if a single product can be deleted
router.get('/:id/check-delete', protect, adminOnly, checkProductDeletable);

// POST /api/products/check-bulk-delete - Check if multiple products can be deleted
router.post('/check-bulk-delete', protect, adminOnly, checkBulkDeleteProducts);

// POST /api/products - Create new product with photos (protected by middleware protect and adminOnly)
router.post('/', protect, adminOnly, uploadProductPhotos, createProduct);

// PUT /api/products/:id - Update product (protected by middleware protect and adminOnly)
router.put('/:id', protect, adminOnly, uploadProductPhotos, updateProduct);

// DELETE /api/products/:id - Delete product (protected by middleware protect and adminOnly)
router.delete('/:id', protect, adminOnly, deleteProduct);

// Bulk actions
// POST /api/products/bulk/delete - Bulk delete products
router.post('/bulk/delete', protect, adminOnly, bulkDeleteProducts);

// POST /api/products/bulk/activate - Bulk activate products
router.post('/bulk/activate', protect, adminOnly, bulkActivateProducts);

// POST /api/products/bulk/deactivate - Bulk deactivate products
router.post('/bulk/deactivate', protect, adminOnly, bulkDeactivateProducts);

// Product Stock Management Routes
// POST /api/products/stock/complete-order - Update product stock when order is completed
router.post('/stock/complete-order', protect, adminOnly, completeOrderStock);

// POST /api/products/stock/bulk-complete - Bulk update product stock from completed orders
router.post('/stock/bulk-complete', protect, adminOnly, bulkCompleteOrdersStock);

// POST /api/products/:id/stock/adjust - Manually adjust product stock (IN/OUT/ADJUST)
router.post('/:id/stock/adjust', protect, adminOnly, adjustProductStock);

// PUT /api/products/:id/stock/set - Set product stock to specific level
router.put('/:id/stock/set', protect, adminOnly, setProductStock);

// GET /api/products/:id/stock/movements - Get product stock movement history
router.get('/:id/stock/movements', protect, getProductStockMovements);

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

// Product Colour Routes - Individual product colors
router.get('/:productId/colours', protect, getProductColours);
router.get('/:productId/colours/:id', protect, getProductColourById);
router.post('/:productId/colours', protect, adminOnly, createProductColour);
router.put('/:productId/colours/:id', protect, adminOnly, updateProductColour);
router.delete('/:productId/colours/:id', protect, adminOnly, deleteProductColour);

// Product Variation Routes - Individual product variations
router.get('/:productId/variations', protect, getIndividualProductVariations);
router.get('/:productId/variations/:id', protect, getProductVariationById);
router.post('/:productId/variations', protect, adminOnly, createProductVariation);
router.put('/:productId/variations/:id', protect, adminOnly, updateProductVariation);
router.delete('/:productId/variations/:id', protect, adminOnly, deleteProductVariation);

module.exports = router; 
