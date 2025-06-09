const express = require('express');
const materialMovementController = require('../controllers/materialMovementController');
const router = express.Router();

// Get all movements with filtering and pagination
router.get('/', materialMovementController.getAllMovements);

// Get movement analytics for admin dashboard
router.get('/analytics', materialMovementController.getAnalytics);

// Get movements by order ID
router.get('/order/:orderId', materialMovementController.getMovementsByOrder);

// Get movements by material ID
router.get('/material/:materialId', materialMovementController.getMovementsByMaterial);

// Get current inventory for a material
router.get('/material/:materialId/inventory', materialMovementController.getMaterialInventory);

// Get movement by ID
router.get('/:id', materialMovementController.getMovementById);

// Create new movement
router.post('/', materialMovementController.createMovement);

// Update movement
router.put('/:id', materialMovementController.updateMovement);

// Delete movement
router.delete('/:id', materialMovementController.deleteMovement);

module.exports = router; 