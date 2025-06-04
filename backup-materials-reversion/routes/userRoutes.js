const express = require('express');
const router = express.Router();
const {   getUsers,   getUserById,   createUser,   updateUser,  toggleUserStatus,  getPenjahitUsers} = require('../controllers/userController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// All routes are protected and admin-only
router.use(protect, adminOnly);

// Get all users
router.get('/', getUsers);

// Get penjahit users for dropdown
router.get('/penjahit', getPenjahitUsers);

// Get a single user by ID
router.get('/:id', getUserById);

// Create a new user
router.post('/', createUser);

// Update user
router.put('/:id', updateUser);

// Toggle user status (activate/deactivate)
router.put('/:id/toggle-status', toggleUserStatus);

module.exports = router; 