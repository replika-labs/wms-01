const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const ProductColour = sequelize.define('ProductColour', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Color code (e.g., RD, BL, GR)'
  },
  colourName: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Color name (e.g., Red, Blue, Green)'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Additional notes about this color variant'
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
  tableName: 'product_colours',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['productId', 'code'],
      name: 'unique_product_colour_code'
    }
  ]
});

module.exports = ProductColour; 