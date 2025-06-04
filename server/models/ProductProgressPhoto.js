const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const ProductProgressPhoto = sequelize.define('ProductProgressPhoto', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  productProgressReportId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'product_progress_reports',
      key: 'id'
    },
    comment: 'Reference to the specific product progress report'
  },
  photoUrl: {
    type: DataTypes.STRING(500),
    allowNull: false,
    comment: 'URL/path to the progress photo'
  },
  thumbnailUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'URL/path to the thumbnail version'
  },
  photoCaption: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Caption or description for the photo'
  },
  photoType: {
    type: DataTypes.ENUM('progress', 'quality', 'issue', 'completion', 'before', 'after'),
    allowNull: false,
    defaultValue: 'progress',
    comment: 'Type/category of the progress photo'
  },
  sortOrder: {
    type: DataTypes.INTEGER,
    allowNull: false,
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
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Whether the photo is active/visible'
  },
  uploadedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'When the photo was uploaded'
  }
}, {
  tableName: 'product_progress_photos',
  timestamps: true,
  indexes: [
    {
      fields: ['productProgressReportId', 'sortOrder'],
      name: 'idx_product_progress_photos_sort'
    },
    {
      fields: ['productProgressReportId', 'photoType'],
      name: 'idx_product_progress_photos_type'
    },
    {
      fields: ['productProgressReportId', 'isActive'],
      name: 'idx_product_progress_photos_active'
    },
    {
      fields: ['uploadedAt'],
      name: 'idx_product_progress_photos_upload_date'
    }
  ]
});

// Instance methods
ProductProgressPhoto.prototype.getDisplayUrl = function() {
  return this.thumbnailUrl || this.photoUrl;
};

ProductProgressPhoto.prototype.getFormattedFileSize = function() {
  if (!this.fileSize) return 'Unknown';
  
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(this.fileSize) / Math.log(1024));
  return Math.round(this.fileSize / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
};

ProductProgressPhoto.prototype.isImage = function() {
  return this.mimeType && this.mimeType.startsWith('image/');
};

ProductProgressPhoto.prototype.getTypeIcon = function() {
  const icons = {
    progress: '📸',
    quality: '✅',
    issue: '⚠️',
    completion: '🎉',
    before: '📋',
    after: '✨'
  };
  return icons[this.photoType] || '📸';
};

ProductProgressPhoto.prototype.getTypeBadgeColor = function() {
  const colors = {
    progress: 'bg-blue-100 text-blue-800',
    quality: 'bg-green-100 text-green-800',
    issue: 'bg-red-100 text-red-800',
    completion: 'bg-purple-100 text-purple-800',
    before: 'bg-gray-100 text-gray-800',
    after: 'bg-yellow-100 text-yellow-800'
  };
  return colors[this.photoType] || 'bg-gray-100 text-gray-800';
};

// Static methods
ProductProgressPhoto.findByProgressReport = async function(productProgressReportId, options = {}) {
  return await this.findAll({
    where: { 
      productProgressReportId,
      isActive: true
    },
    order: [['sortOrder', 'ASC'], ['uploadedAt', 'ASC']],
    ...options
  });
};

ProductProgressPhoto.findByType = async function(productProgressReportId, photoType, options = {}) {
  return await this.findAll({
    where: { 
      productProgressReportId,
      photoType,
      isActive: true
    },
    order: [['sortOrder', 'ASC'], ['uploadedAt', 'ASC']],
    ...options
  });
};

ProductProgressPhoto.updateSortOrder = async function(photoId, newSortOrder, transaction = null) {
  const photo = await this.findByPk(photoId);
  if (!photo) throw new Error('Photo not found');
  
  const options = transaction ? { transaction } : {};
  
  // Get all photos in the same progress report
  const siblingPhotos = await this.findAll({
    where: { 
      productProgressReportId: photo.productProgressReportId,
      isActive: true,
      id: { [require('sequelize').Op.ne]: photoId }
    },
    order: [['sortOrder', 'ASC']],
    ...options
  });
  
  // Update sort orders
  let currentOrder = 0;
  for (const sibling of siblingPhotos) {
    if (currentOrder === newSortOrder) {
      currentOrder++; // Skip the position for the moved photo
    }
    if (sibling.sortOrder !== currentOrder) {
      await sibling.update({ sortOrder: currentOrder }, options);
    }
    currentOrder++;
  }
  
  // Update the moved photo
  await photo.update({ sortOrder: newSortOrder }, options);
  
  return photo;
};

ProductProgressPhoto.bulkUpload = async function(productProgressReportId, photoData, transaction = null) {
  const options = transaction ? { transaction } : {};
  
  // Get current max sort order
  const maxSortOrder = await this.max('sortOrder', {
    where: { productProgressReportId, isActive: true },
    ...options
  }) || -1;
  
  // Prepare photo records with incremental sort order
  const photoRecords = photoData.map((photo, index) => ({
    productProgressReportId,
    sortOrder: maxSortOrder + 1 + index,
    uploadedAt: new Date(),
    ...photo
  }));
  
  return await this.bulkCreate(photoRecords, options);
};

ProductProgressPhoto.getStatsByProgressReport = async function(productProgressReportId) {
  const photos = await this.findAll({
    where: { productProgressReportId, isActive: true },
    attributes: ['photoType', 'fileSize']
  });
  
  const stats = {
    total: photos.length,
    byType: {},
    totalSize: 0
  };
  
  photos.forEach(photo => {
    // Count by type
    stats.byType[photo.photoType] = (stats.byType[photo.photoType] || 0) + 1;
    
    // Sum file sizes
    stats.totalSize += photo.fileSize || 0;
  });
  
  return stats;
};

module.exports = ProductProgressPhoto; 