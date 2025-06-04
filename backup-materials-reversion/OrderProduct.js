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
}, {
  tableName: 'order_products',
  timestamps: true,
});

module.exports = OrderProduct; 