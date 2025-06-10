const express = require('express');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const {
  getOrderByToken,
  createOrderLink,
  submitProgress,
  recordMaterialUsage,
  submitRemainingMaterials,
  getOrderLinkStatus,
  updateOrderLink,
  deleteOrderLink
} = require('../controllers/orderLinkController');

const router = express.Router();

// GET /api/order-links/:token - Get order details by token (Public Access - no user token needed)
router.get('/:token', getOrderByToken);

// GET /api/order-links/:linkId/status - Get order link status
router.get('/:linkId/status', protect, getOrderLinkStatus);

// POST /api/order-links - Create new order link
router.post('/', protect, adminOnly, createOrderLink);

// POST /api/order-links/:token/progress - Submit progress report via order link
router.post('/:token/progress', submitProgress);

// POST /api/order-links/:token/materials - Record material usage via order link
router.post('/:token/materials', recordMaterialUsage);

// POST /api/order-links/:token/remaining-materials - Submit remaining material report
router.post('/:token/remaining-materials', submitRemainingMaterials);

// PUT /api/order-links/:id - Update order link
router.put('/:id', protect, adminOnly, updateOrderLink);

// DELETE /api/order-links/:id - Delete order link
router.delete('/:id', protect, adminOnly, deleteOrderLink);

module.exports = router; 