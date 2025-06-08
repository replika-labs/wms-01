const express = require('express');
// const MaterialMovementController = require('../controllers/materialMovementController'); // DELETED - Controller not implemented in Prisma yet
const router = express.Router();

// Temporary 501 responses for all routes until Prisma implementation
const notImplemented = (req, res) => {
    res.status(501).json({
        message: 'This endpoint is temporarily disabled during Sequelize to Prisma migration',
        error: 'Not Implemented'
    });
};

// Get all movements with filtering and pagination
router.get('/', notImplemented);

// Get movement analytics for admin dashboard
router.get('/analytics', notImplemented);

// NEW: Get analytics for per-product material usage across all products
router.get('/per-product/analytics', notImplemented);

// NEW: Bulk create per-product movements (for efficient product completion recording)
router.post('/per-product/bulk', notImplemented);

// NEW: Create single per-product movement
router.post('/per-product', notImplemented);

// NEW: Get per-product movements for a specific order (all products)
router.get('/per-product/order/:orderId', notImplemented);

// NEW: Get per-product movements for a specific order and product
router.get('/per-product/order/:orderId/product/:productId', notImplemented);

// Get movements by order ID
router.get('/order/:orderId', notImplemented);

// Get movement by ID
router.get('/:id', notImplemented);

// Create new movement
router.post('/', notImplemented);

// Update movement
router.put('/:id', notImplemented);

// Delete movement
router.delete('/:id', notImplemented);

// Get movements by material ID
router.get('/material/:materialId', notImplemented);

// Get current inventory for a material
router.get('/material/:materialId/inventory', notImplemented);

module.exports = router; 