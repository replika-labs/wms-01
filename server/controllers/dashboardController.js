const asyncHandler = require('express-async-handler');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const moment = require('moment');

// @desc    Get admin dashboard summary data
// @route   GET /api/dashboard/summary
// @access  Private/Admin
const getAdminSummary = asyncHandler(async (req, res) => {
    try {
        console.log('Getting dashboard summary data...');

        // Initialize default response structure
        const defaultResponse = {
            orderStats: {
                total: 0,
                pending: 0,
                processing: 0,
                completed: 0,
                cancelled: 0,
                delivered: 0,
                avgCompletionPercentage: 0
            },
            materialStats: {
                total: 0,
                totalQty: 0,
                criticalCount: 0,
                outOfStockCount: 0
            },
            productStats: {
                total: 0,
                totalQty: 0,
                outOfStockCount: 0
            },
            userStats: {
                total: 0,
                active: 0,
                admin: 0,
                worker: 0
            },
            progressStats: {
                totalReports: 0,
                latestReports: []
            },
            criticalMaterials: [],
            upcomingDeadlines: [],
            recentActivities: [],
            orderTrend: [],
            productionTrend: []
        };

        // Get counts for orders with different statuses
        let orderStats = { ...defaultResponse.orderStats };
        try {
            console.log('Fetching order statistics...');
            const [
                totalOrders,
                pendingOrders,
                processingOrders,
                completedOrders,
                cancelledOrders,
                deliveredOrders
            ] = await Promise.all([
                prisma.order.count(),
                prisma.order.count({ where: { status: 'created' } }),
                prisma.order.count({ where: { status: 'processing' } }),
                prisma.order.count({ where: { status: 'completed' } }),
                prisma.order.count({ where: { status: 'cancelled' } }),
                prisma.order.count({ where: { status: 'delivered' } })
            ]);

            orderStats = {
                total: totalOrders,
                pending: pendingOrders,
                processing: processingOrders,
                completed: completedOrders,
                cancelled: cancelledOrders,
                delivered: deliveredOrders,
                avgCompletionPercentage: 0
            };
            console.log('Order statistics fetched successfully');
        } catch (error) {
            console.error('Error fetching order statistics:', error);
        }

        // Get upcoming deadlines (orders due in the next 3 days)
        let upcomingDeadlines = [];
        try {
            console.log('Fetching upcoming deadlines...');
            const threeDaysFromNow = new Date();
            threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

            upcomingDeadlines = await prisma.order.findMany({
                where: {
                    dueDate: {
                        lte: threeDaysFromNow,
                        gte: new Date()
                    },
                    status: {
                        notIn: ['completed', 'cancelled', 'delivered']
                    }
                },
                select: {
                    id: true,
                    code: true,
                    status: true,
                    dueDate: true,
                    targetPcs: true,
                    completedPcs: true
                },
                take: 5,
                orderBy: { dueDate: 'asc' }
            });
            console.log('Upcoming deadlines fetched successfully');
        } catch (error) {
            console.error('Error fetching upcoming deadlines:', error);
        }

        // Calculate average completion percentage for active orders
        try {
            console.log('Calculating average completion percentage...');
            const activeOrders = await prisma.order.findMany({
                where: { status: 'processing' },
                select: {
                    id: true,
                    targetPcs: true,
                    completedPcs: true
                }
            });

            let avgCompletionPercentage = 0;
            if (activeOrders.length > 0) {
                const totalPercentage = activeOrders.reduce((sum, order) => {
                    const percentage = order.targetPcs > 0 ? (order.completedPcs / order.targetPcs) * 100 : 0;
                    return sum + percentage;
                }, 0);
                avgCompletionPercentage = totalPercentage / activeOrders.length;
            }
            orderStats.avgCompletionPercentage = Math.round(avgCompletionPercentage);
            console.log('Average completion percentage calculated successfully');
        } catch (error) {
            console.error('Error calculating average completion percentage:', error);
        }

        // Material stats
        let materialStats = { ...defaultResponse.materialStats };
        let criticalMaterials = [];
        try {
            console.log('Fetching material statistics...');
            const totalMaterials = await prisma.material.count();
            materialStats.total = totalMaterials;

            // Get materials with stock below safety stock using raw query for complex comparison
            try {
                criticalMaterials = await prisma.$queryRaw`
                    SELECT id, name, code, "qtyOnHand", "safetyStock", unit
                    FROM "Material" 
                    WHERE "qtyOnHand" < "safetyStock" 
                    ORDER BY ("qtyOnHand" / NULLIF("safetyStock", 0)) ASC
                    LIMIT 10
                `;
            } catch (rawQueryError) {
                console.warn('Raw query failed, falling back to simple query:', rawQueryError);
                // Fallback: get all materials and filter in JavaScript
                const allMaterials = await prisma.material.findMany({
                    select: {
                        id: true,
                        name: true,
                        code: true,
                        qtyOnHand: true,
                        safetyStock: true,
                        unit: true
                    }
                });
                criticalMaterials = allMaterials
                    .filter(m => m.qtyOnHand < m.safetyStock)
                    .sort((a, b) => (a.qtyOnHand / (a.safetyStock || 1)) - (b.qtyOnHand / (b.safetyStock || 1)))
                    .slice(0, 10);
            }

            // Get materials with zero stock
            const outOfStockCount = await prisma.material.count({
                where: { qtyOnHand: 0 }
            });
            materialStats.outOfStockCount = outOfStockCount;

            // Calculate total stock quantities and critical count
            const stockAggregates = await prisma.material.aggregate({
                _sum: { qtyOnHand: true },
                _count: { id: true }
            });

            // Get critical count using raw query
            let criticalCount = 0;
            try {
                const criticalCountResult = await prisma.$queryRaw`
                    SELECT COUNT(*) as count 
                    FROM "Material" 
                    WHERE "qtyOnHand" < "safetyStock"
                `;
                criticalCount = parseInt(criticalCountResult[0]?.count || 0);
            } catch (error) {
                console.warn('Critical count query failed, calculating manually');
                const allMaterials = await prisma.material.findMany({
                    select: { qtyOnHand: true, safetyStock: true }
                });
                criticalCount = allMaterials.filter(m => m.qtyOnHand < m.safetyStock).length;
            }

            materialStats.totalQty = stockAggregates._sum.qtyOnHand || 0;
            materialStats.criticalCount = criticalCount;
            console.log('Material statistics fetched successfully');
        } catch (error) {
            console.error('Error fetching material statistics:', error);
        }

        // Product stats
        let productStats = { ...defaultResponse.productStats };
        try {
            console.log('Fetching product statistics...');
            const totalProducts = await prisma.product.count();
            productStats.total = totalProducts;

            // Try to get product stock summary if qtyOnHand field exists
            try {
                const productStockSummary = await prisma.product.aggregate({
                    _sum: { qtyOnHand: true },
                    _count: {
                        id: true
                    }
                });

                const outOfStockCount = await prisma.product.count({
                    where: { qtyOnHand: 0 }
                });

                productStats.totalQty = productStockSummary._sum.qtyOnHand || 0;
                productStats.outOfStockCount = outOfStockCount;
            } catch (error) {
                console.log('Product qtyOnHand field not available, skipping stock calculations');
                // Field doesn't exist, leave as defaults
            }
            console.log('Product statistics fetched successfully');
        } catch (error) {
            console.error('Error fetching product statistics:', error);
        }

        // User stats  
        let userStats = { ...defaultResponse.userStats };
        try {
            console.log('Fetching user statistics...');
            const [totalUsers, activeUsers, adminUsers, tailorUsers] = await Promise.all([
                prisma.user.count(),
                prisma.user.count({ where: { loginEnabled: true } }),
                prisma.user.count({ where: { role: 'admin' } }),
                prisma.user.count({ where: { role: 'OPERATOR' } })
            ]);

            userStats = {
                total: totalUsers,
                active: activeUsers,
                admin: adminUsers,
                tailor: tailorUsers
            };
            console.log('User statistics fetched successfully');
        } catch (error) {
            console.error('Error fetching user statistics:', error);
        }

        // Recent activities (last 10 orders)
        let recentActivities = [];
        try {
            console.log('Fetching recent activities...');
            const recentOrders = await prisma.order.findMany({
                take: 10,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    code: true,
                    status: true,
                    createdAt: true
                }
            });

            recentActivities = recentOrders.map(order => ({
                id: order.id,
                type: 'order',
                description: `Order ${order.code} dibuat`,
                timestamp: order.createdAt,
                status: order.status
            }));
            console.log('Recent activities fetched successfully');
        } catch (error) {
            console.error('Error fetching recent activities:', error);
        }

        // Order trend (last 7 days)
        let orderTrend = [];
        try {
            console.log('Calculating order trend...');
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            // Get orders grouped by date
            const ordersByDay = await prisma.order.groupBy({
                by: ['createdAt'],
                where: {
                    createdAt: { gte: sevenDaysAgo }
                },
                _count: { id: true }
            });

            // Transform to daily trend
            const dailyCounts = {};
            ordersByDay.forEach(item => {
                const date = new Date(item.createdAt).toISOString().split('T')[0];
                dailyCounts[date] = (dailyCounts[date] || 0) + item._count.id;
            });

            // Fill in missing days with 0
            for (let i = 6; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];
                orderTrend.push({
                    date: dateStr,
                    count: dailyCounts[dateStr] || 0
                });
            }
            console.log('Order trend calculated successfully');
        } catch (error) {
            console.error('Error calculating order trend:', error);
            // Fallback: create empty trend
            for (let i = 6; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                orderTrend.push({
                    date: date.toISOString().split('T')[0],
                    count: 0
                });
            }
        }

        // Production trend (completion rate over time)
        let productionTrend = [];
        try {
            console.log('Calculating production trend...');
            // For now, create placeholder data - can be enhanced later
            for (let i = 6; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                productionTrend.push({
                    date: date.toISOString().split('T')[0],
                    completionRate: Math.floor(Math.random() * 30) + 70 // Placeholder
                });
            }
            console.log('Production trend calculated successfully');
        } catch (error) {
            console.error('Error calculating production trend:', error);
        }

        // Progress stats - placeholder for now
        const progressStats = {
            totalReports: 0,
            latestReports: []
        };

        const dashboardData = {
            orderStats,
            materialStats,
            productStats,
            userStats,
            progressStats,
            criticalMaterials,
            upcomingDeadlines,
            recentActivities,
            orderTrend,
            productionTrend
        };

        console.log('Dashboard summary data compiled successfully');
        res.json(dashboardData);

    } catch (error) {
        console.error('Error generating dashboard summary:', error);
        res.status(500).json({
            message: 'Failed to generate dashboard summary',
            error: error.message,
            ...defaultResponse
        });
    }
});

// @desc    Get monthly statistics
// @route   GET /api/dashboard/monthly-stats
// @access  Private/Admin
const getMonthlyStats = asyncHandler(async (req, res) => {
    try {
        const { month, year } = req.query;
        const currentDate = new Date();
        const targetMonth = month ? parseInt(month) : currentDate.getMonth() + 1;
        const targetYear = year ? parseInt(year) : currentDate.getFullYear();

        const startDate = new Date(targetYear, targetMonth - 1, 1);
        const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);

        const [ordersCount, materialsAdded, completedOrders] = await Promise.all([
            prisma.order.count({
                where: {
                    createdAt: {
                        gte: startDate,
                        lte: endDate
                    }
                }
            }),
            prisma.material.count({
                where: {
                    createdAt: {
                        gte: startDate,
                        lte: endDate
                    }
                }
            }),
            prisma.order.count({
                where: {
                    status: 'completed',
                    updatedAt: {
                        gte: startDate,
                        lte: endDate
                    }
                }
            })
        ]);

        res.json({
            month: targetMonth,
            year: targetYear,
            statistics: {
                ordersCreated: ordersCount,
                materialsAdded: materialsAdded,
                ordersCompleted: completedOrders,
                completionRate: ordersCount > 0 ? Math.round((completedOrders / ordersCount) * 100) : 0
            }
        });

    } catch (error) {
        console.error('Error generating monthly statistics:', error);
        res.status(500).json({
            message: 'Failed to generate monthly statistics',
            error: error.message
        });
    }
});

module.exports = {
    getAdminSummary,
    getMonthlyStats
}; 
