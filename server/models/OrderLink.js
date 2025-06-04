const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const OrderLink = sequelize.define('OrderLink', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  orderId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  token: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  expireAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  }
}, {
  tableName: 'order_links',
  timestamps: true,
});

module.exports = OrderLink; 