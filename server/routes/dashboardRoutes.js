const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { getAdminSummary } = require('../controllers/dashboardController');

// @route   GET /api/dashboard/summary
// @desc    Get dashboard summary data
// @access  Private/Admin
router.get('/summary', protect, adminOnly, getAdminSummary);

module.exports = router; 