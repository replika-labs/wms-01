const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const StatusChange = sequelize.define('StatusChange', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  orderId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'orders',
      key: 'id'
    }
  },
  oldStatus: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  newStatus: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  changedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  note: {
    type: DataTypes.TEXT,
    allowNull: true,
  }
}, {
  tableName: 'status_changes',
  timestamps: true,
  indexes: [
    {
      fields: ['orderId']
    },
    {
      fields: ['changedBy']
    }
  ]
});

module.exports = StatusChange; 