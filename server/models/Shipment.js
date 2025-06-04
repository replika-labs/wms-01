const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Shipment = sequelize.define('Shipment', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  orderId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  trackingNumber: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  courier: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  deliveryDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'shipments',
  timestamps: true,
});

module.exports = Shipment; 