const asyncHandler = require('express-async-handler');
const { Order, Material, ProgressReport, User, Product, MaterialMovement, StatusChange } = require('../models'); // Import necessary models
const { Op, fn, col, literal, where } = require('sequelize');
const { sequelize } = require('../config/database');
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
                tailor: 0
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
            const totalOrders = await Order.count();
            const pendingOrders = await Order.count({ where: { status: 'created' } });
            const processingOrders = await Order.count({ where: { status: 'processing' } });
            const completedOrders = await Order.count({ where: { status: 'completed' } });
            const cancelledOrders = await Order.count({ where: { status: 'cancelled' } });
            const deliveredOrders = await Order.count({ where: { status: 'delivered' } });
            
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
            
            upcomingDeadlines = await Order.findAll({
                where: {
                    dueDate: {
                        [Op.lte]: threeDaysFromNow,
                        [Op.gte]: new Date()
                    },
                    status: {
                        [Op.notIn]: ['completed', 'cancelled', 'delivered']
                    }
                },
                attributes: ['id', 'code', 'status', 'dueDate', 'targetPcs', 'completedPcs'],
                limit: 5,
                order: [['dueDate', 'ASC']]
            });
            console.log('Upcoming deadlines fetched successfully');
        } catch (error) {
            console.error('Error fetching upcoming deadlines:', error);
        }
        
        // Calculate average completion percentage for active orders
        try {
            console.log('Calculating average completion percentage...');
            const activeOrders = await Order.findAll({
                where: {
                    status: 'processing'
                },
                attributes: ['id', 'targetPcs', 'completedPcs']
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
            const totalMaterials = await Material.count();
            materialStats.total = totalMaterials;
            
            // Get materials with stock below safety stock for alerts
            criticalMaterials = await Material.findAll({
                where: {
                    qtyOnHand: {
                        [Op.lt]: sequelize.col('safetyStock')
                    }
                },
                attributes: ['id', 'name', 'code', 'qtyOnHand', 'safetyStock', 'unit'],
                order: [
                    // Order by most critical first (lowest stock compared to safety stock)
                    [sequelize.literal('(qtyOnHand / NULLIF(safetyStock, 0))'), 'ASC']
                ],
                limit: 10 // Limit to top 10 most critical materials
            });
            
            // Get materials with zero stock
            const outOfStockCount = await Material.count({
                where: {
                    qtyOnHand: 0
                }
            });
            materialStats.outOfStockCount = outOfStockCount;
            
            // Calculate total stock value (sum of all material quantities)
            const stockSummary = await Material.findOne({
                attributes: [
                    [fn('SUM', col('qtyOnHand')), 'totalQty'],
                    [fn('COUNT', literal('CASE WHEN qtyOnHand < safetyStock THEN 1 END')), 'criticalCount']
                ],
                raw: true
            });
            
            materialStats.totalQty = stockSummary?.totalQty || 0;
            materialStats.criticalCount = stockSummary?.criticalCount || 0;
            console.log('Material statistics fetched successfully');
        } catch (error) {
            console.error('Error fetching material statistics:', error);
        }

        // Product stats
        let productStats = { ...defaultResponse.productStats };
        try {
            console.log('Fetching product statistics...');
            const totalProducts = await Product.count();
            productStats.total = totalProducts;
            
            // Check if product has qtyOnHand field
            try {
                // First check if qtyOnHand exists on the Product model
                const productHasQtyOnHand = Object.keys(Product.rawAttributes).includes('qtyOnHand');
                
                if (productHasQtyOnHand) {
                    const productStockSummary = await Product.findOne({
                        attributes: [
                            [fn('SUM', col('qtyOnHand')), 'totalQty'],
                            [fn('COUNT', literal('CASE WHEN qtyOnHand = 0 THEN 1 END')), 'outOfStockCount']
                        ],
                        raw: true
                    }) || { totalQty: 0, outOfStockCount: 0 };
                    
                    productStats.totalQty = productStockSummary?.totalQty || 0;
                    productStats.outOfStockCount = productStockSummary?.outOfStockCount || 0;
                }
            } catch (error) {
                console.error('Error calculating product stock summary:', error);
            }
            console.log('Product statistics fetched successfully');
        } catch (error) {
            console.error('Error fetching product statistics:', error);
        }

        // Progress report stats
        let progressStats = { ...defaultResponse.progressStats };
        try {
            console.log('Fetching progress report statistics...');
            const totalProgressReports = await ProgressReport.count();
            progressStats.totalReports = totalProgressReports;
            
            // Latest progress reports
            const latestProgressReports = await ProgressReport.findAll({
                include: [
                    {
                        model: Order,
                        attributes: ['code']
                    }
                ],
                order: [['createdAt', 'DESC']],
                limit: 5
            });
            progressStats.latestReports = latestProgressReports;
            console.log('Progress report statistics fetched successfully');
        } catch (error) {
            console.error('Error fetching progress report statistics:', error);
        }

        // User stats
        let userStats = { ...defaultResponse.userStats };
        try {
            console.log('Fetching user statistics...');
            const totalUsers = await User.count();
            const activeUsers = await User.count({ where: { loginEnabled: true } });
            const adminUsers = await User.count({ where: { role: 'admin' } });
            const tailorUsers = await User.count({ where: { role: 'penjahit' } });
            
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

        // Recent activities
        let recentActivities = [];
        try {
            console.log('Fetching recent activities...');
            recentActivities = await Promise.all([
                // Recent orders
                Order.findAll({
                    attributes: ['id', 'code', 'status', 'createdAt'],
                    order: [['createdAt', 'DESC']],
                    limit: 5
                }).then(orders => orders.map(order => ({
                    type: 'order_created',
                    id: order.id,
                    code: order.code,
                    status: order.status,
                    timestamp: order.createdAt,
                    message: `Order ${order.code} dibuat`
                }))).catch(error => {
                    console.error('Error fetching recent orders:', error);
                    return [];
                }),
                
                // Recent status changes - with fallback
                (async () => {
                    try {
                        const statusChanges = await StatusChange.findAll({
                            attributes: ['id', 'orderId', 'oldStatus', 'newStatus', 'createdAt'],
                            include: [
                                {
                                    model: Order,
                                    attributes: ['code']
                                }
                            ],
                            order: [['createdAt', 'DESC']],
                            limit: 5
                        });
                        return statusChanges.map(change => ({
                            type: 'status_changed',
                            id: change.id,
                            orderId: change.orderId,
                            orderCode: change.Order?.code || 'Unknown',
                            oldStatus: change.oldStatus,
                            newStatus: change.newStatus,
                            timestamp: change.createdAt,
                            message: `Order ${change.Order?.code || 'Unknown'} berubah status dari ${change.oldStatus} menjadi ${change.newStatus}`
                        }));
                    } catch (error) {
                        console.error('Error fetching status changes:', error);
                        return [];
                    }
                })(),
                
                // Recent material movements
                MaterialMovement.findAll({
                    attributes: ['id', 'type', 'qty', 'createdAt'],
                    include: [
                        {
                            model: Material,
                            attributes: ['name', 'code']
                        },
                        {
                            model: User,
                            attributes: ['name']
                        }
                    ],
                    order: [['createdAt', 'DESC']],
                    limit: 5
                }).then(movements => movements.map(movement => ({
                    type: 'material_movement',
                    id: movement.id,
                    movementType: movement.type,
                    qty: movement.qty,
                    materialName: movement.Material?.name || 'Unknown',
                    materialCode: movement.Material?.code || 'Unknown',
                    userName: movement.User?.name || 'Unknown',
                    timestamp: movement.createdAt,
                    message: `${movement.type === 'MASUK' ? 'Penambahan' : 'Pengurangan'} ${movement.qty} ${movement.Material?.name || 'Unknown'} oleh ${movement.User?.name || 'Unknown'}`
                }))).catch(error => {
                    console.error('Error fetching material movements:', error);
                    return [];
                })
            ]).then(activities => {
                // Flatten arrays and sort by timestamp (most recent first)
                return [].concat(...activities).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 10);
            });
            console.log('Recent activities fetched successfully');
        } catch (error) {
            console.error('Error fetching recent activities:', error);
        }

        // Order trend data (7 days)
        let orderTrend = [];
        try {
            console.log('Fetching order trend data...');
            const today = new Date();
            for (let i = 6; i >= 0; i--) {
                const date = new Date(today);
                date.setDate(date.getDate() - i);
                const startOfDay = new Date(date.setHours(0, 0, 0, 0));
                const endOfDay = new Date(date.setHours(23, 59, 59, 999));
                
                const count = await Order.count({
                    where: {
                        createdAt: {
                            [Op.between]: [startOfDay, endOfDay]
                        }
                    }
                });
                
                orderTrend.push({
                    date: moment(date).format('DD/MM'),
                    count
                });
            }
            console.log('Order trend data fetched successfully');
        } catch (error) {
            console.error('Error fetching order trend data:', error);
        }

        // Production trend data (4 weeks)
        let productionTrend = [];
        try {
            console.log('Fetching production trend data...');
            const today = new Date();
            for (let i = 3; i >= 0; i--) {
                const endDate = new Date(today);
                endDate.setDate(endDate.getDate() - (i * 7));
                const startDate = new Date(endDate);
                startDate.setDate(startDate.getDate() - 7);
                
                const progressSum = await ProgressReport.sum('pcsFinished', {
                    where: {
                        reportedAt: {
                            [Op.between]: [startDate, endDate]
                        }
                    }
                }) || 0;
                
                productionTrend.push({
                    week: `Week ${3-i+1}`,
                    count: progressSum
                });
            }
            console.log('Production trend data fetched successfully');
        } catch (error) {
            console.error('Error fetching production trend data:', error);
        }

        console.log('Dashboard summary data compiled successfully');

        res.json({
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
        });
    } catch (error) {
        console.error('Error in getAdminSummary:', error);
        res.status(500).json({ 
            message: 'Failed to fetch dashboard summary', 
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

module.exports = {
    getAdminSummary,
}; 
