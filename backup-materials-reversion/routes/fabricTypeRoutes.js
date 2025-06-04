const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const {
    getFabricTypes,
    getFabricTypeById,
    searchFabricTypes,
    getFabricCodeByName,
    createFabricType,
    updateFabricType,
    deleteFabricType
} = require('../controllers/fabricTypeController');

// @route   GET /api/fabric-types
// @desc    Get all fabric types
// @access  Private
router.get('/', protect, getFabricTypes);

// @route   GET /api/fabric-types/search/:fabricName
// @desc    Search fabric types by name
// @access  Private
router.get('/search/:fabricName', protect, searchFabricTypes);

// @route   GET /api/fabric-types/lookup/:fabricName
// @desc    Get fabric code by fabric name
// @access  Private
router.get('/lookup/:fabricName', protect, getFabricCodeByName);

// @route   GET /api/fabric-types/:id
// @desc    Get fabric type by ID
// @access  Private
router.get('/:id', protect, getFabricTypeById);

// @route   POST /api/fabric-types
// @desc    Create new fabric type
// @access  Private/Admin
router.post('/', protect, adminOnly, createFabricType);

// @route   PUT /api/fabric-types/:id
// @desc    Update fabric type
// @access  Private/Admin
router.put('/:id', protect, adminOnly, updateFabricType);

// @route   DELETE /api/fabric-types/:id
// @desc    Delete fabric type
// @access  Private/Admin
router.delete('/:id', protect, adminOnly, deleteFabricType);

module.exports = router; 