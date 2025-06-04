const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  materialId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'materials',
      key: 'id'
    },
    comment: 'Reference to base material used for this product'
  },
  category: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Product category (e.g., Hijab, Dress, Pants)'
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Base price for this product'
  },
  qtyOnHand: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  unit: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'pcs',
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  defaultTarget: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'products',
  timestamps: true,
});

module.exports = Product; 