const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  orderNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true
    }
  },
  status: {
    type: DataTypes.ENUM(
      'created',        // Order baru dibuat
      'need material',  // Order membutuhkan pembelian material
      'confirmed',      // Order dikonfirmasi
      'processing',     // Sedang diproses
      'completed',      // Selesai diproduksi
      'shipped',        // Sudah dikirim
      'delivered',      // Sudah diterima customer
      'cancelled'       // Dibatalkan
    ),
    defaultValue: 'created',
    allowNull: false
  },
  targetPcs: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  completedPcs: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  customerNote: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  dueDate: {
    type: DataTypes.DATE,
    allowNull: true,
    validate: {
      isDate: true,
      isAfterToday(value) {
        if (value) {
          const inputDate = new Date(value);
          const today = new Date();
          // Set time to start of day for comparison
          today.setHours(0, 0, 0, 0);
          inputDate.setHours(0, 0, 0, 0);
          
          if (inputDate < today) {
            throw new Error('Due date cannot be in the past');
          }
        }
      }
    }
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      notNull: true
    }
  },
  tailorId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  tailorContactId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'contacts',
      key: 'id'
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
    defaultValue: 'medium',
    allowNull: false
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  }
}, {
  tableName: 'orders',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['orderNumber']
    },
    {
      fields: ['status']
    },
    {
      fields: ['dueDate']
    },
    {
      fields: ['userId']
    }
  ]
});

// Instance methods
Order.prototype.getProgress = function() {
  if (this.targetPcs === 0) return 0;
  return Math.round((this.completedPcs / this.targetPcs) * 100);
};

Order.prototype.isOverdue = function() {
  if (!this.dueDate) return false;
  return new Date() > new Date(this.dueDate) && this.status !== 'completed' && this.status !== 'delivered' && this.status !== 'cancelled';
};

Order.prototype.canBeCancelled = function() {
  return ['created', 'confirmed', 'processing'].includes(this.status);
};

module.exports = Order; 