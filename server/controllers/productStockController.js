const asyncHandler = require('express-async-handler');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Product Stock Movement Types
 */
const STOCK_MOVEMENT_TYPES = {
    IN: 'IN',           // Stock increase (production, manual adjustment)
    OUT: 'OUT',         // Stock decrease (sales, manual adjustment)
    ADJUST: 'ADJUST'    // Direct adjustment
};

/**
 * @desc    Update product stock when order is completed
 * @route   POST /api/products/stock/complete-order
 * @access  Private
 */
const completeOrderStock = asyncHandler(async (req, res) => {
    try {
        const { orderId, userId } = req.body;

        if (!orderId || !userId) {
            return res.status(400).json({
                success: false,
                message: 'Order ID and User ID are required'
            });
        }

        // Get order with products
        const order = await prisma.order.findFirst({
            where: {
                id: parseInt(orderId),
                isActive: true
            },
            include: {
                orderProducts: {
                    include: {
                        product: true
                    }
                }
            }
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        if (order.status !== 'COMPLETED') {
            return res.status(400).json({
                success: false,
                message: 'Order must be completed to update stock'
            });
        }

        const stockUpdates = [];

        // Use transaction to ensure data consistency
        await prisma.$transaction(async (tx) => {
            for (const orderProduct of order.orderProducts) {
                const completedQty = orderProduct.completedQty || 0;

                if (completedQty > 0) {
                    // Get current product stock
                    const currentProduct = await tx.product.findUnique({
                        where: { id: orderProduct.productId }
                    });

                    const newQtyOnHand = currentProduct.qtyOnHand + completedQty;

                    // Update product stock
                    await tx.product.update({
                        where: { id: orderProduct.productId },
                        data: { qtyOnHand: newQtyOnHand }
                    });

                    // Create stock movement record (we'll need to add this table to schema)
                    // For now, we'll store this in material movement with a special note
                    await tx.materialMovement.create({
                        data: {
                            materialId: currentProduct.materialId || 1, // Fallback to first material if none linked
                            orderId: order.id,
                            userId: parseInt(userId),
                            movementType: 'IN',
                            quantity: completedQty,
                            unit: currentProduct.unit || 'pcs',
                            notes: `Stock increase from completed order ${order.orderNumber} - Product: ${currentProduct.name}`,
                            qtyAfter: newQtyOnHand,
                            movementDate: new Date()
                        }
                    });

                    stockUpdates.push({
                        productId: orderProduct.productId,
                        productName: currentProduct.name,
                        previousStock: currentProduct.qtyOnHand,
                        addedQuantity: completedQty,
                        newStock: newQtyOnHand
                    });
                }
            }
        });

        res.json({
            success: true,
            message: 'Product stock updated successfully',
            order: {
                id: order.id,
                orderNumber: order.orderNumber,
                status: order.status
            },
            stockUpdates
        });

    } catch (error) {
        console.error('Error updating product stock:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating product stock',
            error: error.message
        });
    }
});

/**
 * @desc    Manually adjust product stock
 * @route   POST /api/products/:id/stock/adjust
 * @access  Private (Admin only)
 */
const adjustProductStock = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        const { type, quantity, reason, userId } = req.body;

        if (!type || quantity === undefined || !reason || !userId) {
            return res.status(400).json({
                success: false,
                message: 'Type (IN/OUT/ADJUST), quantity, reason, and userId are required'
            });
        }

        if (!Object.values(STOCK_MOVEMENT_TYPES).includes(type)) {
            return res.status(400).json({
                success: false,
                message: 'Type must be IN, OUT, or ADJUST'
            });
        }

        const product = await prisma.product.findFirst({
            where: { id: parseInt(id) }
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        const adjustmentQuantity = parseInt(quantity);
        const oldQuantity = product.qtyOnHand;
        let newQuantity;

        switch (type) {
            case 'IN':
                newQuantity = oldQuantity + adjustmentQuantity;
                break;
            case 'OUT':
                newQuantity = oldQuantity - adjustmentQuantity;
                if (newQuantity < 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'Insufficient stock for this adjustment'
                    });
                }
                break;
            case 'ADJUST':
                newQuantity = adjustmentQuantity;
                break;
            default:
                return res.status(400).json({
                    success: false,
                    message: 'Invalid adjustment type'
                });
        }

        // Update product stock and create movement record in transaction
        await prisma.$transaction(async (tx) => {
            // Update product stock
            await tx.product.update({
                where: { id: parseInt(id) },
                data: { qtyOnHand: newQuantity }
            });

            // Create movement record
            await tx.materialMovement.create({
                data: {
                    materialId: product.materialId || 1, // Fallback to first material if none linked
                    userId: parseInt(userId),
                    movementType: type,
                    quantity: Math.abs(type === 'ADJUST' ? newQuantity - oldQuantity : adjustmentQuantity),
                    unit: product.unit || 'pcs',
                    notes: `Manual product stock ${type.toLowerCase()}: ${reason} - Product: ${product.name}`,
                    qtyAfter: newQuantity,
                    movementDate: new Date()
                }
            });
        });

        res.json({
            success: true,
            message: 'Product stock adjusted successfully',
            product: {
                id: product.id,
                name: product.name,
                code: product.code,
                previousStock: oldQuantity,
                newStock: newQuantity,
                adjustment: newQuantity - oldQuantity
            }
        });

    } catch (error) {
        console.error('Error adjusting product stock:', error);
        res.status(500).json({
            success: false,
            message: 'Error adjusting product stock',
            error: error.message
        });
    }
});

/**
 * @desc    Set product stock to specific level
 * @route   PUT /api/products/:id/stock/set
 * @access  Private (Admin only)
 */
const setProductStock = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        const { quantity, reason, userId } = req.body;

        if (quantity === undefined || !reason || !userId) {
            return res.status(400).json({
                success: false,
                message: 'Quantity, reason, and userId are required'
            });
        }

        const product = await prisma.product.findFirst({
            where: { id: parseInt(id) }
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        const oldQuantity = product.qtyOnHand;
        const newQuantity = parseInt(quantity);
        const quantityDifference = newQuantity - oldQuantity;

        // Update product stock and create movement record in transaction
        await prisma.$transaction(async (tx) => {
            // Update product stock
            await tx.product.update({
                where: { id: parseInt(id) },
                data: { qtyOnHand: newQuantity }
            });

            // Create movement record
            await tx.materialMovement.create({
                data: {
                    materialId: product.materialId || 1, // Fallback to first material if none linked
                    userId: parseInt(userId),
                    movementType: quantityDifference > 0 ? 'IN' : 'OUT',
                    quantity: Math.abs(quantityDifference),
                    unit: product.unit || 'pcs',
                    notes: `Stock level set: ${reason} - Product: ${product.name}`,
                    qtyAfter: newQuantity,
                    movementDate: new Date()
                }
            });
        });

        res.json({
            success: true,
            message: 'Product stock level set successfully',
            product: {
                id: product.id,
                name: product.name,
                code: product.code,
                previousStock: oldQuantity,
                newStock: newQuantity,
                adjustment: quantityDifference
            }
        });

    } catch (error) {
        console.error('Error setting product stock:', error);
        res.status(500).json({
            success: false,
            message: 'Error setting product stock',
            error: error.message
        });
    }
});

/**
 * @desc    Get product stock movements history
 * @route   GET /api/products/:id/stock/movements
 * @access  Private
 */
const getProductStockMovements = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        const { page = 1, limit = 20 } = req.query;

        const product = await prisma.product.findFirst({
            where: { id: parseInt(id) }
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        const offset = (parseInt(page) - 1) * parseInt(limit);

        // Get movements related to this product
        const [movements, totalCount] = await Promise.all([
            prisma.materialMovement.findMany({
                where: {
                    notes: {
                        contains: `Product: ${product.name}`
                    }
                },
                include: {
                    user: {
                        select: { id: true, name: true, email: true }
                    },
                    order: {
                        select: { id: true, orderNumber: true, status: true }
                    }
                },
                orderBy: { createdAt: 'desc' },
                take: parseInt(limit),
                skip: offset
            }),
            prisma.materialMovement.count({
                where: {
                    notes: {
                        contains: `Product: ${product.name}`
                    }
                }
            })
        ]);

        res.json({
            success: true,
            product: {
                id: product.id,
                name: product.name,
                code: product.code,
                currentStock: product.qtyOnHand,
                unit: product.unit
            },
            movements,
            pagination: {
                total: totalCount,
                pages: Math.ceil(totalCount / parseInt(limit)),
                current: parseInt(page),
                limit: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('Error fetching product stock movements:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching product stock movements',
            error: error.message
        });
    }
});

/**
 * @desc    Bulk update product stock from completed orders
 * @route   POST /api/products/stock/bulk-complete
 * @access  Private (Admin only)
 */
const bulkCompleteOrdersStock = asyncHandler(async (req, res) => {
    try {
        const { orderIds, userId } = req.body;

        if (!orderIds || !Array.isArray(orderIds) || !userId) {
            return res.status(400).json({
                success: false,
                message: 'Order IDs array and User ID are required'
            });
        }

        const completedOrders = await prisma.order.findMany({
            where: {
                id: { in: orderIds.map(id => parseInt(id)) },
                status: 'COMPLETED',
                isActive: true
            },
            include: {
                orderProducts: {
                    include: {
                        product: true
                    }
                }
            }
        });

        if (completedOrders.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No completed orders found'
            });
        }

        const allStockUpdates = [];

        // Process each order
        for (const order of completedOrders) {
            const stockUpdates = [];

            await prisma.$transaction(async (tx) => {
                for (const orderProduct of order.orderProducts) {
                    const completedQty = orderProduct.completedQty || 0;

                    if (completedQty > 0) {
                        const currentProduct = await tx.product.findUnique({
                            where: { id: orderProduct.productId }
                        });

                        const newQtyOnHand = currentProduct.qtyOnHand + completedQty;

                        await tx.product.update({
                            where: { id: orderProduct.productId },
                            data: { qtyOnHand: newQtyOnHand }
                        });

                        await tx.materialMovement.create({
                            data: {
                                materialId: currentProduct.materialId || 1,
                                orderId: order.id,
                                userId: parseInt(userId),
                                movementType: 'IN',
                                quantity: completedQty,
                                unit: currentProduct.unit || 'pcs',
                                notes: `Bulk stock increase from completed order ${order.orderNumber} - Product: ${currentProduct.name}`,
                                qtyAfter: newQtyOnHand,
                                movementDate: new Date()
                            }
                        });

                        stockUpdates.push({
                            productId: orderProduct.productId,
                            productName: currentProduct.name,
                            previousStock: currentProduct.qtyOnHand,
                            addedQuantity: completedQty,
                            newStock: newQtyOnHand
                        });
                    }
                }
            });

            allStockUpdates.push({
                orderId: order.id,
                orderNumber: order.orderNumber,
                stockUpdates
            });
        }

        res.json({
            success: true,
            message: `Bulk stock update completed for ${completedOrders.length} orders`,
            processedOrders: allStockUpdates.length,
            totalStockUpdates: allStockUpdates.reduce((total, order) => total + order.stockUpdates.length, 0),
            results: allStockUpdates
        });

    } catch (error) {
        console.error('Error in bulk stock update:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating stock for multiple orders',
            error: error.message
        });
    }
});

module.exports = {
    completeOrderStock,
    adjustProductStock,
    setProductStock,
    getProductStockMovements,
    bulkCompleteOrdersStock,
    STOCK_MOVEMENT_TYPES
}; 