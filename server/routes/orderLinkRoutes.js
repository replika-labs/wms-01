const express = require('express');
const asyncHandler = require('express-async-handler');
const { protect, adminOnly } = require('../middleware/authMiddleware');
// const { Order, OrderProduct, Product, Contact, User, ProgressReport, ProductProgressPhoto } = require('../models'); // DISABLED: Using Prisma now
// const MaterialMovementController = require('../controllers/materialMovementController'); // DISABLED: Using Prisma now
// const OrderProductCompletionService = require('../services/OrderProductCompletionService'); // DISABLED: Using Prisma now
const crypto = require('crypto');
// const { sequelize } = require('../config/database'); // DISABLED: Using Prisma now
// const { Op, Transaction } = require('sequelize'); // DISABLED: Using Prisma now

const router = express.Router();

// TEMPORARY: All routes disabled during Sequelize to Prisma migration

// Helper function to generate a secure token
const generateToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// GET /api/order-links/:token - Get order details by token (Public Access - no user token needed)
router.get('/:token', asyncHandler(async (req, res) => {
  res.status(501).json({
    message: 'This endpoint is temporarily disabled during Sequelize to Prisma migration',
    error: 'Not Implemented'
  });
}));

// GET /api/order-links/:linkId/status 
router.get('/:linkId/status', asyncHandler(async (req, res) => {
  res.status(501).json({
    message: 'This endpoint is temporarily disabled during Sequelize to Prisma migration',
    error: 'Not Implemented'
  });
}));

// GET /api/order-links/:linkId/progress
router.get('/:linkId/progress', asyncHandler(async (req, res) => {
  res.status(501).json({
    message: 'This endpoint is temporarily disabled during Sequelize to Prisma migration',
    error: 'Not Implemented'
  });
}));

// POST /api/order-links - Create new order link
router.post('/', protect, adminOnly, asyncHandler(async (req, res) => {
  res.status(501).json({
    message: 'This endpoint is temporarily disabled during Sequelize to Prisma migration',
    error: 'Not Implemented'
  });
}));

// POST /api/order-links/:token/progress
router.post('/:token/progress', asyncHandler(async (req, res) => {
  res.status(501).json({
    message: 'This endpoint is temporarily disabled during Sequelize to Prisma migration',
    error: 'Not Implemented'
  });
}));

// PUT /api/order-links/:id
router.put('/:id', protect, adminOnly, asyncHandler(async (req, res) => {
  res.status(501).json({
    message: 'This endpoint is temporarily disabled during Sequelize to Prisma migration',
    error: 'Not Implemented'
  });
}));

// DELETE /api/order-links/:id
router.delete('/:id', protect, adminOnly, asyncHandler(async (req, res) => {
  res.status(501).json({
    message: 'This endpoint is temporarily disabled during Sequelize to Prisma migration',
    error: 'Not Implemented'
  });
}));

module.exports = router; 