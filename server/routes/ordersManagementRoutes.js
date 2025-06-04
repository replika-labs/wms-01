const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  getOrdersList,
  getTailors,
  getOrderDetails,
  updateOrderStatus,
  updateOrderTailor,
  clearTailorsCache,
  createOrder,
  updateOrder,
  deleteOrder,
  getOrderTimeline
} = require('../controllers/ordersManagementController');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);

/**
 * GET /api/orders-management/list
 * Optimized orders list with server-side filtering, pagination, and minimal data
 * Query params: page, limit, status, priority, search, startDate, endDate, sortBy, sortOrder
 */
router.get('/list', getOrdersList);

/**
 * GET /api/orders-management/tailors
 * Cached list of tailors (penjahit role users)
 * Cached for 1 hour to reduce database calls
 */
router.get('/tailors', getTailors);

/**
 * GET /api/orders-management/:id/details
 * Complete order details for modals (view/edit)
 * Returns full order information including products
 */
router.get('/:id/details', getOrderDetails);

/**
 * GET /api/orders-management/:id/timeline
 * Get timeline data for a specific order
 * Returns comprehensive order timeline including status changes, shipments, progress reports
 */
router.get('/:id/timeline', getOrderTimeline);

/**
 * PUT /api/orders-management/:id/status
 * Optimized status update
 * Body: { status }
 * Returns minimal response for optimistic UI updates
 */
router.put('/:id/status', updateOrderStatus);

/**
 * PUT /api/orders-management/:id/tailor
 * Optimized tailor assignment update
 * Body: { tailorId }
 * Returns minimal response for optimistic UI updates
 */
router.put('/:id/tailor', updateOrderTailor);

/**
 * POST /api/orders-management
 * Create new order with optimized material stock checking
 * Body: { customerNote, dueDate, description, priority, status, tailorId, products }
 * Returns complete order with stock results
 */
router.post('/', createOrder);

/**
 * PUT /api/orders-management/:id
 * Update existing order with enhanced validation and tailor handling
 * Body: { customerNote, dueDate, description, priority, status, tailorId, products }
 * Returns updated order with stock results (if products changed)
 */
router.put('/:id', updateOrder);

/**
 * DELETE /api/orders-management/:id
 * Soft delete order with proper cleanup and safety checks
 * Returns deletion confirmation
 */
router.delete('/:id', deleteOrder);

/**
 * POST /api/orders-management/cache/clear-tailors
 * Clear tailors cache (for admin use or when tailor data changes)
 */
router.post('/cache/clear-tailors', clearTailorsCache);

module.exports = router; 