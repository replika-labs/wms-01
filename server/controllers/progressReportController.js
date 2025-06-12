const asyncHandler = require('express-async-handler');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * @desc    Get progress reports for an order
 * @route   GET /api/progress-reports?orderId=:id
 * @access  Private
 */
const getProgressReports = asyncHandler(async (req, res) => {
    try {
        const { orderId } = req.query;

        if (!orderId) {
            return res.status(400).json({
                success: false,
                message: 'Order ID is required'
            });
        }

        // Get all progress reports for the order with enhanced data
        const progressReports = await prisma.progressReport.findMany({
            where: {
                orderId: parseInt(orderId)
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                order: {
                    select: {
                        id: true,
                        orderNumber: true,
                        workerContact: {
                            select: {
                                id: true,
                                name: true,
                                phone: true,
                                whatsappPhone: true,
                                email: true
                            }
                        }
                    }
                },
                productReports: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                name: true,
                                code: true,
                                unit: true
                            }
                        },
                        orderProduct: {
                            select: {
                                id: true,
                                quantity: true,
                                completedQty: true,
                                status: true
                            }
                        },
                        photos: {
                            where: {
                                isActive: true
                            },
                            orderBy: {
                                uploadDate: 'desc'
                            },
                            select: {
                                id: true,
                                photoPath: true,
                                thumbnailPath: true,
                                description: true,
                                uploadDate: true,
                                fileSize: true,
                                mimeType: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // Calculate cumulative progress for each product across all reports
        const calculateCumulativeProgress = (reports) => {
            const productCumulativeProgress = new Map();

            // Sort reports by creation date (oldest first)
            const sortedReports = [...reports].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

            return sortedReports.map(report => {
                // Parse legacy photoPath if it exists (for backward compatibility with old reports)
                let legacyPhotos = [];
                if (report.photoPath) {
                    try {
                        legacyPhotos = JSON.parse(report.photoPath);
                    } catch (error) {
                        // If it's not JSON, treat as single photo path
                        legacyPhotos = [{ url: report.photoPath, source: 'legacy' }];
                    }
                }

                // Get new ProductProgressPhoto entries
                const productProgressPhotos = report.productReports.flatMap(pr =>
                    pr.photos.map(photo => ({
                        id: photo.id,
                        url: photo.photoPath,
                        thumbnailUrl: photo.thumbnailPath,
                        description: photo.description,
                        uploadDate: photo.uploadDate,
                        fileSize: photo.fileSize,
                        mimeType: photo.mimeType,
                        source: 'product_progress'
                    }))
                );

                // For new per-product reports (no legacy photos), use only ProductProgressPhoto
                // For legacy reports (with photoPath), use only legacy photos to avoid duplication
                const allPhotos = report.productReports.length > 0 && !report.photoPath
                    ? productProgressPhotos  // New per-product system
                    : legacyPhotos;          // Legacy system

                // Update cumulative progress for each product in this report
                report.productReports.forEach(pr => {
                    const productId = pr.product.id;
                    const currentProgress = productCumulativeProgress.get(productId) || 0;
                    const newProgress = currentProgress + pr.itemsCompleted;
                    productCumulativeProgress.set(productId, newProgress);
                });

                // Create product summary with cumulative progress
                const productSummary = report.productReports.map(pr => {
                    const productId = pr.product.id;
                    const cumulativeCompleted = productCumulativeProgress.get(productId) || 0;
                    const percentage = pr.itemsTarget > 0 ? Math.round((cumulativeCompleted / pr.itemsTarget) * 100) : 0;

                    return {
                        productId: pr.product.id,
                        productName: pr.product.name,
                        productCode: pr.product.code,
                        itemsCompleted: cumulativeCompleted, // Cumulative total
                        itemsCompletedThisReport: pr.itemsCompleted, // Items completed in this specific report
                        itemsTarget: pr.itemsTarget,
                        percentage: percentage,
                        status: cumulativeCompleted >= pr.itemsTarget ? 'completed' : 'in_progress',
                        completionDate: cumulativeCompleted >= pr.itemsTarget ? report.createdAt : null,
                        notes: pr.notes
                    };
                });

                return {
                    ...report,
                    photos: allPhotos,
                    productSummary,
                    totalProductsUpdated: report.productReports.length,
                    tailorName: report.order.workerContact?.name || 'Unknown',
                    reportedAt: report.createdAt
                };
            }).reverse(); // Reverse to show newest first
        };

        // Transform the data to include enhanced information with cumulative progress
        const enhancedReports = calculateCumulativeProgress(progressReports);

        res.json(enhancedReports);

    } catch (error) {
        console.error('Error fetching progress reports:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch progress reports',
            error: error.message
        });
    }
});

/**
 * @desc    Create a new progress report (legacy endpoint for backward compatibility)
 * @route   POST /api/progress-reports
 * @access  Private
 */
const createProgressReport = asyncHandler(async (req, res) => {
    try {
        const {
            orderId,
            pcsFinished,
            note,
            photoUrl,
            resiPengiriman,
            tailorName
        } = req.body;

        // Validate required fields
        if (!orderId || !pcsFinished || pcsFinished <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Order ID and pieces finished are required'
            });
        }

        if (!tailorName || tailorName.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Tailor name is required'
            });
        }

        // Get order details
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

        // Check remaining pieces
        const remainingPcs = order.targetPcs - order.completedPcs;
        if (pcsFinished > remainingPcs) {
            return res.status(400).json({
                success: false,
                message: `Cannot exceed remaining pieces. Remaining: ${remainingPcs}`
            });
        }

        // Create progress report in transaction
        const result = await prisma.$transaction(async (tx) => {
            // Create main progress report
            const progressReport = await tx.progressReport.create({
                data: {
                    orderId: parseInt(orderId),
                    userId: req.user.id,
                    reportText: `${tailorName} completed ${pcsFinished} pieces${note ? ` - ${note}` : ''}${resiPengiriman ? ` (Tracking: ${resiPengiriman})` : ''}`,
                    photoPath: photoUrl || null,
                    percentage: Math.round(((order.completedPcs + parseInt(pcsFinished)) / order.targetPcs) * 100)
                }
            });

            // Update order completed pieces
            const newCompletedPcs = order.completedPcs + parseInt(pcsFinished);
            const newStatus = newCompletedPcs >= order.targetPcs ? 'COMPLETED' : order.status;

            await tx.order.update({
                where: { id: parseInt(orderId) },
                data: {
                    completedPcs: newCompletedPcs,
                    status: newStatus
                }
            });

            return progressReport;
        });

        res.status(201).json({
            success: true,
            message: 'Progress report created successfully',
            data: result
        });

    } catch (error) {
        console.error('Error creating progress report:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create progress report',
            error: error.message
        });
    }
});

/**
 * @desc    Get product progress photos for an order
 * @route   GET /api/progress-reports/:orderId/photos
 * @access  Private
 */
const getProgressPhotos = asyncHandler(async (req, res) => {
    try {
        const { orderId } = req.params;

        const photos = await prisma.productProgressPhoto.findMany({
            where: {
                productProgressReport: {
                    progressReport: {
                        orderId: parseInt(orderId)
                    }
                },
                isActive: true
            },
            include: {
                productProgressReport: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                name: true,
                                code: true
                            }
                        },
                        progressReport: {
                            select: {
                                id: true,
                                createdAt: true,
                                user: {
                                    select: {
                                        id: true,
                                        name: true
                                    }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: {
                uploadDate: 'desc'
            }
        });

        res.json({
            success: true,
            photos
        });

    } catch (error) {
        console.error('Error fetching progress photos:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch progress photos',
            error: error.message
        });
    }
});

module.exports = {
    getProgressReports,
    createProgressReport,
    getProgressPhotos
}; 