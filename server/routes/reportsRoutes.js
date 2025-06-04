const express = require('express');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Material = require('../models/Material');
const Shipment = require('../models/Shipment');
const ProgressReport = require('../models/ProgressReport');
const MaterialMovement = require('../models/MaterialMovement');
const { Op } = require('sequelize');

const router = express.Router();

// GET /api/reports/generate
// Generate a report based on query parameters
router.get('/generate', protect, adminOnly, async (req, res) => {
  try {
    const {
      type = 'stock',
      format = 'pdf',
      startDate,
      endDate,
      includeCompletedOrders = 'true',
      includeCancelledOrders = 'false',
      groupByProduct = 'true',
      includeCharts = 'true'
    } = req.query;

    // Parse boolean values from query strings
    const parsedOptions = {
      includeCompletedOrders: includeCompletedOrders === 'true',
      includeCancelledOrders: includeCancelledOrders === 'true',
      groupByProduct: groupByProduct === 'true',
      includeCharts: includeCharts === 'true'
    };

    // Parse date range
    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    } else if (startDate) {
      dateFilter.createdAt = {
        [Op.gte]: new Date(startDate)
      };
    } else if (endDate) {
      dateFilter.createdAt = {
        [Op.lte]: new Date(endDate)
      };
    }

    // Build status filter based on options
    const statusFilter = {
      [Op.or]: [{ status: 'processing' }, { status: 'created' }, { status: 'delivery' }]
    };

    if (parsedOptions.includeCompletedOrders) {
      statusFilter[Op.or].push({ status: 'completed' });
    }

    if (parsedOptions.includeCancelledOrders) {
      statusFilter[Op.or].push({ status: 'cancelled' });
    }

    // Generate report data based on type
    let reportData = {};
    let reportUrl = '';

    switch (type) {
      case 'stock':
        // Get material stock data
        const materials = await Material.findAll({
          include: [
            {
              model: MaterialMovement,
              as: 'Movements',
              where: dateFilter,
              required: false
            }
          ]
        });

        reportData = {
          materials,
          dateRange: { startDate, endDate },
          generatedAt: new Date(),
          type: 'Stock Report'
        };

        // In a real implementation, you would generate a PDF or Excel file here
        reportUrl = `/reports/stock-${Date.now()}.${format}`;
        break;

      case 'production':
        // Get production data
        const orders = await Order.findAll({
          where: {
            ...dateFilter,
            ...statusFilter
          },
          include: [
            { model: Product, as: 'Products' },
            { model: ProgressReport, as: 'ProgressReports' }
          ]
        });

        reportData = {
          orders,
          dateRange: { startDate, endDate },
          generatedAt: new Date(),
          type: 'Production Report'
        };

        // In a real implementation, you would generate a PDF or Excel file here
        reportUrl = `/reports/production-${Date.now()}.${format}`;
        break;

      case 'shipment':
        // Get shipment data
        const shipments = await Shipment.findAll({
          where: dateFilter,
          include: [
            {
              model: Order,
              as: 'Order',
              where: statusFilter,
              required: true
            }
          ]
        });

        reportData = {
          shipments,
          dateRange: { startDate, endDate },
          generatedAt: new Date(),
          type: 'Shipment Report'
        };

        // In a real implementation, you would generate a PDF or Excel file here
        reportUrl = `/reports/shipment-${Date.now()}.${format}`;
        break;

      case 'comprehensive':
        // Get comprehensive data for all areas
        const compOrders = await Order.findAll({
          where: {
            ...dateFilter,
            ...statusFilter
          },
          include: [
            { model: Product, as: 'Products' },
            { model: ProgressReport, as: 'ProgressReports' },
            { model: Shipment, as: 'Shipments' }
          ]
        });

        const compMaterials = await Material.findAll({
          include: [
            {
              model: MaterialMovement,
              as: 'Movements',
              where: dateFilter,
              required: false
            }
          ]
        });

        reportData = {
          orders: compOrders,
          materials: compMaterials,
          dateRange: { startDate, endDate },
          generatedAt: new Date(),
          type: 'Comprehensive Report'
        };

        // In a real implementation, you would generate a PDF or Excel file here
        reportUrl = `/reports/comprehensive-${Date.now()}.${format}`;
        break;

      default:
        return res.status(400).json({ message: 'Invalid report type' });
    }

    // In a real implementation, you would save the report to a file
    // and provide a URL to download it.
    // For this example, we'll just simulate success

    res.json({
      success: true,
      message: `${reportData.type} generated successfully`,
      url: reportUrl,
      format
    });
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router; 
