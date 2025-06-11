const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { getAdminSummary, getMonthlyStats } = require('../controllers/dashboardController');

// @route   GET /api/dashboard/summary
// @desc    Get dashboard summary data
// @access  Private/Admin
router.get('/summary', protect, adminOnly, getAdminSummary);

// @route   GET /api/dashboard/monthly-stats
// @desc    Get monthly statistics
// @access  Private/Admin
router.get('/monthly-stats', protect, adminOnly, getMonthlyStats);

module.exports = router; 