'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('product_progress_reports', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      progressReportId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'progress_reports',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Reference to the overall progress report'
      },
      productId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'products',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Reference to the specific product'
      },
      orderProductId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'order_products',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Reference to the order-product relationship'
      },
      pcsFinished: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Number of pieces completed for this product in this report'
      },
      pcsTargetForThisReport: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Target pieces for this product in this specific report'
      },
      fabricUsed: {
        type: Sequelize.DECIMAL(10, 3),
        allowNull: true,
        defaultValue: 0,
        comment: 'Amount of fabric used for this product in this report'
      },
      qualityNotes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Quality assessment notes for this product'
      },
      challenges: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Any challenges faced during production of this product'
      },
      estimatedCompletion: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Estimated completion date for this product'
      },
      workHours: {
        type: Sequelize.DECIMAL(4, 2),
        allowNull: true,
        defaultValue: 0,
        comment: 'Hours spent working on this product in this report'
      },
      qualityScore: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 100,
        comment: 'Quality score percentage (0-100) for this product progress'
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
    await queryInterface.addIndex('product_progress_reports', {
      fields: ['progressReportId', 'productId'],
      name: 'idx_progress_product'
    });

    await queryInterface.addIndex('product_progress_reports', {
      fields: ['orderProductId'],
      name: 'idx_order_product_progress'
    });

    await queryInterface.addIndex('product_progress_reports', {
      fields: ['productId', 'createdAt'],
      name: 'idx_product_timeline'
    });

    console.log('✅ Created product_progress_reports table with indexes');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('product_progress_reports');
    console.log('✅ Dropped product_progress_reports table');
  }
}; 