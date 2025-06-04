const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const ProductProgressReport = sequelize.define('ProductProgressReport', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  progressReportId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'progress_reports',
      key: 'id'
    },
    comment: 'Reference to the overall progress report'
  },
  productId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'products',
      key: 'id'
    },
    comment: 'Reference to the specific product'
  },
  orderProductId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'order_products',
      key: 'id'
    },
    comment: 'Reference to the order-product relationship'
  },
  pcsFinished: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Number of pieces completed for this product in this report'
  },
  pcsTargetForThisReport: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Target pieces for this specific report/milestone'
  },
  fabricUsed: {
    type: DataTypes.DECIMAL(10, 3),
    allowNull: true,
    defaultValue: 0,
    comment: 'Amount of fabric used for this product progress'
  },
  qualityNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Quality assessment notes for this product'
  },
  challenges: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Challenges faced during production of this product'
  },
  estimatedCompletion: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Estimated completion date for this product'
  },
  workHours: {
    type: DataTypes.DECIMAL(4, 2),
    allowNull: true,
    defaultValue: 0,
    comment: 'Work hours spent on this product'
  },
  qualityScore: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 100,
    validate: {
      min: 0,
      max: 100
    },
    comment: 'Quality score (0-100) for this product progress'
  }
}, {
  tableName: 'product_progress_reports',
  timestamps: true,
  indexes: [
    {
      name: 'idx_progress_product',
      fields: ['progressReportId', 'productId']
    },
    {
      name: 'idx_order_product_progress',
      fields: ['orderProductId']
    },
    {
      name: 'idx_product_timeline',
      fields: ['productId', 'createdAt']
    }
  ]
});

// Instance methods for calculations
ProductProgressReport.prototype.calculateCompletionPercentage = function() {
  if (!this.pcsTargetForThisReport || this.pcsTargetForThisReport === 0) {
    return 0;
  }
  return Math.round((this.pcsFinished / this.pcsTargetForThisReport) * 100);
};

ProductProgressReport.prototype.calculateEfficiency = function() {
  if (!this.workHours || this.workHours === 0) {
    return null; // Cannot calculate efficiency without work hours
  }
  return Math.round((this.pcsFinished / this.workHours) * 100) / 100; // Pieces per hour
};

ProductProgressReport.prototype.isOnSchedule = function() {
  if (!this.estimatedCompletion) {
    return 'unknown';
  }
  
  const now = new Date();
  const completionPercentage = this.calculateCompletionPercentage();
  
  if (completionPercentage >= 100) {
    return this.estimatedCompletion >= now ? 'completed-on-time' : 'completed-late';
  }
  
  // Calculate expected progress based on time elapsed
  const startDate = this.createdAt;
  const totalDuration = this.estimatedCompletion.getTime() - startDate.getTime();
  const elapsedDuration = now.getTime() - startDate.getTime();
  const expectedProgress = Math.round((elapsedDuration / totalDuration) * 100);
  
  if (completionPercentage >= expectedProgress) {
    return 'on-schedule';
  } else if (completionPercentage >= expectedProgress * 0.8) {
    return 'slightly-behind';
  } else {
    return 'behind-schedule';
  }
};

ProductProgressReport.prototype.getFabricEfficiency = function() {
  if (!this.fabricUsed || this.fabricUsed === 0 || !this.pcsFinished || this.pcsFinished === 0) {
    return null;
  }
  return Math.round((this.fabricUsed / this.pcsFinished) * 1000) / 1000; // Fabric per piece
};

ProductProgressReport.prototype.getQualityGrade = function() {
  const score = this.qualityScore || 100;
  if (score >= 95) return 'A+';
  if (score >= 90) return 'A';
  if (score >= 85) return 'B+';
  if (score >= 80) return 'B';
  if (score >= 75) return 'C+';
  if (score >= 70) return 'C';
  return 'D';
};

// Static methods
ProductProgressReport.findByProduct = async function(productId, options = {}) {
  return await this.findAll({
    where: { productId },
    order: [['createdAt', 'DESC']],
    ...options
  });
};

ProductProgressReport.findByOrder = async function(orderId, options = {}) {
  const { OrderProduct } = require('./index');
  
  return await this.findAll({
    include: [{
      model: OrderProduct,
      where: { orderId },
      required: true
    }],
    order: [['createdAt', 'DESC']],
    ...options
  });
};

ProductProgressReport.calculateOrderProductProgress = async function(orderProductId) {
  const reports = await this.findAll({
    where: { orderProductId },
    order: [['createdAt', 'ASC']]
  });
  
  const totalCompleted = reports.reduce((sum, report) => sum + report.pcsFinished, 0);
  const totalFabricUsed = reports.reduce((sum, report) => sum + (report.fabricUsed || 0), 0);
  const totalWorkHours = reports.reduce((sum, report) => sum + (report.workHours || 0), 0);
  
  return {
    totalCompleted,
    totalFabricUsed,
    totalWorkHours,
    reportCount: reports.length,
    averageQualityScore: reports.length > 0 ? 
      Math.round(reports.reduce((sum, report) => sum + (report.qualityScore || 100), 0) / reports.length) : 100,
    lastReportDate: reports.length > 0 ? reports[reports.length - 1].createdAt : null,
    efficiency: totalWorkHours > 0 ? Math.round((totalCompleted / totalWorkHours) * 100) / 100 : 0
  };
};

module.exports = ProductProgressReport; 