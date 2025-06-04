const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const {
    getMaterials,
    getMaterialById,
    createMaterial,
    updateMaterial,
    deleteMaterial,
    updateMaterialStock,
    getLowStockMaterials,
    regenerateMaterialCode
} = require('../controllers/materialController');

// @route   GET /api/materials
// @desc    Get all materials
// @access  Private
router.get('/', protect, getMaterials);

// @route   GET /api/materials/low-stock
// @desc    Get materials with low stock
// @access  Private
router.get('/low-stock', protect, getLowStockMaterials);

// @route   GET /api/materials/:id
// @desc    Get single material
// @access  Private
router.get('/:id', protect, getMaterialById);

// @route   POST /api/materials
// @desc    Create new material
// @access  Private
router.post('/', protect, createMaterial);

// @route   PUT /api/materials/:id
// @desc    Update material
// @access  Private
router.put('/:id', protect, updateMaterial);

// @route   DELETE /api/materials/:id
// @desc    Delete material
// @access  Private
router.delete('/:id', protect, deleteMaterial);

// @route   PATCH /api/materials/:id/stock
// @desc    Update material stock
// @access  Private
router.patch('/:id/stock', protect, updateMaterialStock);

// @route   POST /api/materials/:id/regenerate-code
// @desc    Regenerate material code
// @access  Private
router.post('/:id/regenerate-code', protect, regenerateMaterialCode);

module.exports = router; 