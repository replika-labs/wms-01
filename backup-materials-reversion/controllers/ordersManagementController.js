const asyncHandler = require('express-async-handler');
const { Order, OrderProduct, Product, User, Contact } = require('../models');
const { Op } = require('sequelize');
const MaterialStockChecker = require('../services/MaterialStockChecker');

// Cache for tailors (1 hour cache)
let tailorsCache = null;
let tailorsCacheExpiry = null;

/**
 * Optimized orders list for management interface
 * Returns minimal data with server-side filtering and pagination
 */
const getOrdersList = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    status,
    priority,
    search,
    startDate,
    endDate,
    sortBy = 'createdAt',
    sortOrder = 'DESC'
  } = req.query;

  // Build where clause
  const where = { isActive: true };
  
  if (status) where.status = status;
  if (priority) where.priority = priority;
  
  if (search) {
    where[Op.or] = [
      { orderNumber: { [Op.like]: `%${search}%` } },
      { customerNote: { [Op.like]: `%${search}%` } },
      { description: { [Op.like]: `%${search}%` } }
    ];
  }

  if (startDate || endDate) {
    where.dueDate = {};
    if (startDate) where.dueDate[Op.gte] = new Date(startDate);
    if (endDate) where.dueDate[Op.lte] = new Date(endDate);
  }

  // Calculate offset
  const offset = (parseInt(page) - 1) * parseInt(limit);

  // Get orders with optimized data structure
  const { count, rows: orders } = await Order.findAndCountAll({
    where,
    include: [
      {
        model: User,
        as: 'Tailor',
        attributes: ['id', 'name', 'whatsappPhone'],
        required: false
      },
      {
        model: Contact,
        as: 'TailorContact',
        attributes: ['id', 'name', 'whatsappPhone', 'email', 'company', 'position'],
        required: false
      },
      {
        model: Product,
        through: OrderProduct,
        attributes: ['id', 'name']
      }
    ],
    attributes: [
      'id', 'orderNumber', 'status', 'priority', 'dueDate',
      'targetPcs', 'completedPcs', 'createdAt', 'updatedAt',
      'customerNote', 'description'
    ],
    order: [[sortBy, sortOrder.toUpperCase()]],
    limit: parseInt(limit),
    offset,
    distinct: true // Important for count with includes
  });

  // Transform data for frontend
  const transformedOrders = orders.map(order => ({
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    priority: order.priority,
    dueDate: order.dueDate,
    productCount: order.Products?.length || 0,
    targetPcs: order.targetPcs,
    completedPcs: order.completedPcs,
    tailor: order.TailorContact ? {
      id: order.TailorContact.id,
      name: order.TailorContact.name,
      whatsappPhone: order.TailorContact.whatsappPhone,
      email: order.TailorContact.email,
      company: order.TailorContact.company,
      position: order.TailorContact.position
    } : (order.Tailor ? {
      id: order.Tailor.id,
      name: order.Tailor.name,
      whatsappPhone: order.Tailor.whatsappPhone
    } : null),
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    customerNote: order.customerNote,
    description: order.description
  }));

  // Get filter counts for UI
  const statusCounts = await Order.findAll({
    where: { isActive: true },
    attributes: ['status', [Order.sequelize.fn('COUNT', Order.sequelize.col('id')), 'count']],
    group: ['status'],
    raw: true
  });

  const priorityCounts = await Order.findAll({
    where: { isActive: true },
    attributes: ['priority', [Order.sequelize.fn('COUNT', Order.sequelize.col('id')), 'count']],
    group: ['priority'],
    raw: true
  });

  res.json({
    orders: transformedOrders,
    pagination: {
      total: count,
      pages: Math.ceil(count / parseInt(limit)),
      current: parseInt(page),
      limit: parseInt(limit)
    },
    filters: {
      statusCounts: statusCounts.reduce((acc, item) => {
        acc[item.status] = parseInt(item.count);
        return acc;
      }, {}),
      priorityCounts: priorityCounts.reduce((acc, item) => {
        acc[item.priority] = parseInt(item.count);
        return acc;
      }, {})
    }
  });
});

/**
 * Get cached tailors list from contacts table
 * Cached for 1 hour to reduce database calls
 */
const getTailors = asyncHandler(async (req, res) => {
  const now = new Date();
  
  // Check if cache is valid
  if (tailorsCache && tailorsCacheExpiry && now < tailorsCacheExpiry) {
    return res.json(tailorsCache);
  }

  // Fetch fresh data from contacts table where type = 'tailor'
  const tailors = await Contact.findAll({
    where: { 
      type: 'tailor',
      isActive: true 
    },
    attributes: ['id', 'name', 'whatsappPhone', 'email', 'phone', 'company', 'position'],
    order: [['name', 'ASC']]
  });

  // Update cache
  tailorsCache = tailors;
  tailorsCacheExpiry = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour

  res.json(tailors);
});

/**
 * Get single order details for modals
 * Returns complete order information
 */
const getOrderDetails = asyncHandler(async (req, res) => {
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
      },
      {
        model: Contact,
        as: 'TailorContact',
        attributes: ['id', 'name', 'email', 'phone', 'whatsappPhone', 'company', 'position']
      },
      {
        model: Product,
        through: OrderProduct,
        attributes: ['id', 'name', 'code', 'unit', 'price', 'category']
      }
    ]
  });

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  res.json(order);
});

/**
 * Optimized status update
 * Updates only status field with optimistic response
 */
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const { id } = req.params;

  const validStatuses = ['created', 'confirmed', 'processing', 'completed', 'shipped', 'delivered', 'cancelled', 'need material'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }

  const order = await Order.findOne({
    where: {
      id,
      isActive: true
    }
  });

  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }

  // Update status
  await order.update({ status });

  // Return minimal response for optimistic UI
  res.json({
    success: true,
    order: {
      id: order.id,
      status: order.status,
      updatedAt: order.updatedAt
    }
  });
});

/**
 * Optimized tailor assignment update
 * Updates only tailorContactId field with optimistic response
 */
const updateOrderTailor = asyncHandler(async (req, res) => {
  const { tailorContactId } = req.body;
  const { id } = req.params;

  const order = await Order.findOne({
    where: {
      id,
      isActive: true
    }
  });

  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }

  // Validate tailor exists if provided
  if (tailorContactId) {
    const tailor = await Contact.findOne({
      where: {
        id: tailorContactId,
        type: 'tailor',
        isActive: true
      }
    });

    if (!tailor) {
      return res.status(400).json({ message: 'Invalid tailor' });
    }
  }

  // Update tailor assignment
  await order.update({ tailorContactId: tailorContactId || null });

  // Get updated tailor info for response
  let tailorInfo = null;
  if (tailorContactId) {
    const tailor = await Contact.findByPk(tailorContactId, {
      attributes: ['id', 'name', 'whatsappPhone', 'email', 'phone', 'company']
    });
    tailorInfo = tailor;
  }

  // Return minimal response for optimistic UI
  res.json({
    success: true,
    order: {
      id: order.id,
      tailorContactId: order.tailorContactId,
      TailorContact: tailorInfo,
      updatedAt: order.updatedAt
    }
  });
});

/**
 * Clear tailors cache (for cache invalidation)
 */
const clearTailorsCache = asyncHandler(async (req, res) => {
  tailorsCache = null;
  tailorsCacheExpiry = null;
  res.json({ success: true, message: 'Tailors cache cleared' });
});

/**
 * Create new order with optimized material stock checking
 * Dedicated endpoint for orders-management with enhanced validation
 */
const createOrder = asyncHandler(async (req, res) => {
  const {
    customerNote,
    dueDate,
    description,
    priority = 'medium',
    status = 'created',
    tailorContactId,
    products = []
  } = req.body;

  // Validation
  if (!dueDate) {
    return res.status(400).json({ message: 'Due date is required' });
  }

  if (!products || products.length === 0) {
    return res.status(400).json({ message: 'At least one product is required' });
  }

  // Validate tailor if provided
  if (tailorContactId) {
    const tailor = await Contact.findOne({
      where: {
        id: tailorContactId,
        type: 'tailor',
        isActive: true
      }
    });

    if (!tailor) {
      return res.status(400).json({ message: 'Invalid tailor selected' });
    }
  }

  // Validate products exist
  const productIds = products.map(p => p.productId);
  const existingProducts = await Product.findAll({
    where: { id: productIds, isActive: true }
  });

  if (existingProducts.length !== productIds.length) {
    return res.status(400).json({ message: 'One or more products not found' });
  }

  try {
    // Generate order number
    const orderCount = await Order.count();
    const orderNumber = `ORD-${String(orderCount + 1).padStart(6, '0')}`;

    // Calculate total quantity
    const targetPcs = products.reduce((total, p) => total + p.quantity, 0);

    // Create order
    const order = await Order.create({
      orderNumber,
      customerNote: customerNote || null,
      dueDate,
      description: description || null,
      priority,
      status,
      tailorContactId: tailorContactId || null,
      targetPcs,
      completedPcs: 0,
      userId: req.user.id,
      isActive: true
    });

    // Create order-product relationships
    const orderProducts = products.map(p => ({
      orderId: order.id,
      productId: p.productId,
      qty: p.quantity
    }));

    await OrderProduct.bulkCreate(orderProducts);

    // Perform material stock checking with newly created order ID
    const materialStockChecker = new MaterialStockChecker();
    const stockResults = await materialStockChecker.checkOrderStock(
      products,
      order.id,
      req.user.id
    );

    // Get complete order with relationships for response
    const completeOrder = await Order.findByPk(order.id, {
      include: [
        {
          model: User,
          as: 'Tailor',
          attributes: ['id', 'name', 'whatsappPhone']
        },
        {
          model: Contact,
          as: 'TailorContact',
          attributes: ['id', 'name', 'whatsappPhone', 'email', 'company', 'position']
        },
        {
          model: Product,
          through: OrderProduct,
          attributes: ['id', 'name', 'code', 'unit']
        }
      ]
    });

    // Invalidate tailors cache if needed
    if (tailorContactId) {
      tailorsCache = null;
      tailorsCacheExpiry = null;
    }

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order: completeOrder,
      stockResults: {
        alerts: stockResults.alerts,
        warnings: stockResults.warnings,
        hasStockIssues: stockResults.warnings.length > 0 || stockResults.alerts.length > 0
      }
    });

  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ 
      message: 'Failed to create order',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * Update existing order with optimized validation and tailor handling
 * Dedicated endpoint for orders-management with enhanced features
 */
const updateOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    customerNote,
    dueDate,
    description,
    priority,
    status,
    tailorContactId,
    products = []
  } = req.body;

  // Find existing order
  const order = await Order.findOne({
    where: {
      id,
      isActive: true
    }
  });

  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }

  // Validation
  if (dueDate && !dueDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return res.status(400).json({ message: 'Invalid due date format' });
  }

  if (products && products.length === 0) {
    return res.status(400).json({ message: 'At least one product is required' });
  }

  // Validate tailor if provided
  if (tailorContactId) {
    const tailor = await Contact.findOne({
      where: {
        id: tailorContactId,
        type: 'tailor',
        isActive: true
      }
    });

    if (!tailor) {
      return res.status(400).json({ message: 'Invalid tailor selected' });
    }
  }

  // Validate products if provided
  if (products && products.length > 0) {
    const productIds = products.map(p => p.productId);
    const existingProducts = await Product.findAll({
      where: { id: productIds, isActive: true }
    });

    if (existingProducts.length !== productIds.length) {
      return res.status(400).json({ message: 'One or more products not found' });
    }
  }

  try {
    // Calculate new target quantity if products changed
    let targetPcs = order.targetPcs;
    if (products && products.length > 0) {
      targetPcs = products.reduce((total, p) => total + p.quantity, 0);
    }

    // Update order
    await order.update({
      customerNote: customerNote !== undefined ? customerNote : order.customerNote,
      dueDate: dueDate || order.dueDate,
      description: description !== undefined ? description : order.description,
      priority: priority || order.priority,
      status: status || order.status,
      tailorContactId: tailorContactId !== undefined ? (tailorContactId || null) : order.tailorContactId,
      targetPcs,
      updatedAt: new Date()
    });

    // Update products if provided
    if (products && products.length > 0) {
      // Remove existing product relationships
      await OrderProduct.destroy({ where: { orderId: order.id } });

      // Create new relationships
      const orderProducts = products.map(p => ({
        orderId: order.id,
        productId: p.productId,
        qty: p.quantity
      }));

      await OrderProduct.bulkCreate(orderProducts);

      // Perform material stock checking for updated products
      const materialStockChecker = new MaterialStockChecker();
      const stockResults = await materialStockChecker.checkOrderStock(
        products,
        order.id,
        req.user.id
      );

      // Include stock results in response
      const completeOrder = await Order.findByPk(order.id, {
        include: [
          {
            model: User,
            as: 'Tailor',
            attributes: ['id', 'name', 'whatsappPhone']
          },
          {
            model: Contact,
            as: 'TailorContact',
            attributes: ['id', 'name', 'whatsappPhone', 'email', 'company', 'position']
          },
          {
            model: Product,
            through: OrderProduct,
            attributes: ['id', 'name', 'code', 'unit']
          }
        ]
      });

      return res.json({
        success: true,
        message: 'Order updated successfully',
        order: completeOrder,
        stockResults: {
          alerts: stockResults.alerts,
          warnings: stockResults.warnings,
          hasStockIssues: stockResults.warnings.length > 0 || stockResults.alerts.length > 0
        }
      });
    }

    // Get updated order with relationships
    const completeOrder = await Order.findByPk(order.id, {
      include: [
        {
          model: User,
          as: 'Tailor',
          attributes: ['id', 'name', 'whatsappPhone']
        },
        {
          model: Contact,
          as: 'TailorContact',
          attributes: ['id', 'name', 'whatsappPhone', 'email', 'company', 'position']
        },
        {
          model: Product,
          through: OrderProduct,
          attributes: ['id', 'name', 'code', 'unit']
        }
      ]
    });

    res.json({
      success: true,
      message: 'Order updated successfully',
      order: completeOrder
    });

  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ 
      message: 'Failed to update order',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * Delete order with proper cleanup and safety checks
 * Soft delete to maintain data integrity
 */
const deleteOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Find existing order
  const order = await Order.findOne({
    where: {
      id,
      isActive: true
    },
    include: [
      {
        model: Product,
        through: OrderProduct,
        attributes: ['id', 'name']
      }
    ]
  });

  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }

  // Safety check: Don't allow deletion of orders in progress
  const protectedStatuses = ['processing', 'completed', 'shipped', 'delivered'];
  if (protectedStatuses.includes(order.status)) {
    return res.status(400).json({ 
      message: `Cannot delete order with status: ${order.status}. Only orders with status 'created', 'confirmed', 'cancelled', or 'need material' can be deleted.`
    });
  }

  try {
    // Soft delete - mark as inactive instead of removing
    await order.update({
      isActive: false,
      deletedAt: new Date(),
      deletedBy: req.user.id
    });

    // Log deletion for audit trail
    console.log(`Order ${order.orderNumber} deleted by user ${req.user.id} at ${new Date().toISOString()}`);

    res.json({
      success: true,
      message: `Order ${order.orderNumber} deleted successfully`,
      deletedOrder: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        deletedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({ 
      message: 'Failed to delete order',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = {
  getOrdersList,
  getTailors,
  getOrderDetails,
  updateOrderStatus,
  updateOrderTailor,
  clearTailorsCache,
  createOrder,
  updateOrder,
  deleteOrder
}; 