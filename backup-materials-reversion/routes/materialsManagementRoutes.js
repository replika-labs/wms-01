const express = require('express');
const router = express.Router();
const {
  getMaterials,
  getMaterialById,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  getInventorySummary,
  getRestockRecommendations
} = require('../controllers/materialsManagementController');

const { protect, adminOnly } = require('../middleware/authMiddleware');

// Protect all routes
router.use(protect);

// Summary and analytics routes (must be before /:id routes)
router.get('/inventory-summary', adminOnly, getInventorySummary);
router.get('/restock-recommendations', adminOnly, getRestockRecommendations);

// Main CRUD routes
router.route('/')
  .get(getMaterials)
  .post(adminOnly, createMaterial);

router.route('/:id')
  .get(getMaterialById)
  .put(adminOnly, updateMaterial)
  .delete(adminOnly, deleteMaterial);

module.exports = router; 