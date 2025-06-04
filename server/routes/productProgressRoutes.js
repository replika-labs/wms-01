const express = require('express');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const {
  getOrderProductProgress,
  getProductDetailedProgress,
  updateProductProgress,
  deleteProductProgress,
  getProductAnalytics
} = require('../controllers/productProgressController');
const {
  upload,
  uploadProductProgressPhotos,
  updateProductProgressPhoto,
  deleteProductProgressPhoto,
  getProductProgressPhotos
} = require('../controllers/photoUploadController');

const router = express.Router();

// @route   GET /api/product-progress/order/:orderId
// @desc    Get per-product progress for an order
// @access  Private
router.get('/order/:orderId', protect, getOrderProductProgress);

// @route   GET /api/product-progress/product/:productId/order/:orderId
// @desc    Get detailed progress for a specific product in an order
// @access  Private
router.get('/product/:productId/order/:orderId', protect, getProductDetailedProgress);

// @route   PUT /api/product-progress/:id
// @desc    Update product progress report
// @access  Private
router.put('/:id', protect, updateProductProgress);

// @route   DELETE /api/product-progress/:id
// @desc    Delete product progress report
// @access  Private (Admin only)
router.delete('/:id', protect, adminOnly, deleteProductProgress);

// @route   GET /api/product-progress/analytics/product/:productId
// @desc    Get analytics for product progress across orders
// @access  Private
router.get('/analytics/product/:productId', protect, getProductAnalytics);

// NEW: Photo upload routes
// @route   POST /api/product-progress/:reportId/photos
// @desc    Upload photos for product progress report
// @access  Private
router.post('/:reportId/photos', protect, upload.array('photos', 10), uploadProductProgressPhotos);

// @route   GET /api/product-progress/:reportId/photos
// @desc    Get photos for product progress report
// @access  Private
router.get('/:reportId/photos', protect, getProductProgressPhotos);

// @route   PUT /api/product-progress/photos/:photoId
// @desc    Update photo details (caption, type, sort order)
// @access  Private
router.put('/photos/:photoId', protect, updateProductProgressPhoto);

// @route   DELETE /api/product-progress/photos/:photoId
// @desc    Delete product progress photo
// @access  Private
router.delete('/photos/:photoId', protect, deleteProductProgressPhoto);

module.exports = router; 