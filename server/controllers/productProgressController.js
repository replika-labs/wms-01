const asyncHandler = require('express-async-handler');
const { 
  ProductProgressReport, 
  ProductProgressPhoto, 
  ProgressReport, 
  Product, 
  OrderProduct, 
  Order, 
  Material,
  MaterialMovement 
} = require('../models');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');

// @desc    Get per-product progress for an order
// @route   GET /api/product-progress/order/:orderId
// @access  Private
const getOrderProductProgress = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  try {
    // Get all progress reports for this order with per-product breakdown
    const progressReports = await ProgressReport.findAll({
      where: { orderId },
      include: [
        {
          model: ProductProgressReport,
          include: [
            {
              model: Product,
              attributes: ['id', 'name', 'description']
            },
            {
              model: OrderProduct,
              attributes: ['id', 'qty']
            },
            {
              model: ProductProgressPhoto,
              attributes: ['id', 'photoUrl', 'thumbnailUrl', 'photoCaption', 'photoType', 'sortOrder']
            }
          ]
        }
      ],
      order: [['reportedAt', 'DESC']]
    });

    // Calculate aggregated statistics per product
    const productStats = {};
    
    progressReports.forEach(report => {
      report.ProductProgressReports.forEach(productProgress => {
        const productId = productProgress.productId;
        
        if (!productStats[productId]) {
          productStats[productId] = {
            productId,
            productName: productProgress.Product.name,
            totalPcsFinished: 0,
            totalFabricUsed: 0,
            totalWorkHours: 0,
            averageQualityScore: 0,
            reportCount: 0,
            latestReport: null,
            progressHistory: [],
            photos: []
          };
        }

        const stats = productStats[productId];
        stats.totalPcsFinished += productProgress.pcsFinished;
        stats.totalFabricUsed += parseFloat(productProgress.fabricUsed || 0);
        stats.totalWorkHours += parseFloat(productProgress.workHours || 0);
        stats.averageQualityScore = ((stats.averageQualityScore * stats.reportCount) + (productProgress.qualityScore || 100)) / (stats.reportCount + 1);
        stats.reportCount++;
        
        if (!stats.latestReport || productProgress.createdAt > stats.latestReport.createdAt) {
          stats.latestReport = {
            id: productProgress.id,
            createdAt: productProgress.createdAt,
            completionPercentage: productProgress.calculateCompletionPercentage(),
            efficiency: productProgress.calculateEfficiency(),
            scheduleStatus: productProgress.isOnSchedule(),
            qualityGrade: productProgress.getQualityGrade()
          };
        }

        stats.progressHistory.push({
          reportId: report.id,
          reportDate: report.reportedAt,
          pcsFinished: productProgress.pcsFinished,
          fabricUsed: productProgress.fabricUsed,
          workHours: productProgress.workHours,
          qualityScore: productProgress.qualityScore,
          completionPercentage: productProgress.calculateCompletionPercentage()
        });

        // Collect photos
        productProgress.ProductProgressPhotos.forEach(photo => {
          stats.photos.push({
            id: photo.id,
            url: photo.photoUrl,
            thumbnail: photo.thumbnailUrl,
            caption: photo.photoCaption,
            type: photo.photoType,
            reportDate: report.reportedAt
          });
        });
      });
    });

    // Sort photos by date and type
    Object.values(productStats).forEach(stats => {
      stats.photos.sort((a, b) => new Date(b.reportDate) - new Date(a.reportDate));
      stats.progressHistory.sort((a, b) => new Date(b.reportDate) - new Date(a.reportDate));
    });

    res.json({
      success: true,
      orderId,
      totalReports: progressReports.length,
      productStats: Object.values(productStats),
      progressReports: progressReports.map(report => ({
        id: report.id,
        reportedAt: report.reportedAt,
        tailorName: report.tailorName,
        note: report.note,
        totalPcsFinished: report.pcsFinished,
        productBreakdown: report.ProductProgressReports.map(ppr => ({
          id: ppr.id,
          productId: ppr.productId,
          productName: ppr.Product.name,
          pcsFinished: ppr.pcsFinished,
          fabricUsed: ppr.fabricUsed,
          workHours: ppr.workHours,
          qualityScore: ppr.qualityScore,
          completionPercentage: ppr.calculateCompletionPercentage(),
          efficiency: ppr.calculateEfficiency(),
          scheduleStatus: ppr.isOnSchedule(),
          qualityGrade: ppr.getQualityGrade(),
          photoCount: ppr.ProductProgressPhotos.length
        }))
      }))
    });

  } catch (error) {
    console.error('Error fetching order product progress:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product progress data',
      error: error.message
    });
  }
});

// @desc    Get detailed progress for a specific product
// @route   GET /api/product-progress/product/:productId/order/:orderId
// @access  Private
const getProductDetailedProgress = asyncHandler(async (req, res) => {
  const { productId, orderId } = req.params;

  try {
    // Get all progress reports for this specific product in this order
    const productProgressReports = await ProductProgressReport.findAll({
      include: [
        {
          model: ProgressReport,
          where: { orderId },
          attributes: ['id', 'reportedAt', 'tailorName', 'note']
        },
        {
          model: Product,
          where: { id: productId },
          attributes: ['id', 'name', 'description'],
          include: [
            {
              model: Material,
              attributes: ['id', 'name', 'code', 'unit']
            }
          ]
        },
        {
          model: OrderProduct,
          attributes: ['id', 'qty']
        },
        {
          model: ProductProgressPhoto,
          attributes: ['id', 'photoUrl', 'thumbnailUrl', 'photoCaption', 'photoType', 'sortOrder', 'uploadedAt'],
          order: [['sortOrder', 'ASC'], ['uploadedAt', 'DESC']]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    if (productProgressReports.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No progress reports found for this product in this order'
      });
    }

    // Calculate comprehensive statistics
    const totalPcsFinished = productProgressReports.reduce((sum, ppr) => sum + ppr.pcsFinished, 0);
    const totalFabricUsed = productProgressReports.reduce((sum, ppr) => sum + parseFloat(ppr.fabricUsed || 0), 0);
    const totalWorkHours = productProgressReports.reduce((sum, ppr) => sum + parseFloat(ppr.workHours || 0), 0);
    const averageQualityScore = productProgressReports.reduce((sum, ppr) => sum + (ppr.qualityScore || 100), 0) / productProgressReports.length;

    // Get target quantity from OrderProduct
    const targetQty = productProgressReports[0].OrderProduct.qty;
    const overallCompletionPercentage = Math.round((totalPcsFinished / targetQty) * 100);

    // Calculate efficiency metrics
    const averageEfficiency = totalWorkHours > 0 ? Math.round((totalPcsFinished / totalWorkHours) * 100) / 100 : null;
    const fabricEfficiency = totalPcsFinished > 0 ? Math.round((totalFabricUsed / totalPcsFinished) * 1000) / 1000 : null;

    // Get material movements for this product
    const materialMovements = await MaterialMovement.findAll({
      where: {
        orderId,
        movementSource: 'ORDER_PROGRESS_PER_PRODUCT',
        description: {
          [Op.like]: `%${productProgressReports[0].Product.name}%`
        }
      },
      include: [
        {
          model: Material,
          attributes: ['id', 'name', 'code', 'unit']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      productId,
      orderId,
      product: {
        id: productProgressReports[0].Product.id,
        name: productProgressReports[0].Product.name,
        description: productProgressReports[0].Product.description,
        material: productProgressReports[0].Product.Material
      },
      orderProduct: {
        id: productProgressReports[0].OrderProduct.id,
        targetQty: targetQty
      },
      summary: {
        totalReports: productProgressReports.length,
        totalPcsFinished,
        targetQty,
        overallCompletionPercentage,
        totalFabricUsed,
        totalWorkHours,
        averageQualityScore: Math.round(averageQualityScore),
        averageEfficiency,
        fabricEfficiency
      },
      progressHistory: productProgressReports.map(ppr => ({
        id: ppr.id,
        reportDate: ppr.ProgressReport.reportedAt,
        tailorName: ppr.ProgressReport.tailorName,
        pcsFinished: ppr.pcsFinished,
        pcsTargetForThisReport: ppr.pcsTargetForThisReport,
        fabricUsed: ppr.fabricUsed,
        workHours: ppr.workHours,
        qualityScore: ppr.qualityScore,
        qualityNotes: ppr.qualityNotes,
        challenges: ppr.challenges,
        estimatedCompletion: ppr.estimatedCompletion,
        completionPercentage: ppr.calculateCompletionPercentage(),
        efficiency: ppr.calculateEfficiency(),
        scheduleStatus: ppr.isOnSchedule(),
        qualityGrade: ppr.getQualityGrade(),
        fabricEfficiency: ppr.getFabricEfficiency(),
        photos: ppr.ProductProgressPhotos.map(photo => ({
          id: photo.id,
          url: photo.photoUrl,
          thumbnail: photo.thumbnailUrl,
          caption: photo.photoCaption,
          type: photo.photoType,
          sortOrder: photo.sortOrder,
          uploadedAt: photo.uploadedAt
        }))
      })),
      materialMovements: materialMovements.map(movement => ({
        id: movement.id,
        materialId: movement.materialId,
        materialName: movement.Material.name,
        materialCode: movement.Material.code,
        qty: movement.qty,
        unit: movement.Material.unit,
        movementType: movement.movementType,
        description: movement.description,
        notes: movement.notes,
        createdAt: movement.createdAt
      }))
    });

  } catch (error) {
    console.error('Error fetching detailed product progress:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch detailed product progress',
      error: error.message
    });
  }
});

// @desc    Update product progress report
// @route   PUT /api/product-progress/:id
// @access  Private
const updateProductProgress = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  try {
    const productProgress = await ProductProgressReport.findByPk(id);

    if (!productProgress) {
      return res.status(404).json({
        success: false,
        message: 'Product progress report not found'
      });
    }

    // Update the record
    await productProgress.update(updateData);

    // Fetch updated record with relationships
    const updatedProgress = await ProductProgressReport.findByPk(id, {
      include: [
        {
          model: Product,
          attributes: ['id', 'name']
        },
        {
          model: ProductProgressPhoto,
          attributes: ['id', 'photoUrl', 'photoType', 'photoCaption']
        }
      ]
    });

    res.json({
      success: true,
      message: 'Product progress updated successfully',
      productProgress: {
        id: updatedProgress.id,
        productId: updatedProgress.productId,
        productName: updatedProgress.Product.name,
        pcsFinished: updatedProgress.pcsFinished,
        fabricUsed: updatedProgress.fabricUsed,
        workHours: updatedProgress.workHours,
        qualityScore: updatedProgress.qualityScore,
        completionPercentage: updatedProgress.calculateCompletionPercentage(),
        efficiency: updatedProgress.calculateEfficiency(),
        scheduleStatus: updatedProgress.isOnSchedule(),
        qualityGrade: updatedProgress.getQualityGrade(),
        photoCount: updatedProgress.ProductProgressPhotos.length
      }
    });

  } catch (error) {
    console.error('Error updating product progress:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update product progress',
      error: error.message
    });
  }
});

// @desc    Delete product progress report
// @route   DELETE /api/product-progress/:id
// @access  Private
const deleteProductProgress = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const productProgress = await ProductProgressReport.findByPk(id, {
      include: [
        {
          model: ProductProgressPhoto
        }
      ]
    });

    if (!productProgress) {
      return res.status(404).json({
        success: false,
        message: 'Product progress report not found'
      });
    }

    // Delete associated photos first
    await ProductProgressPhoto.destroy({
      where: { productProgressReportId: id }
    });

    // Delete the progress report
    await productProgress.destroy();

    res.json({
      success: true,
      message: 'Product progress report deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting product progress:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete product progress',
      error: error.message
    });
  }
});

// @desc    Get analytics for product progress across orders
// @route   GET /api/product-progress/analytics/product/:productId
// @access  Private
const getProductAnalytics = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { startDate, endDate } = req.query;

  try {
    let whereClause = { productId };
    
    if (startDate && endDate) {
      whereClause.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    const productProgressReports = await ProductProgressReport.findAll({
      where: whereClause,
      include: [
        {
          model: ProgressReport,
          attributes: ['orderId', 'reportedAt', 'tailorName']
        },
        {
          model: Product,
          attributes: ['id', 'name']
        }
      ],
      order: [['createdAt', 'ASC']]
    });

    if (productProgressReports.length === 0) {
      return res.json({
        success: true,
        productId,
        analytics: {
          totalReports: 0,
          totalOrders: 0,
          averageMetrics: {},
          trends: {},
          qualityAnalysis: {}
        }
      });
    }

    // Calculate analytics
    const uniqueOrders = [...new Set(productProgressReports.map(ppr => ppr.ProgressReport.orderId))];
    const totalPcsFinished = productProgressReports.reduce((sum, ppr) => sum + ppr.pcsFinished, 0);
    const totalFabricUsed = productProgressReports.reduce((sum, ppr) => sum + parseFloat(ppr.fabricUsed || 0), 0);
    const totalWorkHours = productProgressReports.reduce((sum, ppr) => sum + parseFloat(ppr.workHours || 0), 0);
    
    // Quality analysis
    const qualityScores = productProgressReports.map(ppr => ppr.qualityScore || 100);
    const averageQuality = qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length;
    const qualityDistribution = {
      'A+': qualityScores.filter(score => score >= 95).length,
      'A': qualityScores.filter(score => score >= 90 && score < 95).length,
      'B+': qualityScores.filter(score => score >= 85 && score < 90).length,
      'B': qualityScores.filter(score => score >= 80 && score < 85).length,
      'C+': qualityScores.filter(score => score >= 75 && score < 80).length,
      'C': qualityScores.filter(score => score >= 70 && score < 75).length,
      'D': qualityScores.filter(score => score < 70).length
    };

    // Efficiency trends
    const efficiencyData = productProgressReports
      .filter(ppr => ppr.workHours > 0)
      .map(ppr => ({
        date: ppr.createdAt,
        efficiency: ppr.calculateEfficiency(),
        pcsPerHour: ppr.pcsFinished / ppr.workHours
      }));

    // Fabric usage trends
    const fabricUsageData = productProgressReports
      .filter(ppr => ppr.fabricUsed > 0 && ppr.pcsFinished > 0)
      .map(ppr => ({
        date: ppr.createdAt,
        fabricPerPiece: ppr.getFabricEfficiency(),
        totalFabric: ppr.fabricUsed,
        pieces: ppr.pcsFinished
      }));

    res.json({
      success: true,
      productId,
      productName: productProgressReports[0].Product.name,
      analytics: {
        totalReports: productProgressReports.length,
        totalOrders: uniqueOrders.length,
        averageMetrics: {
          pcsPerReport: Math.round(totalPcsFinished / productProgressReports.length),
          fabricPerPiece: totalPcsFinished > 0 ? Math.round((totalFabricUsed / totalPcsFinished) * 1000) / 1000 : 0,
          hoursPerPiece: totalPcsFinished > 0 ? Math.round((totalWorkHours / totalPcsFinished) * 100) / 100 : 0,
          averageQuality: Math.round(averageQuality)
        },
        trends: {
          efficiency: efficiencyData,
          fabricUsage: fabricUsageData
        },
        qualityAnalysis: {
          averageScore: Math.round(averageQuality),
          distribution: qualityDistribution,
          trend: qualityScores.length > 1 ? 
            (qualityScores[qualityScores.length - 1] > qualityScores[0] ? 'improving' : 'declining') : 'stable'
        }
      }
    });

  } catch (error) {
    console.error('Error fetching product analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product analytics',
      error: error.message
    });
  }
});

module.exports = {
  getOrderProductProgress,
  getProductDetailedProgress,
  updateProductProgress,
  deleteProductProgress,
  getProductAnalytics
}; 