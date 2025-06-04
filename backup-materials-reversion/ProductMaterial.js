const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const ProductMaterial = sequelize.define('ProductMaterial', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  productId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  materialId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  qtyNeeded: {
    type: DataTypes.DOUBLE,
    allowNull: false,
    defaultValue: 0,
  },
}, {
  tableName: 'product_materials',
  timestamps: true,
});

module.exports = ProductMaterial; 