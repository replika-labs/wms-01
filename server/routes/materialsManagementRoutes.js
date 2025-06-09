const express = require('express');
const router = express.Router();
// const { protect } = require('../middleware/authMiddleware'); // COMMENTED OUT - will be uncommented when implementing
const {
  getAllMaterials,
  getMaterialById,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  getMaterialsByCategory,
  getMaterialsWithCriticalStock,
  bulkUpdateMaterials,
  exportMaterials,
  importMaterials,
  getInventoryAnalytics,
  getStockMovements,
  updateStockLevel,
  adjustStock
} = require('../controllers/materialsManagementController');
const {
  getProductsUsingMaterial
} = require('../controllers/productMaterialController');

// Authentication middleware will be applied when implementing
// router.use(protect);

// Filtering and search (must come before /:id routes)
router.get('/category/:category', getMaterialsByCategory);
router.get('/critical-stock', getMaterialsWithCriticalStock);

// Bulk operations
router.put('/bulk/update', bulkUpdateMaterials);

// Import/Export
router.get('/export', exportMaterials);
router.post('/import', importMaterials);

// Analytics
router.get('/analytics/inventory', getInventoryAnalytics);

// Core CRUD operations (/:id routes must come after specific routes)
router.get('/', getAllMaterials);
router.get('/:id', getMaterialById);
router.post('/', createMaterial);
router.put('/:id', updateMaterial);
router.delete('/:id', deleteMaterial);

// Stock management (specific ID-based routes)
router.get('/:id/movements', getStockMovements);
router.put('/:id/stock', updateStockLevel);
router.post('/:id/adjust', adjustStock);

// Material-Product relationship
router.get('/:id/products', getProductsUsingMaterial);

module.exports = router; 