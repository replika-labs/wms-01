'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if table already exists
    const tableExists = await queryInterface.showAllTables().then(tables => 
      tables.includes('product_photos')
    );

    if (!tableExists) {
      await queryInterface.createTable('product_photos', {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false
        },
        productId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'products',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        photoUrl: {
          type: Sequelize.STRING(500),
          allowNull: false,
          comment: 'URL/path to the main photo'
        },
        thumbnailUrl: {
          type: Sequelize.STRING(500),
          allowNull: true,
          comment: 'URL/path to the thumbnail version'
        },
        isMainPhoto: {
          type: Sequelize.BOOLEAN,
          defaultValue: false,
          allowNull: false,
          comment: 'Whether this is the main display photo for the product'
        },
        sortOrder: {
          type: Sequelize.INTEGER,
          defaultValue: 0,
          allowNull: false,
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
          comment: 'MIME type of the file'
        },
        uploadedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW,
          comment: 'When the photo was uploaded'
        },
        isActive: {
          type: Sequelize.BOOLEAN,
          defaultValue: true,
          allowNull: false,
          comment: 'Whether the photo is active/visible'
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

      // Add indexes safely
      const indexesToAdd = [
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
      ];

      for (const indexConfig of indexesToAdd) {
        try {
          await queryInterface.addIndex('product_photos', indexConfig);
        } catch (error) {
          if (!error.message.includes('Duplicate key name')) {
            throw error;
          }
          console.log(`Index ${indexConfig.name} already exists, skipping...`);
        }
      }
    } else {
      console.log('Table product_photos already exists, skipping creation...');
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tableExists = await queryInterface.showAllTables().then(tables => 
      tables.includes('product_photos')
    );

    if (tableExists) {
      await queryInterface.dropTable('product_photos');
    }
  }
}; 