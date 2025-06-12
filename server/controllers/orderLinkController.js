const asyncHandler = require('express-async-handler');
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

// Helper function to generate a secure token
const generateToken = () => {
    return crypto.randomBytes(32).toString('hex');
};

/**
 * @desc    Get order details by token (Public Access)
 * @route   GET /api/order-links/:token
 * @access  Public
 */
const getOrderByToken = asyncHandler(async (req, res) => {
    try {
        const { token } = req.params;

        const orderLink = await prisma.orderLink.findFirst({
            where: {
                linkToken: token,
                isActive: true,
                OR: [
                    { expiresAt: null },
                    { expiresAt: { gt: new Date() } }
                ]
            },
            include: {
                order: {
                    include: {
                        orderProducts: {
                            include: {
                                product: {
                                    include: {
                                        baseMaterial: {
                                            select: {
                                                id: true,
                                                name: true,
                                                code: true,
                                                unit: true
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        progressReports: {
                            orderBy: { createdAt: 'desc' },
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        name: true
                                    }
                                },
                                order: {
                                    select: {
                                        workerContactId: true,
                                        workerContact: {
                                            select: {
                                                id: true,
                                                name: true,
                                                phone: true,
                                                whatsappPhone: true,
                                                email: true,
                                                contactType: true
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        materialMovements: {
                            where: { movementType: 'OUT' },
                            include: {
                                material: {
                                    select: {
                                        id: true,
                                        name: true,
                                        code: true,
                                        unit: true
                                    }
                                }
                            },
                            orderBy: { movementDate: 'desc' }
                        },
                        workerContact: {
                            select: {
                                id: true,
                                name: true,
                                phone: true,
                                whatsappPhone: true,
                                email: true,
                                contactType: true
                            }
                        },
                    }
                },
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });

        if (!orderLink) {
            return res.status(404).json({
                success: false,
                message: 'Order link not found or has expired'
            });
        }

        // Calculate completion summary for the frontend
        const order = orderLink.order;
        const completionSummary = {
            totalProducts: order.orderProducts?.length || 0,
            completedProducts: 0, // This would need actual completion logic
            totalPieces: order.targetPcs || 0,
            completedPieces: order.completedPcs || 0,
            orderCompletionPercentage: order.targetPcs > 0 ? Math.round((order.completedPcs / order.targetPcs) * 100) : 0
        };

        // Determine incomplete products (simplified)
        const incompleteProducts = order.orderProducts?.filter(op => {
            // This is a simplified check - you may want more sophisticated completion logic
            return (op.completedQty || 0) < (op.quantity || 0);
        }) || [];

        res.json({
            success: true,
            message: 'Order link retrieved successfully',
            orderLink,
            completionSummary,
            incompleteProducts
        });

    } catch (error) {
        console.error('Error getting order by token:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve order link',
            error: error.message
        });
    }
});

/**
 * @desc    Create new order link
 * @route   POST /api/order-links
 * @access  Private (Admin only)
 */
const createOrderLink = asyncHandler(async (req, res) => {
    try {
        const { orderId, expiresAt } = req.body;
        const userId = req.user.id;

        // Validate order exists
        const order = await prisma.order.findFirst({
            where: { id: parseInt(orderId), isActive: true }
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Check if order link already exists for this order
        const existingLink = await prisma.orderLink.findFirst({
            where: { orderId: parseInt(orderId), isActive: true }
        });

        if (existingLink) {
            return res.status(400).json({
                success: false,
                message: 'Order link already exists for this order'
            });
        }

        // Generate unique token
        let linkToken;
        let tokenExists = true;

        while (tokenExists) {
            linkToken = generateToken();
            const existing = await prisma.orderLink.findFirst({
                where: { linkToken }
            });
            tokenExists = !!existing;
        }

        // Create order link
        const orderLink = await prisma.orderLink.create({
            data: {
                orderId: parseInt(orderId),
                userId,
                linkToken,
                isActive: true,
                expiresAt: expiresAt ? new Date(expiresAt) : null
            },
            include: {
                order: {
                    select: {
                        id: true,
                        orderNumber: true,
                        status: true,
                        targetPcs: true,
                        completedPcs: true
                    }
                },
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });

        res.status(201).json({
            success: true,
            message: 'Order link created successfully',
            orderLink,
            token: linkToken,
            linkUrl: `${req.protocol}://${req.get('host')}/order-progress/${linkToken}`
        });

    } catch (error) {
        console.error('Error creating order link:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create order link',
            error: error.message
        });
    }
});

/**
 * @desc    Submit progress report via order link
 * @route   POST /api/order-links/:token/progress
 * @access  Public (via token)
 */
const submitProgress = asyncHandler(async (req, res) => {
    try {
        const { token } = req.params;
        const {
            progressType,
            productProgressData,
            overallNote,
            overallPhoto,
            workerName,
            isCompletingOrder,
            // Legacy support
            pcsFinished,
            photoUrl,
            resiPengiriman,
            note
        } = req.body;

        // Validate order link
        const orderLink = await prisma.orderLink.findFirst({
            where: {
                linkToken: token,
                isActive: true,
                OR: [
                    { expiresAt: null },
                    { expiresAt: { gt: new Date() } }
                ]
            },
            include: {
                order: {
                    include: {
                        orderProducts: {
                            include: {
                                product: {
                                    include: {
                                        baseMaterial: {
                                            select: {
                                                id: true,
                                                name: true,
                                                code: true,
                                                unit: true,
                                                qtyOnHand: true
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                user: true
            }
        });

        if (!orderLink) {
            return res.status(404).json({
                success: false,
                message: 'Order link not found or has expired'
            });
        }

        const { order, user } = orderLink;

        // Handle per-product progress submission
        if (progressType === 'per-product' && productProgressData && Array.isArray(productProgressData)) {
            console.log('🔍 Processing per-product progress submission');
            console.log('🔍 Product progress data:', productProgressData);

            // Validate each product progress entry
            if (productProgressData.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'At least one product progress entry is required'
                });
            }

            // Calculate total pieces from all products
            const totalPcsFinished = productProgressData.reduce((sum, product) => sum + (product.pcsFinished || 0), 0);

            if (totalPcsFinished <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Total completed pieces must be greater than 0'
                });
            }

            const remainingPcs = order.targetPcs - order.completedPcs;
            if (totalPcsFinished > remainingPcs) {
                return res.status(400).json({
                    success: false,
                    message: `Cannot report more than remaining pieces. Remaining: ${remainingPcs}, Attempting: ${totalPcsFinished}`
                });
            }

            console.log('🔍 Validation passed:', {
                totalPcsFinished,
                remainingPcs,
                willCompleteOrder: (order.completedPcs + totalPcsFinished) >= order.targetPcs
            });

            // Start transaction for per-product processing
            const result = await prisma.$transaction(async (tx) => {
                const createdReports = [];
                const materialMovements = [];
                let totalMaterialUsed = 0;

                // Process each product's progress
                for (const productProgress of productProgressData) {
                    const {
                        productId,
                        orderProductId,
                        pcsFinished: productPcsFinished,
                        materialUsed,
                        workHours,
                        qualityScore,
                        qualityNotes,
                        challenges,
                        estimatedCompletion,
                        photos
                    } = productProgress;

                    console.log('🔍 Processing product:', {
                        productId,
                        orderProductId,
                        productPcsFinished,
                        materialUsed,
                        hasPhotos: photos?.length > 0
                    });

                    // Find the order product to validate
                    const orderProduct = order.orderProducts.find(op => op.id === orderProductId);
                    if (!orderProduct) {
                        throw new Error(`OrderProduct with ID ${orderProductId} not found`);
                    }

                    // Create main progress report (don't store photos in photoPath for new per-product system)
                    const progressReport = await tx.progressReport.create({
                        data: {
                            orderId: order.id,
                            orderProductId: orderProductId,
                            productId: parseInt(productId),
                            userId: user.id,
                            reportText: `Completed ${productPcsFinished} pieces of ${orderProduct.product.name}${qualityNotes ? ` - Quality: ${qualityNotes}` : ''}${challenges ? ` - Challenges: ${challenges}` : ''}`,
                            photoPath: null, // Photos will be stored in ProductProgressPhoto table instead
                            percentage: Math.round((productPcsFinished / (orderProduct.quantity || 1)) * 100),
                            createdAt: new Date()
                        },
                        include: {
                            product: {
                                select: {
                                    id: true,
                                    name: true
                                }
                            }
                        }
                    });

                    // Create ProductProgressReport entry for enhanced tracking
                    const productProgressReport = await tx.productProgressReport.create({
                        data: {
                            progressReportId: progressReport.id,
                            productId: parseInt(productId),
                            orderProductId: orderProductId,
                            itemsCompleted: productPcsFinished,
                            itemsTarget: orderProduct.quantity || 0,
                            status: productPcsFinished >= (orderProduct.quantity || 0) ? 'completed' : 'in_progress',
                            notes: [qualityNotes, challenges, estimatedCompletion].filter(Boolean).join(' | ') || null,
                            completionDate: productPcsFinished >= (orderProduct.quantity || 0) ? new Date() : null
                        }
                    });

                    // Save photos to ProductProgressPhoto table if any
                    if (photos && photos.length > 0) {
                        for (const photo of photos) {
                            await tx.productProgressPhoto.create({
                                data: {
                                    productProgressReportId: productProgressReport.id,
                                    photoPath: photo.url || photo.photoPath || photo.path || '',
                                    thumbnailPath: photo.thumbnailUrl || photo.thumbnail || null,
                                    description: photo.caption || photo.description || `Progress photo for ${orderProduct.product.name}`,
                                    fileSize: photo.fileSize || null,
                                    mimeType: photo.mimeType || photo.type || null,
                                    uploadDate: new Date(),
                                    isActive: true
                                }
                            });
                        }

                        console.log(`🔍 Saved ${photos.length} photos to ProductProgressPhoto for product ${orderProduct.product.name}`);
                    }

                    createdReports.push({
                        ...progressReport,
                        productProgressReport,
                        photosCount: photos?.length || 0
                    });

                    // Update OrderProduct completed quantity
                    await tx.orderProduct.update({
                        where: { id: orderProductId },
                        data: {
                            completedQty: { increment: productPcsFinished },
                            status: ((orderProduct.completedQty || 0) + productPcsFinished >= orderProduct.quantity) ? 'COMPLETED' : 'IN_PROGRESS'
                        }
                    });

                    // Handle material usage if provided
                    if (materialUsed && materialUsed > 0) {
                        console.log('🔍 Processing material usage for product:', productId, 'Amount:', materialUsed);

                        const product = orderProduct.product;
                        if (product && product.baseMaterial) {
                            const material = product.baseMaterial;

                            // Check if sufficient stock available
                            if (parseFloat(material.qtyOnHand) < parseFloat(materialUsed)) {
                                throw new Error(`Insufficient ${material.name} stock. Available: ${material.qtyOnHand} ${material.unit}, Required: ${materialUsed} ${material.unit}`);
                            }

                            const qtyAfter = parseFloat(material.qtyOnHand) - parseFloat(materialUsed);

                            // Create material movement record
                            const movement = await tx.materialMovement.create({
                                data: {
                                    materialId: material.id,
                                    orderId: order.id,
                                    userId: user.id,
                                    movementType: 'OUT',
                                    quantity: parseFloat(materialUsed),
                                    unit: material.unit,
                                    notes: `Material used for ${product.name} - ${productPcsFinished} pieces completed by ${workerName || user.name}`,
                                    qtyAfter,
                                    movementDate: new Date()
                                }
                            });

                            // Update material stock
                            await tx.material.update({
                                where: { id: material.id },
                                data: { qtyOnHand: qtyAfter }
                            });

                            materialMovements.push({
                                id: movement.id,
                                materialId: material.id,
                                materialName: material.name,
                                materialCode: material.code,
                                qty: parseFloat(materialUsed),
                                unit: material.unit,
                                qtyAfter,
                                movementType: 'OUT',
                                description: movement.notes
                            });

                            totalMaterialUsed += parseFloat(materialUsed);
                            console.log('🔍 Material movement created:', {
                                materialName: material.name,
                                quantity: materialUsed,
                                qtyAfter,
                                movementId: movement.id
                            });
                        } else {
                            console.log('🔍 Warning: Product has no material linked, skipping material movement');
                        }
                    }
                }

                // Update overall order progress
                const newCompletedPcs = order.completedPcs + totalPcsFinished;
                const previousStatus = order.status;
                const newStatus = newCompletedPcs >= order.targetPcs ? 'COMPLETED' : order.status;

                const updatedOrder = await tx.order.update({
                    where: { id: order.id },
                    data: {
                        completedPcs: newCompletedPcs,
                        status: newStatus
                    }
                });

                // Auto-update product stock when order becomes completed through tailor progress
                const productStockUpdates = [];
                if (newStatus === 'COMPLETED' && previousStatus !== 'COMPLETED') {
                    console.log('🔍 Order completed through tailor progress - updating product stock...');

                    for (const orderProduct of order.orderProducts) {
                        const completedQty = orderProduct.completedQty || 0;

                        // Add the pieces that were just completed in this submission
                        const productProgressInThisSubmission = productProgressData.find(p => p.orderProductId === orderProduct.id);
                        const additionalCompletedQty = productProgressInThisSubmission ? productProgressInThisSubmission.pcsFinished : 0;
                        const totalCompletedQty = completedQty + additionalCompletedQty;

                        if (totalCompletedQty > 0) {
                            // Get current product stock
                            const currentProduct = await tx.product.findUnique({
                                where: { id: orderProduct.productId }
                            });

                            const newQtyOnHand = currentProduct.qtyOnHand + totalCompletedQty;

                            // Update product stock
                            await tx.product.update({
                                where: { id: orderProduct.productId },
                                data: { qtyOnHand: newQtyOnHand }
                            });

                            productStockUpdates.push({
                                productId: orderProduct.productId,
                                productName: currentProduct.name,
                                previousStock: currentProduct.qtyOnHand,
                                addedQuantity: totalCompletedQty,
                                newStock: newQtyOnHand
                            });

                            console.log(`🔍 Updated product stock: ${currentProduct.name} +${totalCompletedQty} (now ${newQtyOnHand})`);
                        }
                    }
                }

                return {
                    progressReports: createdReports,
                    updatedOrder,
                    materialMovements,
                    totalMaterialUsed,
                    productStockUpdates
                };
            });

            // Enhanced success message including stock updates
            let successMessage = `Per-product progress submitted successfully! ${totalPcsFinished} pieces completed across ${productProgressData.length} products.`;
            if (result.productStockUpdates && result.productStockUpdates.length > 0) {
                const stockMessage = result.productStockUpdates.map(update =>
                    `${update.productName}: +${update.addedQuantity} (now ${update.newStock})`
                ).join(', ');
                successMessage += ` Product stock updated: ${stockMessage}`;
            }

            res.status(201).json({
                success: true,
                message: successMessage,
                data: {
                    progressReports: result.progressReports,
                    totalPcsFinished,
                    productsUpdated: productProgressData.length
                },
                order: result.updatedOrder,
                materialMovements: result.materialMovements,
                totalMaterialUsed: result.totalMaterialUsed,
                productStockUpdates: result.productStockUpdates || []
            });

        } else {
            // Legacy single progress submission
            console.log('🔍 Processing legacy progress submission');

            if (!pcsFinished || pcsFinished <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Completed pieces must be greater than 0'
                });
            }

            const remainingPcs = order.targetPcs - order.completedPcs;
            if (pcsFinished > remainingPcs) {
                return res.status(400).json({
                    success: false,
                    message: `Cannot report more than remaining pieces. Remaining: ${remainingPcs}`
                });
            }

            // Start transaction for legacy processing
            const result = await prisma.$transaction(async (tx) => {
                // Create main progress report
                const progressReport = await tx.progressReport.create({
                    data: {
                        orderId: order.id,
                        userId: user.id,
                        reportText: `Completed ${pcsFinished} pieces${note ? ` - ${note}` : ''}`,
                        photoPath: photoUrl || null,
                        percentage: Math.round(((order.completedPcs + pcsFinished) / order.targetPcs) * 100),
                        createdAt: new Date()
                    }
                });

                // For legacy submissions, create ProductProgressReport entries for each order product
                if (order.orderProducts && order.orderProducts.length > 0) {
                    // Distribute the pieces across products proportionally or just the first product
                    const primaryOrderProduct = order.orderProducts[0];

                    const productProgressReport = await tx.productProgressReport.create({
                        data: {
                            progressReportId: progressReport.id,
                            productId: primaryOrderProduct.productId,
                            orderProductId: primaryOrderProduct.id,
                            itemsCompleted: pcsFinished,
                            itemsTarget: primaryOrderProduct.quantity || 0,
                            status: 'in_progress',
                            notes: `Legacy progress update: ${note || 'General progress'}`,
                            completionDate: null
                        }
                    });

                    // Save photo if provided
                    if (photoUrl) {
                        await tx.productProgressPhoto.create({
                            data: {
                                productProgressReportId: productProgressReport.id,
                                photoPath: photoUrl,
                                description: `Legacy progress photo: ${note || 'General progress photo'}`,
                                uploadDate: new Date(),
                                isActive: true
                            }
                        });

                        console.log(`🔍 Saved legacy photo to ProductProgressPhoto for order ${order.orderNumber}`);
                    }
                }

                // Update order completed pieces
                const previousStatus = order.status;
                const newCompletedPcs = order.completedPcs + pcsFinished;
                const newStatus = (newCompletedPcs >= order.targetPcs) ? 'COMPLETED' : order.status;

                const updatedOrder = await tx.order.update({
                    where: { id: order.id },
                    data: {
                        completedPcs: newCompletedPcs,
                        status: newStatus
                    }
                });

                // Auto-update product stock when order becomes completed through legacy progress
                const productStockUpdates = [];
                if (newStatus === 'COMPLETED' && previousStatus !== 'COMPLETED') {
                    console.log('🔍 Order completed through legacy progress - updating product stock...');

                    for (const orderProduct of order.orderProducts) {
                        const completedQty = orderProduct.completedQty || 0;

                        // For legacy submissions, if no completedQty is set, use the ordered quantity
                        let totalCompletedQty = completedQty;
                        if (completedQty === 0 && orderProduct.quantity > 0) {
                            totalCompletedQty = orderProduct.quantity;

                            // Update the orderProduct.completedQty for consistency
                            await tx.orderProduct.update({
                                where: { id: orderProduct.id },
                                data: {
                                    completedQty: totalCompletedQty,
                                    status: 'COMPLETED'
                                }
                            });
                        }

                        if (totalCompletedQty > 0) {
                            // Get current product stock
                            const currentProduct = await tx.product.findUnique({
                                where: { id: orderProduct.productId }
                            });

                            const newQtyOnHand = currentProduct.qtyOnHand + totalCompletedQty;

                            // Update product stock
                            await tx.product.update({
                                where: { id: orderProduct.productId },
                                data: { qtyOnHand: newQtyOnHand }
                            });

                            productStockUpdates.push({
                                productId: orderProduct.productId,
                                productName: currentProduct.name,
                                previousStock: currentProduct.qtyOnHand,
                                addedQuantity: totalCompletedQty,
                                newStock: newQtyOnHand
                            });

                            console.log(`🔍 Updated product stock (legacy): ${currentProduct.name} +${totalCompletedQty} (now ${newQtyOnHand})`);
                        }
                    }
                }

                return { progressReport, updatedOrder, productStockUpdates };
            });

            // Enhanced success message for legacy submissions
            let successMessage = 'Progress report submitted successfully';
            if (result.productStockUpdates && result.productStockUpdates.length > 0) {
                const stockMessage = result.productStockUpdates.map(update =>
                    `${update.productName}: +${update.addedQuantity} (now ${update.newStock})`
                ).join(', ');
                successMessage += `. Product stock updated: ${stockMessage}`;
            }

            res.status(201).json({
                success: true,
                message: successMessage,
                data: result.progressReport,
                order: result.updatedOrder,
                productStockUpdates: result.productStockUpdates || []
            });
        }

    } catch (error) {
        console.error('🔍 BACKEND ERROR:', error);
        console.error('Error submitting progress:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit progress report',
            error: error.message
        });
    }
});

/**
 * @desc    Record material usage via order link
 * @route   POST /api/order-links/:token/materials
 * @access  Public (via token)
 */
const recordMaterialUsage = asyncHandler(async (req, res) => {
    try {
        const { token } = req.params;
        const { materialId, quantity, notes } = req.body;

        // Validate order link
        const orderLink = await prisma.orderLink.findFirst({
            where: {
                linkToken: token,
                isActive: true,
                OR: [
                    { expiresAt: null },
                    { expiresAt: { gt: new Date() } }
                ]
            },
            include: {
                order: true,
                user: true
            }
        });

        if (!orderLink) {
            return res.status(404).json({
                success: false,
                message: 'Order link not found or has expired'
            });
        }

        // Validate material and quantity
        if (!materialId || !quantity || quantity <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Material ID and positive quantity are required'
            });
        }

        const material = await prisma.material.findFirst({
            where: { id: parseInt(materialId), isActive: true }
        });

        if (!material) {
            return res.status(404).json({
                success: false,
                message: 'Material not found'
            });
        }

        // Check if sufficient stock available
        if (parseFloat(material.qtyOnHand) < parseFloat(quantity)) {
            return res.status(400).json({
                success: false,
                message: `Insufficient stock. Available: ${material.qtyOnHand} ${material.unit}, Required: ${quantity} ${material.unit}`
            });
        }

        // Create material movement and update stock in transaction
        const result = await prisma.$transaction(async (tx) => {
            const qtyAfter = parseFloat(material.qtyOnHand) - parseFloat(quantity);

            // Create material movement record
            const movement = await tx.materialMovement.create({
                data: {
                    materialId: parseInt(materialId),
                    orderId: orderLink.order.id,
                    userId: orderLink.user.id,
                    movementType: 'OUT',
                    quantity: parseFloat(quantity),
                    unit: material.unit,
                    notes: notes || `Material used for order ${orderLink.order.orderNumber}`,
                    qtyAfter,
                    movementDate: new Date()
                },
                include: {
                    material: {
                        select: {
                            id: true,
                            name: true,
                            code: true,
                            unit: true
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
            message: 'Material usage recorded successfully',
            movement: result
        });

    } catch (error) {
        console.error('Error recording material usage:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to record material usage',
            error: error.message
        });
    }
});

/**
 * @desc    Submit remaining material report
 * @route   POST /api/order-links/:token/remaining-materials
 * @access  Public (via token)
 */
const submitRemainingMaterials = asyncHandler(async (req, res) => {
    try {
        const { token } = req.params;
        const { materialId, qtyRemaining, photoUrl, note } = req.body;

        // Validate order link
        const orderLink = await prisma.orderLink.findFirst({
            where: {
                linkToken: token,
                isActive: true,
                OR: [
                    { expiresAt: null },
                    { expiresAt: { gt: new Date() } }
                ]
            },
            include: {
                order: true,
                user: true
            }
        });

        if (!orderLink) {
            return res.status(404).json({
                success: false,
                message: 'Order link not found or has expired'
            });
        }

        // Validate that order is completed
        if (orderLink.order.status !== 'COMPLETED') {
            return res.status(400).json({
                success: false,
                message: 'Remaining materials can only be reported for completed orders'
            });
        }

        // Validate material if provided
        let material = null;
        if (materialId) {
            material = await prisma.material.findFirst({
                where: { id: parseInt(materialId), isActive: true }
            });

            if (!material) {
                return res.status(404).json({
                    success: false,
                    message: 'Material not found'
                });
            }
        }

        // Create remaining material record
        const remainingMaterial = await prisma.remainingMaterial.create({
            data: {
                materialId: material ? parseInt(materialId) : null,
                quantity: parseFloat(qtyRemaining) || 0,
                unit: material ? material.unit : 'pcs',
                notes: note || `Remaining material from order ${orderLink.order.orderNumber}${photoUrl ? ` - Photo: ${photoUrl}` : ''}`
            },
            include: {
                material: material ? {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                        unit: true
                    }
                } : undefined
            }
        });

        res.status(201).json({
            success: true,
            message: 'Remaining material report submitted successfully',
            remainingMaterial
        });

    } catch (error) {
        console.error('Error submitting remaining materials:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit remaining material report',
            error: error.message
        });
    }
});

/**
 * @desc    Get order link status
 * @route   GET /api/order-links/:linkId/status
 * @access  Private
 */
const getOrderLinkStatus = asyncHandler(async (req, res) => {
    try {
        const { linkId } = req.params;

        const orderLink = await prisma.orderLink.findFirst({
            where: {
                id: parseInt(linkId),
                isActive: true
            },
            include: {
                order: {
                    select: {
                        id: true,
                        orderNumber: true,
                        status: true,
                        targetPcs: true,
                        completedPcs: true
                    }
                }
            }
        });

        if (!orderLink) {
            return res.status(404).json({
                success: false,
                message: 'Order link not found'
            });
        }

        const isExpired = orderLink.expiresAt && new Date() > orderLink.expiresAt;

        res.json({
            success: true,
            status: {
                isActive: orderLink.isActive && !isExpired,
                isExpired,
                order: orderLink.order,
                linkToken: orderLink.linkToken,
                expiresAt: orderLink.expiresAt
            }
        });

    } catch (error) {
        console.error('Error getting order link status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get order link status',
            error: error.message
        });
    }
});

/**
 * @desc    Update order link
 * @route   PUT /api/order-links/:id
 * @access  Private (Admin only)
 */
const updateOrderLink = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        const { isActive, expiresAt } = req.body;

        const orderLink = await prisma.orderLink.findFirst({
            where: { id: parseInt(id) }
        });

        if (!orderLink) {
            return res.status(404).json({
                success: false,
                message: 'Order link not found'
            });
        }

        const updatedOrderLink = await prisma.orderLink.update({
            where: { id: parseInt(id) },
            data: {
                isActive: isActive !== undefined ? isActive : orderLink.isActive,
                expiresAt: expiresAt !== undefined ? (expiresAt ? new Date(expiresAt) : null) : orderLink.expiresAt
            },
            include: {
                order: {
                    select: {
                        id: true,
                        orderNumber: true,
                        status: true
                    }
                },
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });

        res.json({
            success: true,
            message: 'Order link updated successfully',
            orderLink: updatedOrderLink
        });

    } catch (error) {
        console.error('Error updating order link:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update order link',
            error: error.message
        });
    }
});

/**
 * @desc    Delete order link
 * @route   DELETE /api/order-links/:id
 * @access  Private (Admin only)
 */
const deleteOrderLink = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;

        const orderLink = await prisma.orderLink.findFirst({
            where: { id: parseInt(id) }
        });

        if (!orderLink) {
            return res.status(404).json({
                success: false,
                message: 'Order link not found'
            });
        }

        // Soft delete by setting isActive to false
        await prisma.orderLink.update({
            where: { id: parseInt(id) },
            data: { isActive: false }
        });

        res.json({
            success: true,
            message: 'Order link deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting order link:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete order link',
            error: error.message
        });
    }
});

module.exports = {
    getOrderByToken,
    createOrderLink,
    submitProgress,
    recordMaterialUsage,
    submitRemainingMaterials,
    getOrderLinkStatus,
    updateOrderLink,
    deleteOrderLink
}; 