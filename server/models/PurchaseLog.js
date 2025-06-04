const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const PurchaseLog = sequelize.define('PurchaseLog', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  purchasedDate: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'Date when material was purchased'
  },
  materialId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'materials',
      key: 'id'
    },
    comment: 'Reference to material being purchased'
  },
  stock: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'Quantity of material purchased'
  },
  unit: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'pcs',
    comment: 'Unit of measurement'
  },
  supplier: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Supplier name'
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Price per unit'
  },
  status: {
    type: DataTypes.ENUM('lunas', 'dp', 'dibayar', 'dikirim', 'diterima'),
    defaultValue: 'dp',
    allowNull: false,
    comment: 'Purchase status workflow'
  },
  paymentMethod: {
    type: DataTypes.ENUM('transfer', 'cod'),
    defaultValue: 'transfer',
    allowNull: false,
    comment: 'Payment method used'
  },
  picName: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Person in charge of purchase'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Additional notes about purchase'
  }
}, {
  tableName: 'purchase_logs',
  timestamps: true,
  indexes: [
    {
      name: 'idx_purchase_material',
      fields: ['materialId']
    },
    {
      name: 'idx_purchase_date',
      fields: ['purchasedDate']
    },
    {
      name: 'idx_purchase_status',
      fields: ['status']
    },
    {
      name: 'idx_purchase_supplier',
      fields: ['supplier']
    }
  ]
});

// Instance methods
PurchaseLog.prototype.updateStatus = function(newStatus, notes = null) {
  const updateData = { status: newStatus };
  if (notes) updateData.notes = notes;
  
  return this.update(updateData);
};

PurchaseLog.prototype.isDelivered = function() {
  return this.status === 'diterima';
};

PurchaseLog.prototype.calculateTotalValue = function() {
  return this.stock * (this.price || 0);
};

// Static methods
PurchaseLog.findByMaterial = function(materialId, status = null) {
  const where = { materialId };
  if (status) where.status = status;
  
  return this.findAll({
    where,
    order: [['purchasedDate', 'DESC']]
  });
};

PurchaseLog.findBySupplier = function(supplier) {
  return this.findAll({
    where: { supplier },
    order: [['purchasedDate', 'DESC']]
  });
};

PurchaseLog.findByStatus = function(status) {
  return this.findAll({
    where: { status },
    order: [['purchasedDate', 'DESC']]
  });
};

PurchaseLog.getInventoryContribution = function(materialId) {
  return this.sum('stock', {
    where: {
      materialId,
      status: 'diterima' // Only count delivered items
    }
  });
};

// PURCHASE MOVEMENT AUTOMATION HOOKS
// Add hooks for automatic material movement creation
PurchaseLog.addHook('afterUpdate', async (purchaseLog, options) => {
  try {
    // Import service inside hook to avoid circular dependencies
    const PurchaseMovementService = require('../services/PurchaseMovementService');
    
    // If status changed to 'diterima', create movement
    if (purchaseLog.changed('status') && purchaseLog.status === 'diterima') {
      console.log(`🔔 Purchase ${purchaseLog.id} status changed to 'diterima' - creating movement`);
      
      try {
        await PurchaseMovementService.createPurchaseMovement(purchaseLog);
        console.log(`✅ Automated movement created for purchase ${purchaseLog.id}`);
      } catch (error) {
        if (error.message.includes('Movement already exists')) {
          console.log(`ℹ️  Movement already exists for purchase ${purchaseLog.id}`);
        } else {
          console.error(`❌ Error creating movement for purchase ${purchaseLog.id}:`, error.message);
        }
      }
    }
    
    // If status changed from 'diterima' to something else, remove movement
    if (purchaseLog.changed('status') && 
        purchaseLog._previousDataValues.status === 'diterima' && 
        purchaseLog.status !== 'diterima') {
      console.log(`🔔 Purchase ${purchaseLog.id} status changed from 'diterima' - removing movement`);
      
      try {
        await PurchaseMovementService.removePurchaseMovement(purchaseLog.id);
        console.log(`✅ Movement removed for purchase ${purchaseLog.id}`);
      } catch (error) {
        console.error(`❌ Error removing movement for purchase ${purchaseLog.id}:`, error.message);
      }
    }
    
    // If still 'diterima' but other fields changed (stock, price, etc.), update movement
    if (!purchaseLog.changed('status') && purchaseLog.status === 'diterima') {
      const relevantFields = ['stock', 'price', 'supplier', 'picName'];
      const hasRelevantChanges = relevantFields.some(field => purchaseLog.changed(field));
      
      if (hasRelevantChanges) {
        console.log(`🔔 Purchase ${purchaseLog.id} details updated while 'diterima' - updating movement`);
        
        try {
          await PurchaseMovementService.updatePurchaseMovement(purchaseLog);
          console.log(`✅ Movement updated for purchase ${purchaseLog.id}`);
        } catch (error) {
          console.error(`❌ Error updating movement for purchase ${purchaseLog.id}:`, error.message);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error in PurchaseLog afterUpdate hook:', error.message);
    // Don't throw error here to avoid blocking the main update operation
  }
});

// Hook for new purchases that are created directly with 'diterima' status
PurchaseLog.addHook('afterCreate', async (purchaseLog, options) => {
  try {
    if (purchaseLog.status === 'diterima') {
      console.log(`🔔 New purchase ${purchaseLog.id} created with 'diterima' status - creating movement`);
      
      const PurchaseMovementService = require('../services/PurchaseMovementService');
      
      try {
        await PurchaseMovementService.createPurchaseMovement(purchaseLog);
        console.log(`✅ Automated movement created for new purchase ${purchaseLog.id}`);
      } catch (error) {
        console.error(`❌ Error creating movement for new purchase ${purchaseLog.id}:`, error.message);
      }
    }
  } catch (error) {
    console.error('❌ Error in PurchaseLog afterCreate hook:', error.message);
  }
});

module.exports = PurchaseLog; 