const express = require('express');
const asyncHandler = require('express-async-handler');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { Order, OrderProduct, Product, MaterialPurchaseAlert } = require('../models');
const { Op } = require('sequelize');
const User = require('../models/User');
const { sequelize } = require('../config/database');
const Shipment = require('../models/Shipment');
const ProgressReport = require('../models/ProgressReport');
const RemainingFabric = require('../models/RemainingFabric');
const ProductMaterial = require('../models/ProductMaterial');
const Material = require('../models/Material');
const StatusChange = require('../models/StatusChange');
const MaterialStockChecker = require('../services/MaterialStockChecker');

const router = express.Router()

// Helper function to generate order number
const generateOrderNumber = async () => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  
  // Get last order number for today
  const lastOrder = await Order.findOne({
    where: {
      orderNumber: {
        [Op.like]: `ORD${year}${month}${day}%`
      }
    },
    order: [['orderNumber', 'DESC']]
  });

  let sequence = '001';
  if (lastOrder) {
    const lastSequence = parseInt(lastOrder.orderNumber.slice(-3));
    sequence = (lastSequence + 1).toString().padStart(3, '0');
  }

  return `ORD${year}${month}${day}${sequence}`;
};

// GET /api/orders - Get all orders with filters
router.get('/', protect, asyncHandler(async (req, res) => {
  const {
    status,
    priority,
    search,
    startDate,
    endDate
  } = req.query;

  // Build where clause
  const where = { isActive: true };
  
  if (status) where.status = status;
  if (priority) where.priority = priority;
  
  if (search) {
    where[Op.or] = [
      { orderNumber: { [Op.like]: `%${search}%` } },
      { customerNote: { [Op.like]: `%${search}%` } }
    ];
  }

  if (startDate || endDate) {
    where.dueDate = {};
    if (startDate) where.dueDate[Op.gte] = new Date(startDate);
    if (endDate) where.dueDate[Op.lte] = new Date(endDate);
  }

  const orders = await Order.findAll({
    where,
    include: [
      {
        model: User,
        attributes: ['id', 'name', 'email']
      },
      {
        model: User,
        as: 'Tailor',
        attributes: ['id', 'name', 'email', 'phone', 'whatsappPhone']
      },
      {
        model: Product,
        through: OrderProduct,
        attributes: ['id', 'name', 'code', 'unit']
      }
    ],
    order: [['createdAt', 'DESC']]
  });

  res.json(orders);
}));

// GET /api/orders/:id - Get single order
router.get('/:id', protect, asyncHandler(async (req, res) => {
  const order = await Order.findOne({
    where: {
      id: req.params.id,
      isActive: true
    },
    include: [
      {
        model: User,
        attributes: ['id', 'name', 'email']
      },
      {
        model: User,
        as: 'Tailor',
        attributes: ['id', 'name', 'email', 'phone', 'whatsappPhone']
      }
    ]
  });

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  res.json(order);
}));

// POST /api/orders - Create new order
router.post('/', protect, async (req, res) => {
  // Ensure the entire request handling logic is within this top-level try-catch
  try {
    const { products, customerNote, dueDate, description, priority: rawPriority, tailorId } = req.body;
    const userId = req.user.id;

    // Validate products array
    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ message: 'Products are required and must be an array with at least one product.' });
    }

    // Validate individual products and quantities
    for (const product of products) {
      if (!product.productId || (!product.quantity && !product.qty)) {
        return res.status(400).json({ message: 'Each product must have a productId and quantity.' });
      }
      const quantity = product.quantity || product.qty || 0;
      if (typeof quantity !== 'number' || quantity <= 0) {
        return res.status(400).json({ message: `Invalid quantity for product ID ${product.productId}. Quantity must be a positive number.` });
      }
    }

    const calculatedTargetPcs = products.reduce((sum, product) => {
      const quantity = product.quantity || product.qty || 0;
      return sum + Number(quantity);
    }, 0);

    if (calculatedTargetPcs <= 0) {
      return res.status(400).json({ message: 'Total quantity of all products must be greater than zero.' });
    }
    
    const priority = rawPriority || 'medium'; // Default priority if not provided

    const transaction = await sequelize.transaction();

    try {
      const orderNumber = await generateOrderNumber();

      console.log('Creating order with calculated target:', calculatedTargetPcs);
      
      // Create the order
      const order = await Order.create({
        orderNumber,
        userId,
        tailorId,
        targetPcs: calculatedTargetPcs,
        customerNote,
        dueDate,
        description,
        priority,
        status: 'created', // Default status
      }, { transaction });

      console.log(`Order created with ID: ${order.id}, creating ${products.length} product relationships`);

      // Create OrderProduct records using bulkCreate with detailed error handling
      try {
        // First check if all product IDs exist to avoid foreign key issues
        const productIds = products.map(p => p.productId);
        const existingProducts = await Product.findAll({
          where: { id: { [Op.in]: productIds } },
          attributes: ['id']
        });
        
        // Map to a set of IDs for quick lookup
        const existingProductIds = new Set(existingProducts.map(p => p.id));
        
        // Check for any missing products
        const missingProductIds = productIds.filter(id => !existingProductIds.has(id));
        if (missingProductIds.length > 0) {
          throw new Error(`Products not found: ${missingProductIds.join(', ')}`);
        }
        
        // Format data for bulkCreate
        const orderProductsData = products.map(product => ({
          orderId: order.id,
          productId: product.productId,
          qty: product.quantity || product.qty,
        }));

        await OrderProduct.bulkCreate(orderProductsData, { transaction });
        console.log(`Successfully created ${orderProductsData.length} OrderProduct records`);
      } catch (orderProductError) {
        console.error('Error creating OrderProduct records:', orderProductError);
        throw new Error(`Failed to create product relationships: ${orderProductError.message}`);
      }

      // Default stockResults in case MaterialStockChecker fails
      let stockResults = {
        alerts: [],
        warnings: [],
        stockAnalysis: []
      };

      // Run material stock checking with more detailed error handling
      try {
        if (typeof MaterialStockChecker === 'function') {
          console.log('Initializing MaterialStockChecker');
          const stockChecker = new MaterialStockChecker();
          stockResults = await stockChecker.checkOrderStock(products, order.id, userId);
          console.log(`Stock checking completed with ${stockResults.alerts?.length || 0} alerts`);
        } else {
          console.warn('MaterialStockChecker is not a constructor or not defined');
          stockResults.warnings.push('Material stock checking is not available');
        }
      } catch (stockError) {
        console.error('Material stock checking failed:', stockError);
        stockResults.warnings.push('Material stock checking failed: ' + (stockError.message || 'Unknown error'));
      }

      await transaction.commit();
      console.log(`Transaction committed successfully`);

      // Fetch the completed order with its products
      try {
        // Use findByPk with include to get the related products through OrderProduct
        const completeOrder = await Order.findByPk(order.id, {
          include: [
            { 
              model: User,
              attributes: ['id', 'name', 'email']
            },
            { 
              model: Product,
              through: { 
                model: OrderProduct,
                attributes: ['qty'] 
              },
              attributes: ['id', 'name', 'code', 'price', 'unit']
            }
          ]
        });

        if (!completeOrder) {
          return res.status(201).json({
            success: true,
            message: 'Order created successfully but could not fetch complete details',
            order: {
              id: order.id,
              orderNumber: order.orderNumber,
              targetPcs: calculatedTargetPcs,
              status: 'created'
            },
            purchaseAlerts: stockResults.alerts || [],
            stockWarnings: stockResults.warnings || []
          });
        }

        return res.status(201).json({
          success: true,
          message: 'Order created successfully',
          order: completeOrder,
          purchaseAlerts: stockResults.alerts || [],
          stockWarnings: stockResults.warnings || []
        });
      } catch (fetchError) {
        console.error('Error fetching complete order:', fetchError);
        
        // Return a simpler response if fetching with associations fails
        return res.status(201).json({
          success: true,
          message: 'Order created successfully but could not fetch complete details',
          order: {
            id: order.id,
            orderNumber: order.orderNumber,
            targetPcs: calculatedTargetPcs,
            status: 'created'
          },
          purchaseAlerts: stockResults.alerts || [],
          stockWarnings: stockResults.warnings || []
        });
      }
    } catch (error) {
      await transaction.rollback();
      console.error('Order creation transaction failed:', error);
      
      // Check if it's a specific error type
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({ 
          message: 'A duplicate entry was found. Please try again.' 
        });
      }
      
      if (error.name === 'SequelizeForeignKeyConstraintError') {
        return res.status(400).json({ 
          message: 'Invalid reference. One of the products may not exist.' 
        });
      }
      
      if (error.message && error.message.includes('not found')) {
        return res.status(404).json({ message: error.message });
      }
      
      return res.status(500).json({ 
        message: 'Failed to create order due to an internal error during processing.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  } catch (e) {
    console.error('Unexpected error in POST /api/orders:', e);
    return res.status(500).json({ 
      message: 'An unexpected server error occurred. Please try again.',
      details: process.env.NODE_ENV === 'development' ? e.message : undefined
    });
  }
});

// Helper function to generate status messages
function getOrderStatusMessage(status, alertCount) {
  if (status === 'need material') {
    if (alertCount > 0) {
      return `Order created with 'need material' status. ${alertCount} purchase alert(s) generated for materials below safety stock.`;
    } else {
      return `Order created with 'need material' status. Material shortage detected but alerts may not have been created due to system issues.`;
    }
  }
  return 'Order created successfully.';
}

// PUT /api/orders/:id - Update order
router.put('/:id', protect, asyncHandler(async (req, res) => {
  const order = await Order.findOne({
    where: {
      id: req.params.id,
      isActive: true
    },
    include: [{
      model: Product,
      through: OrderProduct
    }]
  });

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  // Validate status update
  if (req.body.status && req.body.status !== order.status) {
    // Hanya validasi untuk status yang membutuhkan kondisi khusus
    if (req.body.status === 'completed' && order.completedPcs < order.targetPcs) {
      res.status(400);
      throw new Error('Cannot mark as completed: Target quantity not reached');
    }

    // Jika order sudah cancelled, berikan warning tapi tetap izinkan perubahan
    if (order.status === 'cancelled') {
      console.warn(`Order ${order.orderNumber} status changed from cancelled to ${req.body.status}`);
    }

    // Jika order sudah delivered, berikan warning tapi tetap izinkan perubahan
    if (order.status === 'delivered') {
      console.warn(`Order ${order.orderNumber} status changed from delivered to ${req.body.status}`);
    }
  }

  // Start transaction
  const result = await sequelize.transaction(async (t) => {
    // Update order basic info
    const updatedOrder = await order.update({
      ...req.body,
      // Prevent updating certain fields
      orderNumber: undefined,
      userId: undefined
    }, { transaction: t });

    // Handle products update if provided
    if (req.body.products && Array.isArray(req.body.products)) {
      // Remove existing products
      await OrderProduct.destroy({
        where: { orderId: order.id },
        transaction: t
      });

      // Add new products
      if (req.body.products.length > 0) {
        await OrderProduct.bulkCreate(
          req.body.products.map(p => ({
            orderId: order.id,
            productId: p.productId,
            quantity: p.quantity
          })),
          { transaction: t }
        );
      }
    }

    // Fetch updated order with products
    const finalOrder = await Order.findOne({
      where: { id: order.id },
      include: [
        {
          model: Product,
          through: OrderProduct,
          attributes: ['id', 'name', 'code', 'unit']
        },
        {
          model: User,
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'Tailor',
          attributes: ['id', 'name', 'email', 'phone', 'whatsappPhone']
        }
      ],
      transaction: t
    });

    return finalOrder;
  });

  res.json(result);
}));

// DELETE /api/orders/:id - Soft delete order
router.delete('/:id', protect, asyncHandler(async (req, res) => {
  const order = await Order.findOne({
    where: {
      id: req.params.id,
      isActive: true
    }
  });

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  // Check if order can be cancelled
  if (!order.canBeCancelled()) {
    res.status(400);
    throw new Error('Cannot delete order in current status');
  }

  // Soft delete
  await order.update({ isActive: false });

  res.json({ message: 'Order deleted successfully' });
}));

// PUT /api/orders/:id/status - Update order status
router.put('/:id/status', protect, asyncHandler(async (req, res) => {
  const { status } = req.body;
  const { id } = req.params;
  const userId = req.user.id;

  const validStatuses = ['created', 'confirmed', 'processing', 'completed', 'shipped', 'delivered', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: 'Status tidak valid' });
  }

  const order = await Order.findByPk(id);
  if (!order) {
    return res.status(404).json({ message: 'Order tidak ditemukan' });
  }

  const oldStatus = order.status;
  
  // Validasi transisi status
  const invalidTransitions = {
    'cancelled': ['delivered', 'completed'],
    'delivered': ['created', 'confirmed', 'processing', 'cancelled'],
    'completed': ['created', 'confirmed', 'cancelled']
  };

  if (invalidTransitions[status]?.includes(oldStatus)) {
    return res.status(400).json({ 
      message: `Tidak dapat mengubah status dari ${oldStatus} ke ${status}` 
    });
  }

  // Use transaction to update status and create status change record
  const result = await sequelize.transaction(async (t) => {
    // Update order status
    order.status = status;
    await order.save({ transaction: t });

    // Create status change record
    const statusChange = await StatusChange.create({
      orderId: id,
      oldStatus,
      newStatus: status,
      changedBy: userId,
      note: req.body.note || `Status diubah dari ${oldStatus} ke ${status}`,
    }, { transaction: t });

    return { order, statusChange };
  });

  res.json({
    message: `Status order berhasil diubah ke ${status}`,
    order: result.order
  });
}));

// GET timeline data for a specific order
router.get('/:id/timeline', protect, async (req, res) => {
  try {
    const orderId = req.params.id;
    
    // Get order data with all related information
    const order = await Order.findByPk(orderId, {
      include: [
        { model: User, as: 'User' },
        { model: Product, as: 'Products' },
      ]
    });
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Get shipments
    const shipments = await Shipment.findAll({
      where: { orderId },
      order: [['createdAt', 'ASC']]
    });
    
    // Get progress reports
    const progressReports = await ProgressReport.findAll({
      where: { orderId },
      include: [{ model: User, attributes: ['id', 'name'] }],
      order: [['reportedAt', 'ASC']]
    });
    
    // Get remaining fabric reports
    const remainingFabrics = await RemainingFabric.findAll({
      where: { orderId },
      include: [{ model: Material, attributes: ['id', 'name', 'unit'] }],
      order: [['createdAt', 'ASC']]
    });
    
    // Get status changes
    const statusChanges = await StatusChange.findAll({
      where: { orderId },
      include: [{ model: User, as: 'User', attributes: ['id', 'name'] }],
      order: [['createdAt', 'ASC']]
    });

    // If no status changes recorded yet but order exists, create initial status change
    if (statusChanges.length === 0) {
      // Add initial status change (order creation)
      statusChanges.push({
        id: 0,
        orderId,
        oldStatus: null,
        newStatus: 'created',
        changedBy: order.userId,
        note: 'Order dibuat',
        createdAt: order.createdAt,
        updatedAt: order.createdAt
      });
    }
    
    res.json({
      order,
      shipments,
      progressReports,
      remainingFabrics,
      statusChanges
    });
  } catch (error) {
    console.error('Error fetching timeline data:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router; 