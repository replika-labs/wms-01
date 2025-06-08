const express = require('express');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const {
  getOrdersList,
  getWorkers,
  getOrderDetails,
  updateOrderStatus,
  updateOrderWorker,
  clearWorkersCache,
  createOrder,
  updateOrder,
  deleteOrder,
  getOrderTimeline
} = require('../controllers/ordersManagementController');

const router = express.Router();

/**
 * GET /api/orders-management
 * Optimized orders list with server-side filtering and pagination
 * Query params: page, limit, status, priority, search, sortBy, sortOrder
 */
router.get('/', protect, getOrdersList);

/**
 * GET /api/orders-management/workers
 * Cached list of workers (worker role contacts)
 * Returns: [{ id, name, email, phone, whatsappPhone, company, notes }]
 * Cache: 1 hour
 */
router.get('/workers', getWorkers);

/**
 * GET /api/orders-management/:id
 * Get single order details for modals
 * Returns complete order with user, worker, products, and progress data
 */
router.get('/:id', protect, getOrderDetails);

/**
 * GET /api/orders-management/:id/timeline
 * Get comprehensive order timeline
 * Returns order timeline with status changes, shipments, progress reports
 */
router.get('/:id/timeline', protect, getOrderTimeline);

/**
 * POST /api/orders-management
 * Create new order with enhanced validation and worker handling
 * Body: { customerNote, dueDate, description, priority, status, workerContactId, products }
 */
router.post('/', protect, createOrder);

/**
 * PUT /api/orders-management/:id/status
 * Optimized status update with validation
 * Body: { status }
 */
router.put('/:id/status', protect, updateOrderStatus);

/**
 * PUT /api/orders-management/:id/worker
 * Optimized worker assignment update
 * Body: { workerContactId }
 */
router.put('/:id/worker', updateOrderWorker);

/**
 * PUT /api/orders-management/:id
 * Update existing order with enhanced validation and worker handling
 * Body: { customerNote, dueDate, description, priority, status, workerContactId, products }
 */
router.put('/:id', protect, updateOrder);

/**
 * DELETE /api/orders-management/:id
 * Soft delete order with business rule validation
 * Only allows deletion of orders with specific statuses
 */
router.delete('/:id', protect, deleteOrder);

/**
 * POST /api/orders-management/cache/clear-workers
 * Clear workers cache (for admin use or when worker data changes)
 */
router.post('/cache/clear-workers', clearWorkersCache);

module.exports = router; 