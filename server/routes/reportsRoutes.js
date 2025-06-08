const express = require('express');
// const Order = require('../models/Order'); // DISABLED: Using Prisma now
// const Product = require('../models/Product'); // DISABLED: Using Prisma now
// const Material = require('../models/Material'); // DISABLED: Using Prisma now
// const Shipment = require('../models/Shipment'); // DISABLED: Using Prisma now
// const ProgressReport = require('../models/ProgressReport'); // DISABLED: Using Prisma now
// const MaterialMovement = require('../models/MaterialMovement'); // DISABLED: Using Prisma now
const asyncHandler = require('express-async-handler');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

// TEMPORARY: All routes disabled during Sequelize to Prisma migration

router.get('/sales-report', protect, adminOnly, asyncHandler(async (req, res) => {
  res.status(501).json({
    message: 'This endpoint is temporarily disabled during Sequelize to Prisma migration',
    error: 'Not Implemented'
  });
}));

router.get('/production-report', protect, adminOnly, asyncHandler(async (req, res) => {
  res.status(501).json({
    message: 'This endpoint is temporarily disabled during Sequelize to Prisma migration',
    error: 'Not Implemented'
  });
}));

router.get('/inventory-report', protect, adminOnly, asyncHandler(async (req, res) => {
  res.status(501).json({
    message: 'This endpoint is temporarily disabled during Sequelize to Prisma migration',
    error: 'Not Implemented'
  });
}));

router.get('/shipment-report', protect, adminOnly, asyncHandler(async (req, res) => {
  res.status(501).json({
    message: 'This endpoint is temporarily disabled during Sequelize to Prisma migration',
    error: 'Not Implemented'
  });
}));

router.get('/progress-report', protect, adminOnly, asyncHandler(async (req, res) => {
  res.status(501).json({
    message: 'This endpoint is temporarily disabled during Sequelize to Prisma migration',
    error: 'Not Implemented'
  });
}));

router.get('/material-movement-report', protect, adminOnly, asyncHandler(async (req, res) => {
  res.status(501).json({
    message: 'This endpoint is temporarily disabled during Sequelize to Prisma migration',
    error: 'Not Implemented'
  });
}));

module.exports = router; 
