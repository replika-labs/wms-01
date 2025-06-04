const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const ProductPhoto = sequelize.define('ProductPhoto', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
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
  photoUrl: {
    type: DataTypes.STRING(500),
    allowNull: false,
    comment: 'URL/path to the main photo'
  },
  thumbnailUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'URL/path to the thumbnail version'
  },
  isMainPhoto: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether this is the main display photo for the product'
  },
  sortOrder: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Order for displaying photos (0 = first)'
  },
  originalFileName: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Original filename when uploaded'
  },
  fileSize: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'File size in bytes'
  },
  mimeType: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'MIME type of the file (image/jpeg, image/png, etc.)'
  },
  uploadedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    comment: 'When the photo was uploaded'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Whether the photo is active/visible'
  }
}, {
  tableName: 'product_photos',
  timestamps: true,
  indexes: [
    {
      fields: ['productId', 'isMainPhoto'],
      name: 'idx_product_main'
    },
    {
      fields: ['productId', 'sortOrder'],
      name: 'idx_product_sort'
    },
    {
      fields: ['productId', 'isActive'],
      name: 'idx_product_active'
    }
  ]
});

module.exports = ProductPhoto; 