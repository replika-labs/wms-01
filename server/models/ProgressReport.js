const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const ProgressReport = sequelize.define('ProgressReport', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  orderId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Reference to the order'
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'User who submitted the progress (optional)'
  },
  productId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'products',
      key: 'id'
    },
    comment: 'Reference to specific product for individual tracking'
  },
  orderProductId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'order_products',
      key: 'id'
    },
    comment: 'Reference to order-product relationship for individual tracking'
  },
  reportType: {
    type: DataTypes.ENUM('aggregated', 'individual'),
    defaultValue: 'aggregated',
    allowNull: false,
    comment: 'Type of progress report: aggregated (legacy) or individual (per-product)'
  },
  pcsFinished: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Number of pieces completed in this report'
  },
  photoUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'URL to progress photo'
  },
  resiPengiriman: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Shipping receipt number'
  },
  note: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Progress notes'
  },
  tailorName: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Name of tailor who submitted progress'
  },
  reportedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    comment: 'When the progress was reported'
  }
}, {
  tableName: 'progress_reports',
  timestamps: false,
  indexes: [
    {
      name: 'idx_progress_product',
      fields: ['productId']
    },
    {
      name: 'idx_progress_order_product',
      fields: ['orderProductId']
    },
    {
      name: 'idx_progress_report_type',
      fields: ['reportType']
    },
    {
      name: 'idx_progress_order_product_combined',
      fields: ['orderId', 'productId']
    }
  ]
});

// Instance methods for individual product progress reports
ProgressReport.prototype.isIndividualReport = function() {
  return this.reportType === 'individual' && this.productId !== null
}

ProgressReport.prototype.isAggregatedReport = function() {
  return this.reportType === 'aggregated'
}

ProgressReport.prototype.getProductInfo = function() {
  if (!this.isIndividualReport()) return null
  
  return {
    productId: this.productId,
    orderProductId: this.orderProductId,
    pcsFinished: this.pcsFinished
  }
}

// Static methods for querying individual reports
ProgressReport.findByProduct = function(productId, orderId = null, options = {}) {
  const whereClause = {
    productId,
    reportType: 'individual'
  }
  
  if (orderId) whereClause.orderId = orderId
  
  return this.findAll({
    where: whereClause,
    order: [['reportedAt', 'DESC']],
    ...options
  })
}

ProgressReport.findIndividualReportsByOrder = function(orderId, options = {}) {
  return this.findAll({
    where: {
      orderId,
      reportType: 'individual'
    },
    order: [['reportedAt', 'DESC']],
    ...options
  })
}

ProgressReport.findAggregatedReportsByOrder = function(orderId, options = {}) {
  return this.findAll({
    where: {
      orderId,
      reportType: 'aggregated'
    },
    order: [['reportedAt', 'DESC']],
    ...options
  })
}

// Calculate total progress for a specific product in an order
ProgressReport.calculateProductProgress = async function(productId, orderId) {
  const reports = await this.findByProduct(productId, orderId)
  const totalCompleted = reports.reduce((sum, report) => sum + report.pcsFinished, 0)
  
  return {
    productId,
    orderId,
    totalCompleted,
    reportCount: reports.length,
    lastReportDate: reports.length > 0 ? reports[0].reportedAt : null
  }
}

module.exports = ProgressReport; 