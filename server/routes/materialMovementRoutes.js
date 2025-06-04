const express = require('express');
const router = express.Router();
const MaterialMovementController = require('../controllers/materialMovementController');
const { protect } = require('../middleware/authMiddleware');

// Apply authentication to all routes
router.use(protect);

// GET /api/material-movements - Get all movements with filtering and pagination
router.get('/', MaterialMovementController.getAllMovements);

// GET /api/material-movements/analytics - Get movement analytics
router.get('/analytics', MaterialMovementController.getMovementAnalytics);

// NEW: Per-product movement routes
// GET /api/material-movements/per-product/analytics - Get per-product fabric analytics
router.get('/per-product/analytics', MaterialMovementController.getPerProductFabricAnalytics);

// POST /api/material-movements/per-product/bulk - Bulk create per-product movements
router.post('/per-product/bulk', MaterialMovementController.bulkCreatePerProductMovements);

// POST /api/material-movements/per-product - Create per-product movement
router.post('/per-product', MaterialMovementController.createPerProductMovement);

// GET /api/material-movements/per-product/order/:orderId - Get per-product movements by order
router.get('/per-product/order/:orderId', MaterialMovementController.getPerProductMovements);

// GET /api/material-movements/per-product/order/:orderId/product/:productId - Get movements for specific product
router.get('/per-product/order/:orderId/product/:productId', MaterialMovementController.getPerProductMovements);

// GET /api/material-movements/order/:orderId - Get movements by order ID
router.get('/order/:orderId', MaterialMovementController.getMovementsByOrder);

// GET /api/material-movements/:id - Get movement by ID
router.get('/:id', MaterialMovementController.getMovementById);

// POST /api/material-movements - Create new movement
router.post('/', MaterialMovementController.createMovement);

// PUT /api/material-movements/:id - Update movement
router.put('/:id', MaterialMovementController.updateMovement);

// DELETE /api/material-movements/:id - Delete movement
router.delete('/:id', MaterialMovementController.deleteMovement);

// GET /api/material-movements/material/:materialId - Get movements by material
router.get('/material/:materialId', MaterialMovementController.getMovementsByMaterial);

// GET /api/material-movements/material/:materialId/inventory - Get inventory calculation for material
router.get('/material/:materialId/inventory', MaterialMovementController.getInventoryForMaterial);

module.exports = router; 