const MaterialMovement = require('../models/MaterialMovement');
const PurchaseLog = require('../models/PurchaseLog');

class PurchaseMovementService {
  
  /**
   * Create movement when purchase is received
   * @param {Object} purchaseLog - PurchaseLog instance
   * @returns {Object} Created MaterialMovement
   */
  static async createPurchaseMovement(purchaseLog) {
    console.log(`🔄 Creating movement for purchase ${purchaseLog.id} (${purchaseLog.supplier})`);
    
    // Check if movement already exists for this purchase
    const existingMovement = await MaterialMovement.findByPurchaseLog(purchaseLog.id);
    
    if (existingMovement) {
      console.log(`⚠️  Movement already exists for purchase ${purchaseLog.id}`);
      throw new Error(`Movement already exists for purchase ${purchaseLog.id}`);
    }
    
    // Calculate total value
    const totalValue = (purchaseLog.stock || 0) * (purchaseLog.price || 0);
    
    const movementData = {
      materialId: purchaseLog.materialId,
      purchaseLogId: purchaseLog.id,
      qty: purchaseLog.stock,
      movementType: 'MASUK',
      movementSource: 'purchase',
      referenceNumber: `PO-${purchaseLog.id.toString().padStart(6, '0')}`,
      unitPrice: purchaseLog.price,
      totalValue: totalValue,
      description: `Purchase delivery from ${purchaseLog.supplier || 'Unknown supplier'}`,
      notes: `Auto-generated from purchase log ${purchaseLog.id}. Status: ${purchaseLog.status}. PIC: ${purchaseLog.picName || 'N/A'}`
    };
    
    const movement = await MaterialMovement.create(movementData);
    
    console.log(`✅ Movement created: ID ${movement.id}, Qty: ${movement.qty}, Value: ${movement.totalValue}`);
    
    return movement;
  }
  
  /**
   * Update movement when purchase is modified
   * @param {Object} purchaseLog - Updated PurchaseLog instance
   * @returns {Object} Updated MaterialMovement or null
   */
  static async updatePurchaseMovement(purchaseLog) {
    console.log(`🔄 Updating movement for purchase ${purchaseLog.id}`);
    
    const movement = await MaterialMovement.findByPurchaseLog(purchaseLog.id);
    
    if (!movement) {
      console.log(`⚠️  No movement found for purchase ${purchaseLog.id}`);
      return null;
    }
    
    // Calculate new total value
    const totalValue = (purchaseLog.stock || 0) * (purchaseLog.price || 0);
    
    const updateData = {
      qty: purchaseLog.stock,
      unitPrice: purchaseLog.price,
      totalValue: totalValue,
      description: `Purchase delivery from ${purchaseLog.supplier || 'Unknown supplier'}`,
      notes: `Updated from purchase log ${purchaseLog.id}. Status: ${purchaseLog.status}. PIC: ${purchaseLog.picName || 'N/A'}`
    };
    
    const updatedMovement = await movement.update(updateData);
    
    console.log(`✅ Movement updated: ID ${updatedMovement.id}, New Qty: ${updatedMovement.qty}, New Value: ${updatedMovement.totalValue}`);
    
    return updatedMovement;
  }
  
  /**
   * Remove movement when purchase is cancelled or status changed from 'diterima'
   * @param {number} purchaseLogId - Purchase log ID
   * @returns {boolean} Success status
   */
  static async removePurchaseMovement(purchaseLogId) {
    console.log(`🗑️  Removing movement for purchase ${purchaseLogId}`);
    
    const movement = await MaterialMovement.findByPurchaseLog(purchaseLogId);
    
    if (!movement) {
      console.log(`⚠️  No movement found for purchase ${purchaseLogId}`);
      return false;
    }
    
    await movement.destroy();
    
    console.log(`✅ Movement removed for purchase ${purchaseLogId}`);
    
    return true;
  }
  
  /**
   * Sync all existing 'diterima' purchases to movements
   * @returns {Object} Sync results
   */
  static async syncAllPurchasesToMovements() {
    console.log('🔄 Starting bulk sync of purchases to movements...');
    
    try {
      // Get all received purchases
      const receivedPurchases = await PurchaseLog.findByStatus('diterima');
      
      console.log(`📊 Found ${receivedPurchases.length} received purchases to sync`);
      
      const results = {
        total: receivedPurchases.length,
        created: 0,
        skipped: 0,
        errors: []
      };
      
      for (const purchase of receivedPurchases) {
        try {
          await this.createPurchaseMovement(purchase);
          results.created++;
        } catch (error) {
          if (error.message.includes('Movement already exists')) {
            results.skipped++;
          } else {
            results.errors.push({
              purchaseId: purchase.id,
              error: error.message
            });
          }
        }
      }
      
      console.log(`✅ Sync completed: ${results.created} created, ${results.skipped} skipped, ${results.errors.length} errors`);
      
      return results;
      
    } catch (error) {
      console.error('❌ Error during bulk sync:', error.message);
      throw error;
    }
  }
  
  /**
   * Get movement statistics for purchase integration
   * @returns {Object} Statistics
   */
  static async getPurchaseMovementStats() {
    try {
      const stats = await MaterialMovement.getMovementSummary({
        movementSource: 'purchase'
      });
      
      const totalPurchaseMovements = await MaterialMovement.count({
        where: { movementSource: 'purchase' }
      });
      
      const totalPurchasesReceived = await PurchaseLog.count({
        where: { status: 'diterima' }
      });
      
      return {
        totalPurchaseMovements,
        totalPurchasesReceived,
        syncPercentage: totalPurchasesReceived > 0 ? 
          Math.round((totalPurchaseMovements / totalPurchasesReceived) * 100) : 0,
        movementSummary: stats
      };
      
    } catch (error) {
      console.error('❌ Error getting purchase movement stats:', error.message);
      throw error;
    }
  }
  
  /**
   * Validate purchase movement data
   * @param {Object} purchaseLog - Purchase log to validate
   * @returns {Object} Validation result
   */
  static validatePurchaseForMovement(purchaseLog) {
    const errors = [];
    
    if (!purchaseLog.materialId) {
      errors.push('materialId is required');
    }
    
    if (!purchaseLog.stock || purchaseLog.stock <= 0) {
      errors.push('stock must be greater than 0');
    }
    
    if (purchaseLog.status !== 'diterima') {
      errors.push('purchase status must be "diterima" to create movement');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = PurchaseMovementService; 