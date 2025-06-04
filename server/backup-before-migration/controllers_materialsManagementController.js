const asyncHandler = require('express-async-handler');
const { Material, PurchaseLog, MaterialMovement } = require('../models');
const InventoryService = require('../services/InventoryService');
const { Op, fn, col } = require('sequelize');
const sequelize = require('../db');

// @desc    Get all materials with enhanced inventory calculation
// @route   GET /api/materials-management
// @access  Protected
const getMaterials = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    search,
    category,
    lowStock,
    sortBy = 'name',
    sortOrder = 'ASC'
  } = req.query;

  // Build where clause
  const where = {};
  
  if (search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { code: { [Op.like]: `%${search}%` } },
      { fabricTypeColor: { [Op.like]: `%${search}%` } }
    ];
  }

  if (category) {
    where.fabricTypeColor = { [Op.like]: `%${category}%` };
  }

  // Calculate offset
  const offset = (page - 1) * limit;

  // Get materials with simplified query first
  const { count, rows: materials } = await Material.findAndCountAll({
    where,
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [[sortBy, sortOrder.toUpperCase()]],
    distinct: true
  });

  // Enhance each material with REAL calculated stock from MaterialMovement
  const enhancedMaterials = await Promise.all(
    materials.map(async (material) => {
      const materialJson = material.toJSON();
      
      try {
        // Use MaterialMovement calculations for real inventory
        const movementCalculation = await MaterialMovement.calculateInventoryForMaterial(material.id);
        const purchaseStock = await PurchaseLog.getInventoryContribution(material.id) || 0;
        
        const calculatedStock = {
          materialId: material.id,
          purchaseStock: parseFloat(purchaseStock),
          movementStock: parseFloat(movementCalculation.currentStock || 0),
          totalCalculated: parseFloat(movementCalculation.currentStock || 0), // Use movement as primary
          source: 'movement_calculation',
          breakdown: {
            totalMasuk: movementCalculation.totalMasuk || 0,
            totalKeluar: movementCalculation.totalKeluar || 0,
            movementCount: movementCalculation.movementCount || 0
          },
          lastUpdated: new Date()
        };

        // Get purchase history
        const purchaseHistory = await PurchaseLog.findAll({
          where: { materialId: material.id },
          attributes: [
            [sequelize.fn('COUNT', sequelize.col('id')), 'purchaseCount'],
            [sequelize.fn('SUM', sequelize.col('stock')), 'totalPurchased'],
            [sequelize.fn('MAX', sequelize.col('purchasedDate')), 'lastPurchaseDate']
          ],
          raw: true
        });

        const historyData = purchaseHistory[0] || {};

        return {
          ...materialJson,
          calculatedStock,
          purchaseHistory: {
            totalPurchased: parseFloat(historyData.totalPurchased) || 0,
            purchaseCount: parseInt(historyData.purchaseCount) || 0,
            lastPurchaseDate: historyData.lastPurchaseDate || null
          },
          stockStatus: getStockStatus(calculatedStock.totalCalculated, material.safetyStock),
          needsRestock: calculatedStock.totalCalculated <= (material.safetyStock || 0)
        };
      } catch (error) {
        console.error(`Error calculating stock for material ${material.id}:`, error);
        
        // Fallback to simple calculation if movement calculation fails
        const fallbackStock = materialJson.qtyOnHand || 0;
        return {
          ...materialJson,
          calculatedStock: {
            materialId: material.id,
            purchaseStock: 0,
            movementStock: fallbackStock,
            totalCalculated: fallbackStock,
            source: 'fallback_calculation',
            error: error.message,
            lastUpdated: new Date()
          },
          purchaseHistory: {
            totalPurchased: 0,
            purchaseCount: 0,
            lastPurchaseDate: null
          },
          stockStatus: getStockStatus(fallbackStock, material.safetyStock),
          needsRestock: fallbackStock <= (material.safetyStock || 0)
        };
      }
    })
  );

  // Filter by low stock if requested
  let filteredMaterials = enhancedMaterials;
  if (lowStock === 'true') {
    filteredMaterials = enhancedMaterials.filter(m => m.needsRestock);
  }

  // Calculate pagination for filtered results
  const totalPages = Math.ceil((lowStock === 'true' ? filteredMaterials.length : count) / limit);

  res.status(200).json({
    success: true,
    data: {
      materials: filteredMaterials,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: lowStock === 'true' ? filteredMaterials.length : count,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    }
  });
});

// @desc    Get material by ID with complete details
// @route   GET /api/materials-management/:id
// @access  Protected
const getMaterialById = asyncHandler(async (req, res) => {
  const material = await Material.findByPk(req.params.id);

  if (!material) {
    res.status(404);
    throw new Error('Material not found');
  }

  try {
    // Use REAL MaterialMovement calculations
    const movementCalculation = await MaterialMovement.calculateInventoryForMaterial(material.id);
    const purchaseStock = await PurchaseLog.getInventoryContribution(material.id) || 0;
    
    const stockData = {
      materialId: material.id,
      purchaseStock: parseFloat(purchaseStock),
      movementStock: parseFloat(movementCalculation.currentStock || 0),
      totalCalculated: parseFloat(movementCalculation.currentStock || 0),
      source: 'movement_calculation',
      breakdown: {
        totalMasuk: movementCalculation.totalMasuk || 0,
        totalKeluar: movementCalculation.totalKeluar || 0,
        movementCount: movementCalculation.movementCount || 0,
        totalValue: movementCalculation.totalValue || 0,
        averagePrice: movementCalculation.averagePrice || 0
      },
      lastUpdated: new Date()
    };

    // Get recent movements
    const recentMovements = await MaterialMovement.findByMaterial(material.id, {
      limit: 10,
      include: [
        {
          model: require('../models').Order,
          attributes: ['id', 'orderNumber'],
          required: false
        },
        {
          model: require('../models').User,
          attributes: ['id', 'name'],
          required: false
        }
      ]
    });

    // Get purchase history
    const purchases = await PurchaseLog.findByMaterial(material.id);
    const purchaseHistoryData = {
      materialId: material.id,
      summary: {
        totalPurchases: purchases.length,
        totalQuantity: purchases.reduce((sum, p) => sum + (p.stock || 0), 0),
        totalValue: purchases.reduce((sum, p) => sum + ((p.stock || 0) * (p.price || 0)), 0)
      },
      purchases: purchases.slice(0, 5) // Latest 5 purchases
    };

    res.status(200).json({
      success: true,
      data: {
        material: material.toJSON(),
        calculatedStock: stockData,
        purchaseHistory: purchaseHistoryData,
        recentMovements: recentMovements || [],
        stockStatus: getStockStatus(stockData.totalCalculated, material.safetyStock),
        restockRecommendation: getRestockRecommendation(material, stockData)
      }
    });
  } catch (error) {
    console.error(`Error getting material details for ${material.id}:`, error);
    
    // Fallback to simple calculation
    const fallbackStock = material.qtyOnHand || 0;
    const fallbackData = {
      materialId: material.id,
      purchaseStock: 0,
      movementStock: fallbackStock,
      totalCalculated: fallbackStock,
      source: 'fallback_calculation',
      error: error.message,
      lastUpdated: new Date()
    };

    res.status(200).json({
      success: true,
      data: {
        material: material.toJSON(),
        calculatedStock: fallbackData,
        purchaseHistory: {
          materialId: material.id,
          summary: { totalPurchases: 0, totalQuantity: 0, totalValue: 0 },
          purchases: []
        },
        recentMovements: [],
        stockStatus: getStockStatus(fallbackStock, material.safetyStock),
        restockRecommendation: null
      }
    });
  }
});

// @desc    Create new material
// @route   POST /api/materials-management
// @access  Protected
const createMaterial = asyncHandler(async (req, res) => {
  const {
    name,
    code,
    fabricTypeColor,
    purchaseDate,
    numberOfRolls,
    totalUnits,
    store,
    image,
    price,
    qtyOnHand,
    unit,
    safetyStock,
    description
  } = req.body;

  // Validate required fields
  if (!name || !unit) {
    res.status(400);
    throw new Error('Name and unit are required');
  }

  // Check if code already exists (if provided)
  if (code) {
    const existingMaterial = await Material.findOne({ where: { code } });
    if (existingMaterial) {
      res.status(400);
      throw new Error('Material code already exists');
    }
  }

  // Create material
  const material = await Material.create({
    name,
    code,
    fabricTypeColor,
    purchaseDate,
    numberOfRolls: numberOfRolls ? parseInt(numberOfRolls) : null,
    totalUnits: totalUnits ? parseFloat(totalUnits) : null,
    store,
    image,
    price: price ? parseFloat(price) : null,
    qtyOnHand: qtyOnHand ? parseFloat(qtyOnHand) : 0,
    unit,
    safetyStock: safetyStock ? parseFloat(safetyStock) : 0,
    description
  });

  res.status(201).json({
    success: true,
    message: 'Material created successfully',
    data: material
  });
});

// @desc    Update material
// @route   PUT /api/materials-management/:id
// @access  Protected
const updateMaterial = asyncHandler(async (req, res) => {
  const material = await Material.findByPk(req.params.id);

  if (!material) {
    res.status(404);
    throw new Error('Material not found');
  }

  const {
    name,
    code,
    fabricTypeColor,
    purchaseDate,
    numberOfRolls,
    totalUnits,
    store,
    image,
    price,
    qtyOnHand,
    unit,
    safetyStock,
    description
  } = req.body;

  // Check if code already exists (if being changed)
  if (code && code !== material.code) {
    const existingMaterial = await Material.findOne({ where: { code } });
    if (existingMaterial) {
      res.status(400);
      throw new Error('Material code already exists');
    }
  }

  // Update material
  const updatedMaterial = await material.update({
    name: name || material.name,
    code: code !== undefined ? code : material.code,
    fabricTypeColor: fabricTypeColor !== undefined ? fabricTypeColor : material.fabricTypeColor,
    purchaseDate: purchaseDate !== undefined ? purchaseDate : material.purchaseDate,
    numberOfRolls: numberOfRolls !== undefined ? parseInt(numberOfRolls) : material.numberOfRolls,
    totalUnits: totalUnits !== undefined ? parseFloat(totalUnits) : material.totalUnits,
    store: store !== undefined ? store : material.store,
    image: image !== undefined ? image : material.image,
    price: price !== undefined ? (price ? parseFloat(price) : null) : material.price,
    qtyOnHand: qtyOnHand !== undefined ? parseFloat(qtyOnHand) : material.qtyOnHand,
    unit: unit || material.unit,
    safetyStock: safetyStock !== undefined ? parseFloat(safetyStock) : material.safetyStock,
    description: description !== undefined ? description : material.description
  });

  res.status(200).json({
    success: true,
    message: 'Material updated successfully',
    data: updatedMaterial
  });
});

// @desc    Delete material (soft delete)
// @route   DELETE /api/materials-management/:id
// @access  Protected
const deleteMaterial = asyncHandler(async (req, res) => {
  const material = await Material.findByPk(req.params.id);

  if (!material) {
    res.status(404);
    throw new Error('Material not found');
  }

  // Simple inventory check using existing qtyOnHand field
  if (material.qtyOnHand > 0) {
    res.status(400);
    throw new Error('Cannot delete material with existing inventory');
  }

  // Check if material has any purchase logs (simplified check)
  const purchaseCount = await PurchaseLog.count({
    where: { materialId: material.id }
  });

  if (purchaseCount > 0) {
    res.status(400);
    throw new Error('Cannot delete material with purchase history');
  }

  await material.destroy();

  res.status(200).json({
    success: true,
    message: 'Material deleted successfully'
  });
});

// @desc    Get materials inventory summary
// @route   GET /api/materials-management/inventory-summary
// @access  Protected
const getInventorySummary = asyncHandler(async (req, res) => {
  // Simplified summary without complex InventoryService calls
  const materials = await Material.findAll();
  
  const summary = {
    totalMaterials: materials.length,
    criticalStock: materials.filter(m => m.qtyOnHand <= (m.safetyStock || 0)).length,
    lowStock: materials.filter(m => m.qtyOnHand <= (m.safetyStock || 0) * 1.5).length,
    totalValue: materials.reduce((sum, m) => sum + (m.qtyOnHand * (m.price || 0)), 0)
  };

  res.status(200).json({
    success: true,
    data: {
      materials: materials.map(material => ({
        ...material.toJSON(),
        stockStatus: getStockStatus(material.qtyOnHand, material.safetyStock)
      })),
      analytics: { summary },
      restockAlerts: materials.filter(m => m.qtyOnHand <= (m.safetyStock || 0)),
      summary
    }
  });
});

// @desc    Get restock recommendations
// @route   GET /api/materials-management/restock-recommendations
// @access  Protected
const getRestockRecommendations = asyncHandler(async (req, res) => {
  // Simplified restock recommendations without complex InventoryService calls
  const materials = await Material.findAll();
  
  const recommendations = materials
    .filter(material => material.qtyOnHand <= (material.safetyStock || 0))
    .map(material => ({
      materialId: material.id,
      materialName: material.name,
      materialCode: material.code,
      currentStock: material.qtyOnHand,
      safetyStock: material.safetyStock || 0,
      shortfall: (material.safetyStock || 0) - material.qtyOnHand,
      priority: material.qtyOnHand <= 0 ? 'critical' : 
               material.qtyOnHand <= (material.safetyStock || 0) * 0.5 ? 'high' : 'medium',
      recommendedQuantity: Math.max((material.safetyStock || 0) * 1.5, 10),
      estimatedCost: null
    }))
    .sort((a, b) => {
      const priorityOrder = { critical: 3, high: 2, medium: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

  res.status(200).json({
    success: true,
    data: recommendations
  });
});

// Helper methods
const getStockStatus = (currentStock, safetyStock) => {
  if (currentStock <= 0) return 'out_of_stock';
  if (currentStock <= safetyStock * 0.5) return 'critical';
  if (currentStock <= safetyStock) return 'low';
  return 'adequate';
};

const getRestockRecommendation = (material, stockData) => {
  const current = stockData.totalCalculated;
  const safety = material.safetyStock || 0;
  
  if (current <= 0) {
    return {
      action: 'immediate_restock',
      priority: 'critical',
      recommendedQuantity: safety * 2,
      reason: 'Material is out of stock'
    };
  }
  
  if (current <= safety * 0.5) {
    return {
      action: 'urgent_restock',
      priority: 'high',
      recommendedQuantity: safety * 1.5,
      reason: 'Stock below critical level'
    };
  }
  
  if (current <= safety) {
    return {
      action: 'plan_restock',
      priority: 'medium',
      recommendedQuantity: safety,
      reason: 'Stock at safety level'
    };
  }
  
  return {
    action: 'no_action',
    priority: 'low',
    recommendedQuantity: 0,
    reason: 'Stock adequate'
  };
};

const calculateRecommendedQuantity = (alert) => {
  // Simple algorithm: safety stock + shortfall + 20% buffer
  return Math.ceil((alert.safetyStock + Math.abs(alert.shortfall)) * 1.2);
};

const estimateReorderCost = (alert) => {
  // This would typically involve supplier pricing logic
  // For now, return a placeholder
  return null;
};

const calculateUrgencyScore = (alert) => {
  const priorityScores = { critical: 100, high: 75, medium: 50, low: 25 };
  const baseScore = priorityScores[alert.priority] || 0;
  
  // Add urgency based on how long since last purchase
  const daysSinceLastPurchase = alert.lastPurchaseDate 
    ? Math.floor((new Date() - new Date(alert.lastPurchaseDate)) / (1000 * 60 * 60 * 24))
    : 365;
  
  const timeUrgency = Math.min(daysSinceLastPurchase / 30, 25); // Max 25 points for time
  
  return baseScore + timeUrgency;
};

module.exports = {
  getMaterials,
  getMaterialById,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  getInventorySummary,
  getRestockRecommendations
}; 