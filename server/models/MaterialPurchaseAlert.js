const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const MaterialPurchaseAlert = sequelize.define('MaterialPurchaseAlert', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  
  // Core relationships  
  materialId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'materials',
      key: 'id'
    },
    comment: 'Material that needs purchasing'
  },
  orderId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'orders',
      key: 'id'
    },
    comment: 'Order that triggered the alert'
  },
  
  // Stock analysis data
  currentStock: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'Stock level when alert was created'
  },
  safetyStock: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'Safety stock threshold'
  },
  requiredStock: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'Additional stock needed for order'
  },
  
  // Alert management
  status: {
    type: DataTypes.ENUM('pending', 'ordered', 'received', 'resolved'),
    defaultValue: 'pending',
    allowNull: false,
    comment: 'Current status of the purchase alert'
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
    defaultValue: 'medium',
    allowNull: false,
    comment: 'Priority level based on stock shortage severity'
  },
  
  // Timeline tracking
  alertDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false,
    comment: 'When the alert was created'
  },
  orderDate: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When material was ordered from supplier'
  },
  expectedDate: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Expected delivery date from supplier'
  },
  resolvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When alert was resolved (stock replenished)'
  },
  
  // Additional information
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Procurement notes, supplier communications, etc.'
  },
  supplierInfo: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Supplier contact information, quotations, etc.'
  },
  
  // Audit trail
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'User who created the order that triggered alert'
  },
  resolvedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'User who resolved the alert'
  }
}, {
  tableName: 'material_purchase_alerts',
  timestamps: true,
  
  // Indexes for performance optimization
  indexes: [
    {
      name: 'idx_material_status',
      fields: ['materialId', 'status']
    },
    {
      name: 'idx_order_alert',
      fields: ['orderId', 'alertDate']
    },
    {
      name: 'idx_status_priority',
      fields: ['status', 'priority']
    },
    {
      name: 'idx_alert_date',
      fields: ['alertDate']
    },
    {
      name: 'idx_status',
      fields: ['status']
    },
    {
      name: 'idx_priority',
      fields: ['priority']
    }
  ]
});

// Instance methods for alert management
MaterialPurchaseAlert.prototype.markAsOrdered = function(orderDate, expectedDate, notes, userId) {
  return this.update({
    status: 'ordered',
    orderDate: orderDate || new Date(),
    expectedDate: expectedDate,
    notes: notes || this.notes,
    resolvedBy: userId
  });
};

MaterialPurchaseAlert.prototype.markAsReceived = function(notes, userId) {
  return this.update({
    status: 'received',
    notes: notes || this.notes,
    resolvedBy: userId
  });
};

MaterialPurchaseAlert.prototype.markAsResolved = function(notes, userId) {
  return this.update({
    status: 'resolved',
    resolvedAt: new Date(),
    notes: notes || this.notes,
    resolvedBy: userId
  });
};

MaterialPurchaseAlert.prototype.isOverdue = function() {
  if (!this.expectedDate || this.status === 'resolved') return false;
  return new Date() > new Date(this.expectedDate) && this.status !== 'received';
};

MaterialPurchaseAlert.prototype.getDaysUntilExpected = function() {
  if (!this.expectedDate) return null;
  const today = new Date();
  const expected = new Date(this.expectedDate);
  const diffTime = expected - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

MaterialPurchaseAlert.prototype.getAlertAge = function() {
  const today = new Date();
  const alertDate = new Date(this.alertDate);
  const diffTime = today - alertDate;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Static methods for queries and analysis
MaterialPurchaseAlert.findByStatus = function(status) {
  return this.findAll({
    where: { status },
    include: [
      { association: 'Material' },
      { association: 'Order' }
    ],
    order: [['priority', 'DESC'], ['alertDate', 'ASC']]
  });
};

MaterialPurchaseAlert.findByMaterial = function(materialId, status = null) {
  const where = { materialId };
  if (status) where.status = status;
  
  return this.findAll({
    where,
    include: [
      { association: 'Material' },
      { association: 'Order' }
    ],
    order: [['alertDate', 'DESC']]
  });
};

MaterialPurchaseAlert.findCriticalAlerts = function() {
  return this.findAll({
    where: {
      priority: 'critical',
      status: ['pending', 'ordered']
    },
    include: [
      { association: 'Material' },
      { association: 'Order' }
    ],
    order: [['alertDate', 'ASC']]
  });
};

MaterialPurchaseAlert.getAlertsSummary = async function() {
  const alerts = await this.findAll({
    attributes: [
      'status',
      'priority',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count']
    ],
    group: ['status', 'priority'],
    raw: true
  });

  const summary = {
    total: 0,
    byStatus: { pending: 0, ordered: 0, received: 0, resolved: 0 },
    byPriority: { low: 0, medium: 0, high: 0, critical: 0 },
    critical: 0
  };

  alerts.forEach(alert => {
    const count = parseInt(alert.count);
    summary.total += count;
    summary.byStatus[alert.status] += count;
    summary.byPriority[alert.priority] += count;
    
    if (alert.priority === 'critical' && alert.status !== 'resolved') {
      summary.critical += count;
    }
  });

  return summary;
};

module.exports = MaterialPurchaseAlert; 