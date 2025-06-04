const asyncHandler = require('express-async-handler');
const { PurchaseLog, Material } = require('../models');
const { Op, fn, col } = require('sequelize');
const sequelize = require('../db');

// @desc    Get all purchase logs with filtering and pagination
// @route   GET /api/purchase-logs
// @access  Protected
const getPurchaseLogs = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    status,
    supplier,
    materialId,
    startDate,
    endDate,
    sortBy = 'purchasedDate',
    sortOrder = 'DESC'
  } = req.query;

  // Build where clause
  const where = {};
  
  if (status) where.status = status;
  if (supplier) where.supplier = { [Op.like]: `%${supplier}%` };
  if (materialId) where.materialId = materialId;
  
  if (startDate || endDate) {
    where.purchasedDate = {};
    if (startDate) where.purchasedDate[Op.gte] = new Date(startDate);
    if (endDate) where.purchasedDate[Op.lte] = new Date(endDate);
  }

  // Calculate offset
  const offset = (page - 1) * limit;

  // Get purchase logs with material info
  const { count, rows: purchaseLogs } = await PurchaseLog.findAndCountAll({
    where,
    include: [
      {
        model: Material,
        attributes: ['id', 'name', 'code', 'unit', 'image']
      }
    ],
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [[sortBy, sortOrder.toUpperCase()]],
    distinct: true
  });

  // Calculate pagination info
  const totalPages = Math.ceil(count / limit);
  
  // Get status counts for filters
  const statusCounts = await PurchaseLog.findAll({
    attributes: [
      'status',
      [fn('COUNT', col('id')), 'count']
    ],
    group: ['status'],
    raw: true
  });

  res.status(200).json({
    success: true,
    data: {
      purchaseLogs,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: count,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      filters: {
        statusCounts: statusCounts.reduce((acc, item) => {
          acc[item.status] = parseInt(item.count);
          return acc;
        }, {})
      }
    }
  });
});

// @desc    Get purchase log by ID
// @route   GET /api/purchase-logs/:id
// @access  Protected
const getPurchaseLogById = asyncHandler(async (req, res) => {
  const purchaseLog = await PurchaseLog.findByPk(req.params.id, {
    include: [
      {
        model: Material,
        attributes: ['id', 'name', 'code', 'unit', 'qtyOnHand', 'safetyStock', 'image']
      }
    ]
  });

  if (!purchaseLog) {
    res.status(404);
    throw new Error('Purchase log not found');
  }

  res.status(200).json({
    success: true,
    data: purchaseLog
  });
});

// @desc    Create new purchase log
// @route   POST /api/purchase-logs
// @access  Protected
const createPurchaseLog = asyncHandler(async (req, res) => {
  const {
    purchasedDate,
    materialId,
    stock,
    unit,
    supplier,
    price,
    status = 'dp',
    paymentMethod = 'transfer',
    picName,
    notes
  } = req.body;

  // Validate required fields
  if (!purchasedDate || !materialId || !stock || !unit) {
    res.status(400);
    throw new Error('Purchase date, material, stock, and unit are required');
  }

  // Verify material exists
  const material = await MaterialNew.findByPk(materialId);
  if (!material) {
    res.status(404);
    throw new Error('Material not found');
  }

  // Create purchase log
  const purchaseLog = await PurchaseLog.create({
    purchasedDate,
    materialId,
    stock: parseFloat(stock),
    unit,
    supplier,
    price: price ? parseFloat(price) : null,
    status,
    paymentMethod,
    picName,
    notes
  });

  // Get created purchase log with material info
  const createdPurchaseLog = await PurchaseLog.findByPk(purchaseLog.id, {
    include: [
      {
        model: Material,
        attributes: ['id', 'name', 'code', 'unit', 'image']
      }
    ]
  });

  res.status(201).json({
    success: true,
    message: 'Purchase log created successfully',
    data: createdPurchaseLog
  });
});

// @desc    Update purchase log
// @route   PUT /api/purchase-logs/:id
// @access  Protected
const updatePurchaseLog = asyncHandler(async (req, res) => {
  const purchaseLog = await PurchaseLog.findByPk(req.params.id);

  if (!purchaseLog) {
    res.status(404);
    throw new Error('Purchase log not found');
  }

  const {
    purchasedDate,
    materialId,
    stock,
    unit,
    supplier,
    price,
    status,
    paymentMethod,
    picName,
    notes
  } = req.body;

  // If materialId is being changed, verify new material exists
  if (materialId && materialId !== purchaseLog.materialId) {
    const material = await MaterialNew.findByPk(materialId);
    if (!material) {
      res.status(404);
      throw new Error('Material not found');
    }
  }

  // Update purchase log
  const updatedPurchaseLog = await purchaseLog.update({
    purchasedDate: purchasedDate || purchaseLog.purchasedDate,
    materialId: materialId || purchaseLog.materialId,
    stock: stock ? parseFloat(stock) : purchaseLog.stock,
    unit: unit || purchaseLog.unit,
    supplier: supplier !== undefined ? supplier : purchaseLog.supplier,
    price: price !== undefined ? (price ? parseFloat(price) : null) : purchaseLog.price,
    status: status || purchaseLog.status,
    paymentMethod: paymentMethod || purchaseLog.paymentMethod,
    picName: picName !== undefined ? picName : purchaseLog.picName,
    notes: notes !== undefined ? notes : purchaseLog.notes
  });

  // Get updated purchase log with material info
  const purchaseLogWithMaterial = await PurchaseLog.findByPk(updatedPurchaseLog.id, {
    include: [
      {
        model: Material,
        attributes: ['id', 'name', 'code', 'unit', 'image']
      }
    ]
  });

  res.status(200).json({
    success: true,
    message: 'Purchase log updated successfully',
    data: purchaseLogWithMaterial
  });
});

// @desc    Update purchase log status
// @route   PUT /api/purchase-logs/:id/status
// @access  Protected
const updatePurchaseLogStatus = asyncHandler(async (req, res) => {
  const { status, notes } = req.body;

  if (!status) {
    res.status(400);
    throw new Error('Status is required');
  }

  const purchaseLog = await PurchaseLog.findByPk(req.params.id);

  if (!purchaseLog) {
    res.status(404);
    throw new Error('Purchase log not found');
  }

  // Update status using instance method
  await purchaseLog.updateStatus(status, notes);

  // Get updated purchase log with material info
  const updatedPurchaseLog = await PurchaseLog.findByPk(purchaseLog.id, {
    include: [
      {
        model: Material,
        attributes: ['id', 'name', 'code', 'unit', 'image']
      }
    ]
  });

  res.status(200).json({
    success: true,
    message: `Purchase log status updated to ${status}`,
    data: updatedPurchaseLog
  });
});

// @desc    Delete purchase log
// @route   DELETE /api/purchase-logs/:id
// @access  Protected
const deletePurchaseLog = asyncHandler(async (req, res) => {
  const purchaseLog = await PurchaseLog.findByPk(req.params.id);

  if (!purchaseLog) {
    res.status(404);
    throw new Error('Purchase log not found');
  }

  await purchaseLog.destroy();

  res.status(200).json({
    success: true,
    message: 'Purchase log deleted successfully'
  });
});

// @desc    Get purchase logs by material
// @route   GET /api/purchase-logs/material/:materialId
// @access  Protected
const getPurchaseLogsByMaterial = asyncHandler(async (req, res) => {
  const { materialId } = req.params;
  const { status } = req.query;

  const purchaseLogs = await PurchaseLog.findByMaterial(materialId, status);

  res.status(200).json({
    success: true,
    data: purchaseLogs
  });
});

// @desc    Get purchase logs by supplier
// @route   GET /api/purchase-logs/supplier/:supplier
// @access  Protected
const getPurchaseLogsBySupplier = asyncHandler(async (req, res) => {
  const { supplier } = req.params;

  const purchaseLogs = await PurchaseLog.findBySupplier(supplier);

  res.status(200).json({
    success: true,
    data: purchaseLogs
  });
});

// @desc    Get purchase analytics
// @route   GET /api/purchase-logs/analytics
// @access  Protected
const getPurchaseAnalytics = asyncHandler(async (req, res) => {
  // Monthly purchase summary for last 12 months
  const monthlyData = await sequelize.query(`
    SELECT 
      DATE_FORMAT(purchasedDate, '%Y-%m') as month,
      COUNT(*) as purchaseCount,
      SUM(stock) as totalQuantity,
      SUM(stock * COALESCE(price, 0)) as totalValue,
      COUNT(CASE WHEN status = 'diterima' THEN 1 END) as deliveredCount
    FROM purchase_logs 
    WHERE purchasedDate >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
    GROUP BY DATE_FORMAT(purchasedDate, '%Y-%m')
    ORDER BY month DESC
  `, { type: sequelize.QueryTypes.SELECT });

  // Status distribution
  const statusData = await PurchaseLog.findAll({
    attributes: [
      'status',
      [fn('COUNT', col('id')), 'count'],
      [fn('SUM', sequelize.literal('stock * COALESCE(price, 0)')), 'totalValue']
    ],
    group: ['status'],
    raw: true
  });

  // Top materials by purchase frequency
  const topMaterials = await sequelize.query(`
    SELECT 
      m.name as materialName,
      m.code as materialCode,
      COUNT(pl.id) as purchaseCount,
      SUM(pl.stock) as totalQuantity,
      SUM(pl.stock * COALESCE(pl.price, 0)) as totalValue
    FROM purchase_logs pl
    JOIN materials m ON pl.materialId = m.id
    GROUP BY pl.materialId
    ORDER BY purchaseCount DESC
    LIMIT 10
  `, { type: sequelize.QueryTypes.SELECT });

  res.status(200).json({
    success: true,
    data: {
      monthlyData,
      statusData,
      topMaterials,
      generatedAt: new Date()
    }
  });
});

module.exports = {
  getPurchaseLogs,
  getPurchaseLogById,
  createPurchaseLog,
  updatePurchaseLog,
  updatePurchaseLogStatus,
  deletePurchaseLog,
  getPurchaseLogsByMaterial,
  getPurchaseLogsBySupplier,
  getPurchaseAnalytics
}; 