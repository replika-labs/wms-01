const express = require('express');
const router = express.Router();
const {
  getPurchaseLogs,
  getPurchaseLogById,
  createPurchaseLog,
  updatePurchaseLog,
  updatePurchaseLogStatus,
  deletePurchaseLog,
  getPurchaseLogsByMaterial,
  getPurchaseLogsBySupplier,
  getPurchaseAnalytics
} = require('../controllers/purchaseLogController');

const { protect, adminOnly } = require('../middleware/authMiddleware');

// Protect all routes
router.use(protect);

// Main CRUD routes
router.route('/')
  .get(getPurchaseLogs)
  .post(adminOnly, createPurchaseLog);

router.route('/:id')
  .get(getPurchaseLogById)
  .put(adminOnly, updatePurchaseLog)
  .delete(adminOnly, deletePurchaseLog);

// Status update route
router.put('/:id/status', adminOnly, updatePurchaseLogStatus);

// Filter routes
router.get('/material/:materialId', getPurchaseLogsByMaterial);
router.get('/supplier/:supplier', getPurchaseLogsBySupplier);

// Analytics route
router.get('/analytics', adminOnly, getPurchaseAnalytics);

module.exports = router; 