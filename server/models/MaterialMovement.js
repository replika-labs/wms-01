const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const MaterialMovement = sequelize.define('MaterialMovement', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  materialId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Reference to material being moved'
  },
  orderId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Reference to related order (optional)'
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'User who initiated the movement'
  },
  qty: {
    type: DataTypes.DOUBLE,
    allowNull: false,
    comment: 'Quantity moved'
  },
  movementType: {
    type: DataTypes.ENUM('MASUK', 'KELUAR'),
    allowNull: false,
    comment: 'Direction of movement: MASUK (in) or KELUAR (out)'
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Movement description'
  },
  purchaseLogId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'purchase_logs',
      key: 'id'
    },
    comment: 'Reference to purchase that generated this movement'
  },
  movementSource: {
    type: DataTypes.ENUM('manual', 'purchase', 'order', 'adjustment'),
    defaultValue: 'manual',
    allowNull: false,
    comment: 'Source of the movement'
  },
  referenceNumber: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Reference number (purchase order, delivery note, etc.)'
  },
  unitPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Unit price for inventory valuation'
  },
  totalValue: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Total value of movement (qty * unitPrice)'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Additional movement notes'
  }
}, {
  tableName: 'material_movements',
  timestamps: true,
  indexes: [
    { name: 'idx_movement_material', fields: ['materialId'] },
    { name: 'idx_movement_purchase', fields: ['purchaseLogId'] },
    { name: 'idx_movement_type', fields: ['movementType'] },
    { name: 'idx_movement_source', fields: ['movementSource'] },
    { name: 'idx_movement_date', fields: ['createdAt'] }
  ]
});

// Instance methods
MaterialMovement.prototype.calculateValue = function() {
  return (this.qty || 0) * (this.unitPrice || 0);
};

MaterialMovement.prototype.isPurchaseGenerated = function() {
  return this.movementSource === 'purchase' && this.purchaseLogId !== null;
};

MaterialMovement.prototype.isManual = function() {
  return this.movementSource === 'manual';
};

MaterialMovement.prototype.updateValue = function() {
  const calculatedValue = this.calculateValue();
  return this.update({ totalValue: calculatedValue });
};

// Static methods
MaterialMovement.findByMaterial = function(materialId, options = {}) {
  const whereClause = { materialId };
  if (options.movementType) whereClause.movementType = options.movementType;
  if (options.movementSource) whereClause.movementSource = options.movementSource;
  
  return this.findAll({
    where: whereClause,
    order: [['createdAt', 'DESC']],
    ...options
  });
};

MaterialMovement.findByPurchaseLog = function(purchaseLogId) {
  return this.findOne({
    where: { purchaseLogId }
  });
};

MaterialMovement.findBySource = function(movementSource, options = {}) {
  return this.findAll({
    where: { movementSource },
    order: [['createdAt', 'DESC']],
    ...options
  });
};

MaterialMovement.calculateInventoryForMaterial = async function(materialId) {
  const movements = await this.findByMaterial(materialId);
  
  let totalMasuk = 0;
  let totalKeluar = 0;
  let totalValue = 0;
  
  movements.forEach(movement => {
    if (movement.movementType === 'MASUK') {
      totalMasuk += parseFloat(movement.qty || 0);
      totalValue += parseFloat(movement.totalValue || 0);
    } else {
      totalKeluar += parseFloat(movement.qty || 0);
    }
  });
  
  return {
    totalMasuk,
    totalKeluar,
    currentStock: totalMasuk - totalKeluar,
    totalValue,
    averagePrice: totalMasuk > 0 ? totalValue / totalMasuk : 0,
    movementCount: movements.length
  };
};

MaterialMovement.getMovementSummary = async function(options = {}) {
  const { startDate, endDate, materialId, movementSource } = options;
  
  const whereClause = {};
  if (materialId) whereClause.materialId = materialId;
  if (movementSource) whereClause.movementSource = movementSource;
  if (startDate || endDate) {
    whereClause.createdAt = {};
    if (startDate) whereClause.createdAt[sequelize.Sequelize.Op.gte] = startDate;
    if (endDate) whereClause.createdAt[sequelize.Sequelize.Op.lte] = endDate;
  }
  
  const movements = await this.findAll({
    where: whereClause,
    attributes: [
      'movementType',
      'movementSource',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      [sequelize.fn('SUM', sequelize.col('qty')), 'totalQty'],
      [sequelize.fn('SUM', sequelize.col('totalValue')), 'totalValue']
    ],
    group: ['movementType', 'movementSource']
  });
  
  return movements;
};

module.exports = MaterialMovement; 