const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const OrderProduct = sequelize.define('OrderProduct', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  orderId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  productId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  qty: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
  completedQty: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Total pieces completed for this specific product in the order',
    validate: {
      min: 0,
      notExceedsQty(value) {
        if (value > this.qty) {
          throw new Error('Completed quantity cannot exceed target quantity');
        }
      }
    }
  },
  isCompleted: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether this specific product in the order is completed'
  },
  completionDate: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Date when this product was marked as completed'
  },
}, {
  tableName: 'order_products',
  timestamps: true,
  indexes: [
    {
      fields: ['isCompleted'],
      name: 'idx_orderproduct_completion_status'
    },
    {
      fields: ['orderId', 'isCompleted'],
      name: 'idx_orderproduct_order_completion'
    },
    {
      fields: ['completionDate'],
      name: 'idx_orderproduct_completion_date'
    }
  ]
});

// Instance methods
OrderProduct.prototype.getCompletionPercentage = function() {
  if (this.qty === 0) return 0;
  return Math.round((this.completedQty / this.qty) * 100);
};

OrderProduct.prototype.getRemainingQty = function() {
  return Math.max(0, this.qty - this.completedQty);
};

OrderProduct.prototype.canBeCompleted = function() {
  return this.completedQty >= this.qty && !this.isCompleted;
};

OrderProduct.prototype.markAsCompleted = function() {
  if (this.completedQty >= this.qty) {
    this.isCompleted = true;
    this.completionDate = new Date();
    return true;
  }
  return false;
};

OrderProduct.prototype.updateProgress = function(additionalQty) {
  this.completedQty = Math.min(this.qty, this.completedQty + additionalQty);
  
  if (this.completedQty >= this.qty && !this.isCompleted) {
    this.markAsCompleted();
  }
  
  return this.getCompletionPercentage();
};

module.exports = OrderProduct; 