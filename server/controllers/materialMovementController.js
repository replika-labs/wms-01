const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const materialMovementController = {
    // Get all material movements with filtering, sorting, and pagination
    async getAllMovements(req, res) {
        try {
            const {
                page = 1,
                limit = 10,
                sortBy = 'movementDate',
                sortOrder = 'desc',
                movementType,
                materialId,
                orderId,
                userId,
                purchaseLogId,
                startDate,
                endDate,
                search
            } = req.query;

            const skip = (parseInt(page) - 1) * parseInt(limit);
            const take = parseInt(limit);

            // Validate sort field to prevent injection
            const validSortFields = ['movementDate', 'createdAt', 'quantity', 'totalCost', 'movementType'];
            const safeSortBy = validSortFields.includes(sortBy) ? sortBy : 'movementDate';

            // Build where conditions
            const where = {
                isActive: true,
                ...(movementType && { movementType }),
                ...(materialId && { materialId: parseInt(materialId) }),
                ...(orderId && { orderId: parseInt(orderId) }),
                ...(userId && { userId: parseInt(userId) }),
                ...(purchaseLogId && { purchaseLogId: parseInt(purchaseLogId) }),
                ...(startDate || endDate) && {
                    movementDate: {
                        ...(startDate && { gte: new Date(startDate) }),
                        ...(endDate && { lte: new Date(endDate) })
                    }
                },
                ...(search && {
                    OR: [
                        { notes: { contains: search, mode: 'insensitive' } },
                        { material: { name: { contains: search, mode: 'insensitive' } } },
                        { material: { code: { contains: search, mode: 'insensitive' } } }
                    ]
                })
            };

            // Get total count for pagination
            const total = await prisma.materialMovement.count({ where });

            // Get movements with relations
            const movements = await prisma.materialMovement.findMany({
                where,
                include: {
                    material: {
                        select: {
                            id: true,
                            name: true,
                            code: true,
                            unit: true
                        }
                    },
                    order: {
                        select: {
                            id: true,
                            orderNumber: true
                        }
                    },
                    user: {
                        select: {
                            id: true,
                            name: true
                        }
                    },
                    purchaseLog: {
                        select: {
                            id: true,
                            supplier: true,
                            purchaseDate: true,
                            invoiceNumber: true
                        }
                    }
                },
                orderBy: {
                    [safeSortBy]: sortOrder
                },
                skip,
                take
            });

            const pagination = {
                current: parseInt(page),
                total,
                pages: Math.ceil(total / take),
                limit: take
            };

            res.json({
                success: true,
                message: 'Material movements retrieved successfully',
                data: {
                    movements,
                    pagination
                }
            });

        } catch (error) {
            console.error('Error getting material movements:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve material movements',
                error: error.message
            });
        }
    },

    // Get movement analytics
    async getAnalytics(req, res) {
        try {
            const {
                startDate,
                endDate,
                materialId,
                movementType
            } = req.query;

            const where = {
                isActive: true,
                ...(materialId && { materialId: parseInt(materialId) }),
                ...(movementType && { movementType }),
                ...(startDate || endDate) && {
                    movementDate: {
                        ...(startDate && { gte: new Date(startDate) }),
                        ...(endDate && { lte: new Date(endDate) })
                    }
                }
            };

            // Total movements
            const totalMovements = await prisma.materialMovement.count({ where });

            // Movements by type
            const movementsByType = await prisma.materialMovement.groupBy({
                by: ['movementType'],
                where,
                _count: {
                    id: true
                },
                _sum: {
                    quantity: true,
                    totalCost: true
                }
            });

            // Top materials by movement frequency
            const topMaterials = await prisma.materialMovement.groupBy({
                by: ['materialId'],
                where,
                _count: {
                    id: true
                },
                _sum: {
                    quantity: true,
                    totalCost: true
                },
                orderBy: {
                    _count: {
                        id: 'desc'
                    }
                },
                take: 10
            });

            // Get material details for top materials
            const materialIds = topMaterials.map(item => item.materialId);
            const materialDetails = await prisma.material.findMany({
                where: {
                    id: { in: materialIds }
                },
                select: {
                    id: true,
                    name: true,
                    code: true,
                    unit: true
                }
            });

            const topMaterialsWithDetails = topMaterials.map(item => ({
                ...item,
                material: materialDetails.find(m => m.id === item.materialId)
            }));

            // Monthly trends (last 12 months)
            const twelveMonthsAgo = new Date();
            twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

            const monthlyTrends = await prisma.$queryRaw`
        SELECT 
          DATE_TRUNC('month', "movementDate") as month,
          "movementType",
          COUNT(*)::integer as count,
          SUM("quantity")::decimal as total_quantity,
          SUM("totalCost")::decimal as total_cost
        FROM "material_movements"
        WHERE "isActive" = true 
          AND "movementDate" >= ${twelveMonthsAgo}
          ${materialId ? prisma.Prisma.sql`AND "materialId" = ${parseInt(materialId)}` : prisma.Prisma.empty}
        GROUP BY DATE_TRUNC('month', "movementDate"), "movementType"
        ORDER BY month DESC
      `;

            res.json({
                success: true,
                message: 'Analytics retrieved successfully',
                data: {
                    totalMovements,
                    movementsByType,
                    topMaterials: topMaterialsWithDetails,
                    monthlyTrends
                }
            });

        } catch (error) {
            console.error('Error getting analytics:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve analytics',
                error: error.message
            });
        }
    },

    // Get movement by ID
    async getMovementById(req, res) {
        try {
            const { id } = req.params;

            const movement = await prisma.materialMovement.findFirst({
                where: {
                    id: parseInt(id),
                    isActive: true
                },
                include: {
                    material: true,
                    order: true,
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    },
                    purchaseLog: true
                }
            });

            if (!movement) {
                return res.status(404).json({
                    success: false,
                    message: 'Material movement not found'
                });
            }

            res.json({
                success: true,
                message: 'Material movement retrieved successfully',
                data: movement
            });

        } catch (error) {
            console.error('Error getting movement by ID:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve material movement',
                error: error.message
            });
        }
    },

    // Create new movement
    async createMovement(req, res) {
        try {
            const {
                materialId,
                orderId,
                movementType,
                quantity,
                costPerUnit,
                notes,
                movementDate
            } = req.body;

            // Validate required fields
            if (!materialId || !movementType || !quantity) {
                return res.status(400).json({
                    success: false,
                    message: 'Material ID, movement type, and quantity are required'
                });
            }

            // Validate movement type
            const validMovementTypes = ['IN', 'OUT', 'ADJUST'];
            if (!validMovementTypes.includes(movementType)) {
                return res.status(400).json({
                    success: false,
                    message: 'Movement type must be IN, OUT, or ADJUST'
                });
            }

            // Get material to check availability and calculate new stock
            const material = await prisma.material.findUnique({
                where: { id: parseInt(materialId) }
            });

            if (!material) {
                return res.status(404).json({
                    success: false,
                    message: 'Material not found'
                });
            }

            const quantityDecimal = parseFloat(quantity);
            const costPerUnitDecimal = costPerUnit ? parseFloat(costPerUnit) : null;
            let qtyAfter = parseFloat(material.qtyOnHand);

            // Calculate quantity after movement
            if (movementType === 'IN') {
                qtyAfter += quantityDecimal;
            } else if (movementType === 'OUT') {
                qtyAfter -= quantityDecimal;
                // Check if sufficient stock
                if (qtyAfter < 0) {
                    return res.status(400).json({
                        success: false,
                        message: `Insufficient stock. Available: ${material.qtyOnHand}, Required: ${quantityDecimal}`
                    });
                }
            } else if (movementType === 'ADJUST') {
                qtyAfter = quantityDecimal; // For adjustments, set absolute value
            }

            // Calculate total cost
            const totalCost = costPerUnitDecimal ? quantityDecimal * costPerUnitDecimal : null;

            // Get user ID from token (assuming it's set in middleware)
            const userId = req.user?.id || 1; // Fallback to admin user

            // Start transaction
            const result = await prisma.$transaction(async (tx) => {
                // Create movement record
                const movement = await tx.materialMovement.create({
                    data: {
                        materialId: parseInt(materialId),
                        orderId: orderId ? parseInt(orderId) : null,
                        userId,
                        movementType,
                        quantity: quantityDecimal,
                        unit: material.unit,
                        costPerUnit: costPerUnitDecimal,
                        totalCost,
                        notes,
                        qtyAfter,
                        movementDate: movementDate ? new Date(movementDate) : new Date()
                    },
                    include: {
                        material: {
                            select: {
                                id: true,
                                name: true,
                                code: true,
                                unit: true
                            }
                        },
                        user: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                });

                // Update material stock
                await tx.material.update({
                    where: { id: parseInt(materialId) },
                    data: { qtyOnHand: qtyAfter }
                });

                return movement;
            });

            res.status(201).json({
                success: true,
                message: 'Material movement created successfully',
                data: result
            });

        } catch (error) {
            console.error('Error creating movement:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create material movement',
                error: error.message
            });
        }
    },

    // Update movement (limited - cannot change quantity after creation for audit purposes)
    async updateMovement(req, res) {
        try {
            const { id } = req.params;
            const { notes, movementDate } = req.body;

            // Check if movement exists and is not from purchase (purchase movements are immutable)
            const existingMovement = await prisma.materialMovement.findFirst({
                where: {
                    id: parseInt(id),
                    isActive: true
                }
            });

            if (!existingMovement) {
                return res.status(404).json({
                    success: false,
                    message: 'Material movement not found'
                });
            }

            if (existingMovement.purchaseLogId) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot modify purchase-generated movements'
                });
            }

            const updatedMovement = await prisma.materialMovement.update({
                where: { id: parseInt(id) },
                data: {
                    notes,
                    movementDate: movementDate ? new Date(movementDate) : undefined,
                    updatedAt: new Date()
                },
                include: {
                    material: {
                        select: {
                            id: true,
                            name: true,
                            code: true,
                            unit: true
                        }
                    },
                    user: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                }
            });

            res.json({
                success: true,
                message: 'Material movement updated successfully',
                data: updatedMovement
            });

        } catch (error) {
            console.error('Error updating movement:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update material movement',
                error: error.message
            });
        }
    },

    // Soft delete movement (only manual movements, not purchase-generated)
    async deleteMovement(req, res) {
        try {
            const { id } = req.params;

            // Check if movement exists and is not from purchase
            const existingMovement = await prisma.materialMovement.findFirst({
                where: {
                    id: parseInt(id),
                    isActive: true
                },
                include: {
                    material: true
                }
            });

            if (!existingMovement) {
                return res.status(404).json({
                    success: false,
                    message: 'Material movement not found'
                });
            }

            if (existingMovement.purchaseLogId) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot delete purchase-generated movements'
                });
            }

            // Reverse the stock change and soft delete in transaction
            await prisma.$transaction(async (tx) => {
                // Reverse stock change
                const material = existingMovement.material;
                let newQtyOnHand = parseFloat(material.qtyOnHand);

                if (existingMovement.movementType === 'IN') {
                    newQtyOnHand -= parseFloat(existingMovement.quantity);
                } else if (existingMovement.movementType === 'OUT') {
                    newQtyOnHand += parseFloat(existingMovement.quantity);
                } else if (existingMovement.movementType === 'ADJUST') {
                    // For adjustments, we need to find the previous stock level
                    // This is complex, so for now we'll prevent deletion of adjustments
                    throw new Error('Cannot delete adjustment movements - create a new adjustment instead');
                }

                // Check if reversal would result in negative stock
                if (newQtyOnHand < 0) {
                    throw new Error('Cannot delete movement - would result in negative stock');
                }

                // Update material stock
                await tx.material.update({
                    where: { id: existingMovement.materialId },
                    data: { qtyOnHand: newQtyOnHand }
                });

                // Soft delete movement
                await tx.materialMovement.update({
                    where: { id: parseInt(id) },
                    data: { isActive: false }
                });
            });

            res.json({
                success: true,
                message: 'Material movement deleted successfully'
            });

        } catch (error) {
            console.error('Error deleting movement:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete material movement',
                error: error.message
            });
        }
    },

    // Get movements by material ID
    async getMovementsByMaterial(req, res) {
        try {
            const { materialId } = req.params;
            const {
                page = 1,
                limit = 10,
                movementType,
                startDate,
                endDate
            } = req.query;

            const skip = (parseInt(page) - 1) * parseInt(limit);
            const take = parseInt(limit);

            const where = {
                materialId: parseInt(materialId),
                isActive: true,
                ...(movementType && { movementType }),
                ...(startDate || endDate) && {
                    movementDate: {
                        ...(startDate && { gte: new Date(startDate) }),
                        ...(endDate && { lte: new Date(endDate) })
                    }
                }
            };

            const total = await prisma.materialMovement.count({ where });

            const movements = await prisma.materialMovement.findMany({
                where,
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true
                        }
                    },
                    order: {
                        select: {
                            id: true,
                            orderNumber: true
                        }
                    },
                    purchaseLog: {
                        select: {
                            id: true,
                            supplier: true,
                            purchaseDate: true
                        }
                    }
                },
                orderBy: {
                    movementDate: 'desc'
                },
                skip,
                take
            });

            const pagination = {
                current: parseInt(page),
                total,
                pages: Math.ceil(total / take),
                limit: take
            };

            res.json({
                success: true,
                message: 'Material movements retrieved successfully',
                data: {
                    movements,
                    pagination
                }
            });

        } catch (error) {
            console.error('Error getting movements by material:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve material movements',
                error: error.message
            });
        }
    },

    // Get movements by order ID
    async getMovementsByOrder(req, res) {
        try {
            const { orderId } = req.params;

            const movements = await prisma.materialMovement.findMany({
                where: {
                    orderId: parseInt(orderId),
                    isActive: true
                },
                include: {
                    material: {
                        select: {
                            id: true,
                            name: true,
                            code: true,
                            unit: true
                        }
                    },
                    user: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                },
                orderBy: {
                    movementDate: 'desc'
                }
            });

            res.json({
                success: true,
                message: 'Order material movements retrieved successfully',
                data: movements
            });

        } catch (error) {
            console.error('Error getting movements by order:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve order material movements',
                error: error.message
            });
        }
    },

    // Get current inventory for a material
    async getMaterialInventory(req, res) {
        try {
            const { materialId } = req.params;

            const material = await prisma.material.findUnique({
                where: { id: parseInt(materialId) },
                select: {
                    id: true,
                    name: true,
                    code: true,
                    unit: true,
                    qtyOnHand: true,
                    minStock: true,
                    maxStock: true,
                    reorderPoint: true
                }
            });

            if (!material) {
                return res.status(404).json({
                    success: false,
                    message: 'Material not found'
                });
            }

            // Get recent movements
            const recentMovements = await prisma.materialMovement.findMany({
                where: {
                    materialId: parseInt(materialId),
                    isActive: true
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                },
                orderBy: {
                    movementDate: 'desc'
                },
                take: 10
            });

            // Calculate movement summary
            const movementSummary = await prisma.materialMovement.groupBy({
                by: ['movementType'],
                where: {
                    materialId: parseInt(materialId),
                    isActive: true,
                    movementDate: {
                        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
                    }
                },
                _sum: {
                    quantity: true
                },
                _count: {
                    id: true
                }
            });

            res.json({
                success: true,
                message: 'Material inventory retrieved successfully',
                data: {
                    material,
                    recentMovements,
                    movementSummary,
                    stockStatus: {
                        isLowStock: parseFloat(material.qtyOnHand) <= parseFloat(material.minStock || 0),
                        isOverStock: parseFloat(material.qtyOnHand) >= parseFloat(material.maxStock || 999999),
                        needsReorder: parseFloat(material.qtyOnHand) <= parseFloat(material.reorderPoint || 0)
                    }
                }
            });

        } catch (error) {
            console.error('Error getting material inventory:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve material inventory',
                error: error.message
            });
        }
    }
};

module.exports = materialMovementController; 