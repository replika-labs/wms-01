'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('product_progress_photos', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      productProgressReportId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'product_progress_reports',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Reference to the specific product progress report'
      },
      photoUrl: {
        type: Sequelize.STRING(500),
        allowNull: false,
        comment: 'URL/path to the progress photo'
      },
      thumbnailUrl: {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: 'URL/path to the thumbnail version'
      },
      photoCaption: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Caption or description for the photo'
      },
      photoType: {
        type: Sequelize.ENUM('progress', 'quality', 'issue', 'completion', 'before', 'after'),
        allowNull: false,
        defaultValue: 'progress',
        comment: 'Type/category of the progress photo'
      },
      sortOrder: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Order for displaying photos (0 = first)'
      },
      originalFileName: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Original filename when uploaded'
      },
      fileSize: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'File size in bytes'
      },
      mimeType: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'MIME type of the file (image/jpeg, image/png, etc.)'
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether the photo is active/visible'
      },
      uploadedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        comment: 'When the photo was uploaded'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Add indexes for performance
    await queryInterface.addIndex('product_progress_photos', {
      fields: ['productProgressReportId', 'sortOrder'],
      name: 'idx_product_progress_photos_sort'
    });

    await queryInterface.addIndex('product_progress_photos', {
      fields: ['productProgressReportId', 'photoType'],
      name: 'idx_product_progress_photos_type'
    });

    await queryInterface.addIndex('product_progress_photos', {
      fields: ['productProgressReportId', 'isActive'],
      name: 'idx_product_progress_photos_active'
    });

    await queryInterface.addIndex('product_progress_photos', {
      fields: ['uploadedAt'],
      name: 'idx_product_progress_photos_upload_date'
    });

    console.log('✅ Created product_progress_photos table with indexes');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('product_progress_photos');
    console.log('✅ Dropped product_progress_photos table');
  }
}; 