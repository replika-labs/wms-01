const { Material, Product, MaterialPurchaseAlert, ProductMaterial } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

class MaterialStockChecker {
  /**
   * Check material stock for an order and generate alerts if needed
   * @param {Array} selectedProducts - Array of { productId, quantity }
   * @param {number} orderId - Order ID (optional for preview)
   * @param {number} userId - User ID for audit trail
   * @returns {Object} Stock checking results with alerts and warnings
   */
  async checkOrderStock(selectedProducts, orderId = null, userId = null) {
    const results = {
      alerts: [],
      warnings: [],
      canProceed: true,
      totalMaterialsNeeded: {},
      stockAnalysis: []
    };

    try {
      // Step 1: Aggregate material requirements from all products
      const materialRequirements = await this.aggregateMaterialNeeds(selectedProducts);
      results.totalMaterialsNeeded = materialRequirements;

      // Step 2: Check each material against current stock and safety levels
      for (const [materialId, requiredQty] of Object.entries(materialRequirements)) {
        try {
          const material = await MaterialNew.findByPk(materialId);
          
          if (!material) {
            results.warnings.push(`Material ID ${materialId} not found in database`);
            continue;
          }

          // Step 3: Perform stock analysis
          const stockAnalysis = this.analyzeMaterialStock(material, requiredQty);
          results.stockAnalysis.push({
            materialId: material.id,
            materialName: material.name,
            ...stockAnalysis
          });

          // Step 4: Generate purchase alert if needed (only if orderId provided)
          if (stockAnalysis.needsAlert && orderId) {
            try {
              const alert = await this.createPurchaseAlertSafely(
                material, 
                requiredQty, 
                orderId,
                stockAnalysis,
                userId
              );
              if (alert) {
                results.alerts.push(alert);
              }
            } catch (alertError) {
              console.error(`Failed to create purchase alert for material ${material.name}:`, alertError);
              results.warnings.push(`Could not create purchase alert for ${material.name}`);
            }
          }

          // Step 5: Add warning message for user notification
          if (stockAnalysis.isBelowSafety || stockAnalysis.willBeBelowSafety) {
            results.warnings.push(
              `${material.name}: ${material.qtyOnHand}${material.unit} < ${material.safetyStock}${material.unit} (safety level)`
            );
          }
        } catch (materialError) {
          console.error(`Error processing material ${materialId}:`, materialError);
          results.warnings.push(`Could not check stock for material ID ${materialId}`);
        }
      }

      // Step 6: Determine if order can proceed (for now, always allow but with warnings)
      results.canProceed = true; // Could be made configurable

      return results;

    } catch (error) {
      console.error('Error in MaterialStockChecker.checkOrderStock:', error);
      // Return graceful error response instead of throwing
      return {
        alerts: [],
        warnings: [`Stock checking failed: ${error.message}`],
        canProceed: true,
        totalMaterialsNeeded: {},
        stockAnalysis: []
      };
    }
  }

  /**
   * Aggregate material needs from selected products
   * @param {Array} selectedProducts - Array of { productId, quantity }
   * @returns {Object} Material requirements { materialId: totalQuantity }
   */
  async aggregateMaterialNeeds(selectedProducts) {
    const materialNeeds = {};
    
    for (const { productId, quantity } of selectedProducts) {
      // Find product with its material relationship
      const product = await Product.findByPk(productId, {
        include: [{ model: Material, attributes: ['id', 'name', 'unit'] }]
      });
      
      if (product && product.materialId) {
        // Simple 1:1 ratio assumption for now
        // This could be enhanced with ProductMaterial table for complex material ratios
        const materialRequired = quantity * 1; // 1 unit material per product
        
        if (materialNeeds[product.materialId]) {
          materialNeeds[product.materialId] += materialRequired;
        } else {
          materialNeeds[product.materialId] = materialRequired;
        }
      }
    }
    
    return materialNeeds;
  }

  /**
   * Analyze material stock levels and safety requirements
   * @param {Object} material - MaterialNew model instance
   * @param {number} requiredQty - Required quantity for order
   * @returns {Object} Stock analysis results
   */
  analyzeMaterialStock(material, requiredQty) {
    const currentStock = material.qtyOnHand || 0;
    const safetyStock = material.safetyStock || 0;
    const stockAfterOrder = currentStock - requiredQty;
    
    const analysis = {
      currentStock,
      safetyStock,
      requiredQty,
      stockAfterOrder,
      isBelowSafety: currentStock < safetyStock,
      willBeBelowSafety: stockAfterOrder < safetyStock,
      isOutOfStock: currentStock <= 0,
      willBeOutOfStock: stockAfterOrder <= 0,
      needsAlert: false,
      severity: 'low',
      shortageAmount: 0
    };

    // Determine if alert is needed
    analysis.needsAlert = analysis.isBelowSafety || analysis.willBeBelowSafety;

    // Calculate shortage amount
    if (analysis.willBeBelowSafety) {
      analysis.shortageAmount = Math.max(0, safetyStock - stockAfterOrder);
    }

    // Calculate severity level
    analysis.severity = this.calculateSeverity(currentStock, safetyStock, stockAfterOrder);

    return analysis;
  }

  /**
   * Calculate alert severity based on stock levels
   * @param {number} currentStock - Current stock level
   * @param {number} safetyStock - Safety stock threshold
   * @param {number} stockAfterOrder - Stock level after order completion
   * @returns {string} Severity level: 'low', 'medium', 'high', 'critical'
   */
  calculateSeverity(currentStock, safetyStock, stockAfterOrder) {
    // Critical: Already out of stock or will be out of stock
    if (currentStock <= 0 || stockAfterOrder <= 0) {
      return 'critical';
    }

    // High: Current stock is very low (less than 50% of safety stock)
    if (currentStock < safetyStock * 0.5) {
      return 'high';
    }

    // High: Order will cause severe shortage (stock after order < 25% safety stock)
    if (stockAfterOrder < safetyStock * 0.25) {
      return 'high';
    }

    // Medium: Currently below safety stock
    if (currentStock < safetyStock) {
      return 'medium';
    }

    // Medium: Order will cause stock to fall below safety level
    if (stockAfterOrder < safetyStock) {
      return 'medium';
    }

    // Low: No immediate concerns but approaching limits
    return 'low';
  }

  /**
   * Create a purchase alert with safe error handling
   * @param {Object} material - MaterialNew model instance
   * @param {number} requiredQty - Required quantity for order
   * @param {number} orderId - Order ID that triggered the alert
   * @param {Object} stockAnalysis - Stock analysis results
   * @param {number} userId - User ID for audit trail
   * @returns {Object|null} Created alert data or null if failed
   */
  async createPurchaseAlertSafely(material, requiredQty, orderId, stockAnalysis, userId = null) {
    try {
      // Check if alert already exists for this material and order
      const existingAlert = await MaterialPurchaseAlert.findOne({
        where: {
          materialId: material.id,
          orderId: orderId,
          status: ['pending', 'ordered'] // Don't create duplicate for active alerts
        }
      });

      if (existingAlert) {
        // Update existing alert with new requirements
        await existingAlert.update({
          currentStock: stockAnalysis.currentStock,
          requiredStock: Math.max(existingAlert.requiredStock, stockAnalysis.shortageAmount),
          priority: stockAnalysis.severity,
          notes: `Updated: Required quantity increased to ${requiredQty}`
        });

        return this.formatAlertResponse(existingAlert, material);
      }

      // Create new alert
      const alert = await MaterialPurchaseAlert.create({
        materialId: material.id,
        orderId: orderId,
        currentStock: stockAnalysis.currentStock,
        safetyStock: stockAnalysis.safetyStock,
        requiredStock: stockAnalysis.shortageAmount,
        priority: stockAnalysis.severity,
        status: 'pending',
        createdBy: userId,
        notes: `Auto-generated alert for order ${orderId}. Material needed: ${requiredQty} ${material.unit}`
      });

      return this.formatAlertResponse(alert, material);

    } catch (error) {
      console.error('Error creating purchase alert:', error);
      // Return null instead of throwing to allow order creation to continue
      return null;
    }
  }

  /**
   * Format alert response for API consumption
   * @param {Object} alert - MaterialPurchaseAlert instance
   * @param {Object} material - Material instance
   * @returns {Object} Formatted alert data
   */
  formatAlertResponse(alert, material) {
    return {
      id: alert.id,
      materialId: material.id,
      materialName: material.name,
      materialCode: material.code,
      currentStock: alert.currentStock,
      safetyStock: alert.safetyStock,
      requiredStock: alert.requiredStock,
      priority: alert.priority,
      status: alert.status,
      unit: material.unit,
      alertDate: alert.alertDate,
      isOverdue: alert.isOverdue(),
      alertAge: alert.getAlertAge()
    };
  }

  /**
   * Get stock warnings for display in UI without creating alerts
   * @param {Array} selectedProducts - Array of { productId, quantity }
   * @returns {Array} Array of warning messages
   */
  async getStockWarnings(selectedProducts) {
    const results = await this.checkOrderStock(selectedProducts, null, null);
    return results.warnings;
  }

  /**
   * Check if specific material is below safety stock
   * @param {number} materialId - Material ID
   * @returns {Object} Material stock status
   */
  async checkMaterialStatus(materialId) {
    const material = await MaterialNew.findByPk(materialId);
    if (!material) {
      throw new Error(`Material with ID ${materialId} not found`);
    }

    const analysis = this.analyzeMaterialStock(material, 0); // No additional requirements
    
    return {
      materialId: material.id,
      materialName: material.name,
      currentStock: material.qtyOnHand,
      safetyStock: material.safetyStock,
      unit: material.unit,
      isBelowSafety: analysis.isBelowSafety,
      severity: analysis.severity,
      status: analysis.isOutOfStock ? 'out_of_stock' : 
              analysis.isBelowSafety ? 'below_safety' : 'normal'
    };
  }

  /**
   * Get summary of all materials with stock issues
   * @returns {Array} Materials with stock issues
   */
  async getMaterialsWithStockIssues() {
    const materials = await MaterialNew.findAll({
      where: {
        [Op.or]: [
          { qtyOnHand: { [Op.lte]: 0 } }, // Out of stock
          sequelize.where(
            sequelize.col('qtyOnHand'), 
            Op.lt, 
            sequelize.col('safetyStock')
          ) // Below safety stock
        ]
      },
      attributes: ['id', 'name', 'code', 'qtyOnHand', 'safetyStock', 'unit']
    });

    return materials.map(material => {
      const analysis = this.analyzeMaterialStock(material, 0);
      return {
        materialId: material.id,
        materialName: material.name,
        materialCode: material.code,
        currentStock: material.qtyOnHand,
        safetyStock: material.safetyStock,
        unit: material.unit,
        severity: analysis.severity,
        status: analysis.isOutOfStock ? 'out_of_stock' : 'below_safety',
        shortageAmount: Math.max(0, material.safetyStock - material.qtyOnHand)
      };
    });
  }
}

module.exports = MaterialStockChecker; 