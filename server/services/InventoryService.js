const { Material, MaterialMovement, PurchaseLog } = require('../models');
const sequelize = require('../db');

class InventoryService {
  /**
   * Calculate current stock for a specific material
   * Combines PurchaseLog (delivered items) + MaterialMovement (current system)
   */
  async getCurrentStock(materialId) {
    try {
      // Get purchase stock (only delivered items)
      const purchaseStock = await PurchaseLog.sum('stock', {
        where: { 
          materialId, 
          status: 'diterima' 
        }
      }) || 0;

      // Get current MaterialMovement stock (existing system)
      const material = await Material.findByPk(materialId);
      const movementStock = material?.qtyOnHand || 0;

      // Calculate total (for now, we'll use the higher value to avoid conflicts)
      // In future, this can be refined based on business logic
      const totalCalculated = Math.max(purchaseStock, movementStock);

      return {
        materialId,
        purchaseStock: parseFloat(purchaseStock),
        movementStock: parseFloat(movementStock),
        totalCalculated: parseFloat(totalCalculated),
        source: 'hybrid_calculation',
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('Error calculating stock for material:', materialId, error);
      throw error;
    }
  }

  /**
   * Get complete inventory with calculated stock for all materials
   */
  async getMaterialInventory() {
    try {
      const materials = await Material.findAll({
        include: [
          {
            model: PurchaseLog,
            attributes: [
              [sequelize.fn('SUM', sequelize.col('stock')), 'totalPurchased'],
              [sequelize.fn('COUNT', sequelize.col('PurchaseLogs.id')), 'purchaseCount'],
              [sequelize.fn('MAX', sequelize.col('purchasedDate')), 'lastPurchaseDate']
            ],
            where: { status: 'diterima' },
            required: false
          }
        ],
        group: ['Material.id']
      });

      const inventoryData = await Promise.all(
        materials.map(async (material) => {
          const stockCalculation = await this.getCurrentStock(material.id);
          
          return {
            ...material.toJSON(),
            calculatedStock: stockCalculation,
            purchaseHistory: {
              totalPurchased: material.PurchaseLogs?.[0]?.get('totalPurchased') || 0,
              purchaseCount: material.PurchaseLogs?.[0]?.get('purchaseCount') || 0,
              lastPurchaseDate: material.PurchaseLogs?.[0]?.get('lastPurchaseDate') || null
            }
          };
        })
      );

      return inventoryData;
    } catch (error) {
      console.error('Error getting material inventory:', error);
      throw error;
    }
  }

  /**
   * Get purchase history for a specific material
   */
  async getMaterialPurchaseHistory(materialId) {
    try {
      const purchases = await PurchaseLog.findAll({
        where: { materialId },
        order: [['purchasedDate', 'DESC']],
        include: [
          {
            model: Material,
            attributes: ['name', 'code', 'unit']
          }
        ]
      });

      const summary = {
        totalPurchases: purchases.length,
        totalQuantity: purchases.reduce((sum, p) => sum + parseFloat(p.stock), 0),
        totalValue: purchases.reduce((sum, p) => sum + (parseFloat(p.stock) * parseFloat(p.price || 0)), 0),
        deliveredQuantity: purchases
          .filter(p => p.status === 'diterima')
          .reduce((sum, p) => sum + parseFloat(p.stock), 0),
        pendingQuantity: purchases
          .filter(p => p.status !== 'diterima')
          .reduce((sum, p) => sum + parseFloat(p.stock), 0)
      };

      return {
        materialId,
        summary,
        purchases
      };
    } catch (error) {
      console.error('Error getting purchase history:', error);
      throw error;
    }
  }

  /**
   * Get inventory analytics and insights
   */
  async getInventoryAnalytics() {
    try {
      // Material counts and values
      const materialStats = await Material.findAll({
        attributes: [
          [sequelize.fn('COUNT', sequelize.col('id')), 'totalMaterials'],
          [sequelize.fn('SUM', sequelize.col('qtyOnHand')), 'totalMovementStock'],
          [sequelize.fn('COUNT', sequelize.literal('CASE WHEN qtyOnHand <= safetyStock THEN 1 END')), 'criticalStockCount'],
          [sequelize.fn('COUNT', sequelize.literal('CASE WHEN qtyOnHand = 0 THEN 1 END')), 'outOfStockCount']
        ],
        raw: true
      });

      // Purchase statistics
      const purchaseStats = await PurchaseLog.findAll({
        attributes: [
          [sequelize.fn('COUNT', sequelize.col('id')), 'totalPurchases'],
          [sequelize.fn('SUM', sequelize.col('stock')), 'totalPurchaseQuantity'],
          [sequelize.fn('SUM', sequelize.literal('stock * COALESCE(price, 0)')), 'totalPurchaseValue'],
          [sequelize.fn('COUNT', sequelize.literal('CASE WHEN status = "diterima" THEN 1 END')), 'deliveredPurchases'],
          [sequelize.fn('COUNT', sequelize.literal('CASE WHEN status = "pending" OR status = "dp" THEN 1 END')), 'pendingPurchases']
        ],
        raw: true
      });

      // Top suppliers by purchase value
      const topSuppliers = await PurchaseLog.findAll({
        attributes: [
          'supplier',
          [sequelize.fn('COUNT', sequelize.col('id')), 'purchaseCount'],
          [sequelize.fn('SUM', sequelize.literal('stock * COALESCE(price, 0)')), 'totalValue'],
          [sequelize.fn('SUM', sequelize.col('stock')), 'totalQuantity']
        ],
        where: {
          supplier: { [sequelize.Op.ne]: null }
        },
        group: ['supplier'],
        order: [[sequelize.fn('SUM', sequelize.literal('stock * COALESCE(price, 0)')), 'DESC']],
        limit: 10,
        raw: true
      });

      return {
        materialStats: materialStats[0],
        purchaseStats: purchaseStats[0],
        topSuppliers,
        generatedAt: new Date()
      };
    } catch (error) {
      console.error('Error getting inventory analytics:', error);
      throw error;
    }
  }

  /**
   * Check materials that need restocking based on safety stock levels
   */
  async getRestockAlerts() {
    try {
      const inventoryData = await this.getMaterialInventory();
      
      const restockNeeded = inventoryData.filter(material => {
        const currentStock = material.calculatedStock.totalCalculated;
        const safetyStock = material.safetyStock || 0;
        return currentStock <= safetyStock;
      });

      return restockNeeded.map(material => ({
        materialId: material.id,
        materialName: material.name,
        materialCode: material.code,
        currentStock: material.calculatedStock.totalCalculated,
        safetyStock: material.safetyStock,
        shortfall: material.safetyStock - material.calculatedStock.totalCalculated,
        lastPurchaseDate: material.purchaseHistory.lastPurchaseDate,
        priority: this.calculateRestockPriority(
          material.calculatedStock.totalCalculated, 
          material.safetyStock
        )
      }));
    } catch (error) {
      console.error('Error getting restock alerts:', error);
      throw error;
    }
  }

  /**
   * Calculate restock priority based on current stock vs safety stock
   */
  calculateRestockPriority(currentStock, safetyStock) {
    if (currentStock <= 0) return 'critical';
    if (currentStock <= safetyStock * 0.5) return 'high';
    if (currentStock <= safetyStock * 0.8) return 'medium';
    return 'low';
  }

  /**
   * Validate inventory data consistency between systems
   */
  async validateInventoryConsistency() {
    try {
      const materials = await Material.findAll();
      const inconsistencies = [];

      for (const material of materials) {
        const stockData = await this.getCurrentStock(material.id);
        
        if (Math.abs(stockData.purchaseStock - stockData.movementStock) > 0.01) {
          inconsistencies.push({
            materialId: material.id,
            materialName: material.name,
            purchaseStock: stockData.purchaseStock,
            movementStock: stockData.movementStock,
            difference: stockData.purchaseStock - stockData.movementStock
          });
        }
      }

      return {
        totalMaterials: materials.length,
        inconsistencies: inconsistencies.length,
        details: inconsistencies,
        validatedAt: new Date()
      };
    } catch (error) {
      console.error('Error validating inventory consistency:', error);
      throw error;
    }
  }
}

module.exports = new InventoryService(); 
