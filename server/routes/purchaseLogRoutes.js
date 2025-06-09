const express = require('express');
const router = express.Router();
// const { protect, adminOnly } = require('../middleware/authMiddleware'); // COMMENTED OUT - will be uncommented when implementing
const {
  getAllPurchaseLogs,
  getPurchaseLogById,
  createPurchaseLog,
  updatePurchaseLog,
  deletePurchaseLog,
  updatePurchaseLogStatus,
  getPurchaseLogsByMaterial,
  getPurchaseLogsBySupplier,
  getPurchaseLogsByDateRange,
  getPurchaseLogAnalytics
} = require('../controllers/purchaseLogController');

// Authentication middleware will be applied when implementing
// router.use(protect);

// Core CRUD routes
router.get('/', getAllPurchaseLogs);
router.get('/:id', getPurchaseLogById);
router.post('/', createPurchaseLog);
router.put('/:id', updatePurchaseLog);
router.delete('/:id', deletePurchaseLog);

// Status update route
router.patch('/:id/status', updatePurchaseLogStatus);

// Filter routes
router.get('/material/:materialId', getPurchaseLogsByMaterial);
router.get('/supplier/:supplier', getPurchaseLogsBySupplier);
router.get('/date-range', getPurchaseLogsByDateRange);

// Analytics route
router.get('/analytics', getPurchaseLogAnalytics);

module.exports = router; 