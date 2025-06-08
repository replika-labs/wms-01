const express = require('express');
const asyncHandler = require('express-async-handler');
// const { ProgressReport, Order, User } = require('../models'); // DISABLED: Using Prisma now
const { protect, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

// TEMPORARY: All routes disabled during Sequelize to Prisma migration

router.get('/', protect, asyncHandler(async (req, res) => {
  res.status(501).json({
    message: 'This endpoint is temporarily disabled during Sequelize to Prisma migration',
    error: 'Not Implemented'
  });
}));

router.get('/:id', protect, asyncHandler(async (req, res) => {
  res.status(501).json({
    message: 'This endpoint is temporarily disabled during Sequelize to Prisma migration',
    error: 'Not Implemented'
  });
}));

router.post('/', protect, asyncHandler(async (req, res) => {
  res.status(501).json({
    message: 'This endpoint is temporarily disabled during Sequelize to Prisma migration',
    error: 'Not Implemented'
  });
}));

router.put('/:id', protect, asyncHandler(async (req, res) => {
  res.status(501).json({
    message: 'This endpoint is temporarily disabled during Sequelize to Prisma migration',
    error: 'Not Implemented'
  });
}));

router.delete('/:id', protect, adminOnly, asyncHandler(async (req, res) => {
  res.status(501).json({
    message: 'This endpoint is temporarily disabled during Sequelize to Prisma migration',
    error: 'Not Implemented'
  });
}));

module.exports = router; 