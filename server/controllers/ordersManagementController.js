const asyncHandler = require('express-async-handler');
const { PrismaClient } = require('@prisma/client');
// const MaterialStockChecker = require('../services/MaterialStockChecker'); // Commented out until service is updated

const prisma = new PrismaClient();

// Cache for workers (1 hour cache)
let workersCache = null;
let workersCacheExpiry = null;

/**
 * Optimized orders list for management interface
 * Returns minimal data with server-side filtering and pagination
 */
const getOrdersList = asyncHandler(async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      priority,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build where clause
    const where = { isActive: true };

    if (status && status !== 'all') {
      where.status = status;
    }

    if (priority && priority !== 'all') {
      where.priority = priority;
    }

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { customerNote: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Get orders with pagination
    const [orders, totalCount] = await Promise.all([
      prisma.order.findMany({
        where,
        select: {
          id: true,
          code: true,
          status: true,
          priority: true,
          dueDate: true,
          targetPcs: true,
          completedPcs: true,
          createdAt: true,
          workerContact: {
            select: {
              id: true,
              name: true,
              phone: true
            }
          }
        },
        orderBy: { [sortBy]: sortOrder },
        take: parseInt(limit),
        skip: offset
      }),
      prisma.order.count({ where })
    ]);

    // Get filter counts
    const [statusCounts, priorityCounts] = await Promise.all([
      prisma.order.groupBy({
        by: ['status'],
        where: { isActive: true },
        _count: { _all: true }
      }),
      prisma.order.groupBy({
        by: ['priority'],
        where: { isActive: true },
        _count: { _all: true }
      })
    ]);

    const formattedStatusCounts = statusCounts.reduce((acc, item) => {
      acc[item.status] = item._count._all;
      return acc;
    }, {});

    const formattedPriorityCounts = priorityCounts.reduce((acc, item) => {
      acc[item.priority] = item._count._all;
      return acc;
    }, {});

    res.json({
      orders,
      pagination: {
        total: totalCount,
        pages: Math.ceil(totalCount / parseInt(limit)),
        current: parseInt(page),
        limit: parseInt(limit)
      },
      filters: {
        statusCounts: formattedStatusCounts,
        priorityCounts: formattedPriorityCounts
      }
    });
  } catch (error) {
    console.error('Error fetching orders list:', error);
    res.status(500).json({
      message: 'Failed to fetch orders list',
      error: error.message
    });
  }
});

/**
 * Get cached workers list from contacts table
 * Cached for 1 hour to reduce database calls
 */
const getWorkers = asyncHandler(async (req, res) => {
  try {
    // Check cache
    const now = Date.now();
    if (workersCache && workersCacheExpiry && now < workersCacheExpiry) {
      return res.json(workersCache);
    }

    // Fetch fresh data
    const workers = await prisma.contact.findMany({
      where: {
        contactType: 'WORKER',
        isActive: true
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        whatsappPhone: true,
        company: true,
        notes: true
      },
      orderBy: { name: 'asc' }
    });

    // Cache for 1 hour
    workersCache = workers;
    workersCacheExpiry = now + (60 * 60 * 1000);

    res.json(workers);
  } catch (error) {
    console.error('Error fetching workers:', error);
    res.status(500).json({
      message: 'Failed to fetch workers',
      error: error.message
    });
  }
});

/**
 * Get single order details for modals
 * Returns complete order information
 */
const getOrderDetails = asyncHandler(async (req, res) => {
  try {
    const order = await prisma.order.findFirst({
      where: {
        id: parseInt(req.params.id),
        isActive: true
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        workerContact: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            whatsappPhone: true,
            company: true,
            notes: true
          }
        },
        orderProducts: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                code: true,
                unit: true,
                price: true,
                category: true
              }
            }
          }
        }
      }
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    console.error('Error fetching order details:', error);
    res.status(500).json({
      message: 'Failed to fetch order details',
      error: error.message
    });
  }
});

/**
 * Optimized status update
 * Updates only status field with optimistic response
 */
const updateOrderStatus = asyncHandler(async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    const validStatuses = ['created', 'confirmed', 'processing', 'completed', 'shipped', 'delivered', 'cancelled', 'need material'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const order = await prisma.order.findFirst({
      where: {
        id: parseInt(id),
        isActive: true
      }
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Update status
    const updatedOrder = await prisma.order.update({
      where: { id: parseInt(id) },
      data: { status }
    });

    // Return minimal response for optimistic UI
    res.json({
      success: true,
      order: {
        id: updatedOrder.id,
        status: updatedOrder.status,
        updatedAt: updatedOrder.updatedAt
      }
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({
      message: 'Failed to update order status',
      error: error.message
    });
  }
});

/**
 * Optimized worker assignment update
 * Updates only workerContactId field with optimistic response
 */
const updateOrderWorker = asyncHandler(async (req, res) => {
  try {
    const { workerContactId } = req.body;
    const { id } = req.params;

    const order = await prisma.order.findFirst({
      where: {
        id: parseInt(id),
        isActive: true
      }
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Validate worker exists if provided
    if (workerContactId) {
      const worker = await prisma.contact.findFirst({
        where: {
          id: parseInt(workerContactId),
          contactType: 'WORKER',
          isActive: true
        }
      });

      if (!worker) {
        return res.status(400).json({ message: 'Invalid worker' });
      }
    }

    // Update worker assignment
    const updatedOrder = await prisma.order.update({
      where: { id: parseInt(id) },
      data: { workerContactId: workerContactId ? parseInt(workerContactId) : null }
    });

    // Get updated worker info for response
    let workerInfo = null;
    if (workerContactId) {
      workerInfo = await prisma.contact.findUnique({
        where: { id: parseInt(workerContactId) },
        select: {
          id: true,
          name: true,
          whatsappPhone: true,
          email: true,
          phone: true,
          company: true
        }
      });
    }

    // Return minimal response for optimistic UI
    res.json({
      success: true,
      order: {
        id: updatedOrder.id,
        workerContactId: updatedOrder.workerContactId,
        WorkerContact: workerInfo,
        updatedAt: updatedOrder.updatedAt
      }
    });
  } catch (error) {
    console.error('Error updating order worker:', error);
    res.status(500).json({
      message: 'Failed to update order worker',
      error: error.message
    });
  }
});

/**
 * Clear workers cache (for cache invalidation)
 */
const clearWorkersCache = asyncHandler(async (req, res) => {
  workersCache = null;
  workersCacheExpiry = null;
  res.json({ success: true, message: 'Workers cache cleared' });
});

/**
 * Create new order with optimized material stock checking
 * Dedicated endpoint for orders-management with enhanced validation
 */
const createOrder = asyncHandler(async (req, res) => {
  try {
    const {
      customerNote,
      dueDate,
      description,
      priority = 'medium',
      status = 'created',
      workerContactId,
      products = []
    } = req.body;

    // Validation
    if (!dueDate) {
      return res.status(400).json({ message: 'Due date is required' });
    }

    if (!products || products.length === 0) {
      return res.status(400).json({ message: 'At least one product is required' });
    }

    // Validate worker if provided
    if (workerContactId) {
      const worker = await prisma.contact.findFirst({
        where: {
          id: parseInt(workerContactId),
          contactType: 'WORKER',
          isActive: true
        }
      });

      if (!worker) {
        return res.status(400).json({ message: 'Invalid worker selected' });
      }
    }

    // Validate products exist
    const productIds = products.map(p => parseInt(p.productId));
    const existingProducts = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, code: true }
    });

    if (existingProducts.length !== productIds.length) {
      return res.status(400).json({ message: 'One or more products are invalid' });
    }

    // Generate order code
    const orderCount = await prisma.order.count();
    const orderCode = `ORD-${String(orderCount + 1).padStart(6, '0')}`;

    // Calculate total target pieces
    const targetPcs = products.reduce((sum, p) => sum + parseInt(p.quantity || 0), 0);

    // Create order
    const order = await prisma.order.create({
      data: {
        code: orderCode,
        customerNote,
        dueDate: new Date(dueDate),
        description,
        priority,
        status,
        targetPcs,
        completedPcs: 0,
        workerContactId: workerContactId ? parseInt(workerContactId) : null,
        userId: req.user.id,
        isActive: true
      }
    });

    // Create order products
    const orderProducts = products.map(p => ({
      orderId: order.id,
      productId: parseInt(p.productId),
      quantity: parseInt(p.quantity),
      unitPrice: parseFloat(p.unitPrice || 0),
      notes: p.notes || null
    }));

    await prisma.orderProduct.createMany({
      data: orderProducts
    });

    // Get complete order with relations
    const completeOrder = await prisma.order.findUnique({
      where: { id: order.id },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        tailorContact: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            whatsappPhone: true
          }
        },
        orderProducts: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                code: true,
                unit: true,
                price: true
              }
            }
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order: completeOrder
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({
      message: 'Failed to create order',
      error: error.message
    });
  }
});

/**
 * Update existing order
 */
const updateOrder = asyncHandler(async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const {
      customerNote,
      dueDate,
      description,
      priority,
      status,
      tailorContactId,
      products = []
    } = req.body;

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        isActive: true
      }
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Validate tailor if provided
    if (tailorContactId) {
      const tailor = await prisma.contact.findFirst({
        where: {
          id: parseInt(tailorContactId),
          type: 'tailor',
          isActive: true
        }
      });

      if (!tailor) {
        return res.status(400).json({ message: 'Invalid tailor selected' });
      }
    }

    // Validate products if provided
    if (products.length > 0) {
      const productIds = products.map(p => parseInt(p.productId));
      const existingProducts = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true }
      });

      if (existingProducts.length !== productIds.length) {
        return res.status(400).json({ message: 'One or more products are invalid' });
      }
    }

    // Calculate target pieces if products updated
    let targetPcs = order.targetPcs;
    if (products.length > 0) {
      targetPcs = products.reduce((sum, p) => sum + parseInt(p.quantity || 0), 0);
    }

    // Update order
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        customerNote: customerNote !== undefined ? customerNote : order.customerNote,
        dueDate: dueDate ? new Date(dueDate) : order.dueDate,
        description: description !== undefined ? description : order.description,
        priority: priority || order.priority,
        status: status || order.status,
        tailorContactId: tailorContactId !== undefined ? (tailorContactId ? parseInt(tailorContactId) : null) : order.tailorContactId,
        targetPcs
      }
    });

    // Update products if provided
    if (products.length > 0) {
      // Delete existing order products
      await prisma.orderProduct.deleteMany({ where: { orderId } });

      // Create new order products
      const orderProducts = products.map(p => ({
        orderId,
        productId: parseInt(p.productId),
        quantity: parseInt(p.quantity),
        unitPrice: parseFloat(p.unitPrice || 0),
        notes: p.notes || null
      }));

      await prisma.orderProduct.createMany({
        data: orderProducts
      });
    }

    // Get complete updated order
    const completeOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        tailorContact: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            whatsappPhone: true
          }
        },
        orderProducts: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                code: true,
                unit: true,
                price: true
              }
            }
          }
        }
      }
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
      error: error.message
    });
  }
});

/**
 * Delete order (soft delete)
 */
const deleteOrder = asyncHandler(async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        isActive: true
      }
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if order can be deleted (business rules)
    const protectedStatuses = ['processing', 'completed', 'shipped', 'delivered'];
    if (protectedStatuses.includes(order.status)) {
      return res.status(400).json({
        message: `Cannot delete order with status: ${order.status}. Only orders with status 'created', 'confirmed', 'cancelled', or 'need material' can be deleted.`
      });
    }

    // Soft delete
    await prisma.order.update({
      where: { id: orderId },
      data: {
        isActive: false,
        deletedAt: new Date(),
        deletedBy: req.user.id
      }
    });

    console.log(`Order ${order.code} deleted by user ${req.user.id} at ${new Date().toISOString()}`);

    res.json({
      success: true,
      message: `Order ${order.code} deleted successfully`,
      order: {
        id: order.id,
        code: order.code,
        status: order.status,
        deletedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({
      message: 'Failed to delete order',
      error: error.message
    });
  }
});

/**
 * Get timeline data for a specific order
 * Returns comprehensive order timeline including status changes, shipments, progress reports
 */
const getOrderTimeline = asyncHandler(async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);

    // Get order data with all related information
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        isActive: true
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        orderProducts: {
          include: {
            product: {
              select: { id: true, name: true, code: true }
            }
          }
        }
      }
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Placeholder timeline data - these tables may not exist yet in Prisma schema
    const timeline = [
      {
        id: 1,
        type: 'order_created',
        title: 'Order Created',
        description: `Order ${order.code} was created`,
        timestamp: order.createdAt,
        user: order.user?.name || 'System',
        status: 'created'
      }
    ];

    // Add status change events if order has been updated
    if (order.updatedAt > order.createdAt) {
      timeline.push({
        id: 2,
        type: 'status_change',
        title: 'Status Updated',
        description: `Order status changed to ${order.status}`,
        timestamp: order.updatedAt,
        user: order.user?.name || 'System',
        status: order.status
      });
    }

    // TODO: Add real timeline data when Prisma schema includes:
    // - Shipments table
    // - ProgressReport table  
    // - StatusChange table
    // - MaterialMovement table

    res.json({
      order,
      timeline,
      // Placeholder data for now
      shipments: [],
      progressReports: [],
      remainingFabrics: [],
      statusChanges: timeline.filter(t => t.type === 'status_change')
    });
  } catch (error) {
    console.error('Error fetching order timeline:', error);
    res.status(500).json({
      message: 'Failed to fetch order timeline',
      error: error.message
    });
  }
});

module.exports = {
  getOrdersList,
  getWorkers,
  getOrderDetails,
  updateOrderStatus,
  updateOrderWorker,
  clearWorkersCache,
  createOrder,
  updateOrder,
  deleteOrder,
  getOrderTimeline
}; 