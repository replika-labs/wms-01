const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const ProductVariation = sequelize.define('ProductVariation', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Variation code (e.g., S, M, L, XL)'
  },
  size: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Size or variation name (e.g., Small, Medium, Large, Extra Large)'
  },
  additionalPrice: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    comment: 'Additional price for this variation (can be negative for discount)'
  },
  productId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'products',
      key: 'id'
    },
    onDelete: 'CASCADE',
    comment: 'Reference to the parent product'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  }
}, {
  tableName: 'product_variations',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['productId', 'code'],
      name: 'unique_product_variation_code'
    }
  ]
});

module.exports = ProductVariation; 