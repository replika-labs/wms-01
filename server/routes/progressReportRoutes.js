const express = require('express');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const {
  getProgressReports,
  createProgressReport,
  getProgressPhotos
} = require('../controllers/progressReportController');

const router = express.Router();

// Get progress reports for an order
router.get('/', protect, getProgressReports);

// Create new progress report (legacy endpoint)
router.post('/', protect, createProgressReport);

// Get progress photos for an order
router.get('/:orderId/photos', protect, getProgressPhotos);

module.exports = router; 