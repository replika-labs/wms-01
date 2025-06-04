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