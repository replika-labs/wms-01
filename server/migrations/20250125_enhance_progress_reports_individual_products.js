'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('📋 Enhancing progress_reports table for individual product tracking...');
    
    // Add new fields for individual product progress tracking
    await queryInterface.addColumn('progress_reports', 'productId', {
      type: Sequelize.INTEGER,
      allowNull: true, // Make nullable for backward compatibility
      references: {
        model: 'products',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Reference to specific product for individual tracking'
    });

    await queryInterface.addColumn('progress_reports', 'orderProductId', {
      type: Sequelize.INTEGER,
      allowNull: true, // Make nullable for backward compatibility
      references: {
        model: 'order_products',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Reference to order-product relationship for individual tracking'
    });

    // Add new field to distinguish between individual and aggregated reports
    await queryInterface.addColumn('progress_reports', 'reportType', {
      type: Sequelize.ENUM('aggregated', 'individual'),
      defaultValue: 'aggregated',
      allowNull: false,
      comment: 'Type of progress report: aggregated (legacy) or individual (per-product)'
    });

    // Add performance indexes
    await queryInterface.addIndex('progress_reports', {
      fields: ['productId'],
      name: 'idx_progress_product'
    });

    await queryInterface.addIndex('progress_reports', {
      fields: ['orderProductId'],
      name: 'idx_progress_order_product'
    });

    await queryInterface.addIndex('progress_reports', {
      fields: ['reportType'],
      name: 'idx_progress_report_type'
    });

    await queryInterface.addIndex('progress_reports', {
      fields: ['orderId', 'productId'],
      name: 'idx_progress_order_product_combined'
    });

    console.log('✅ Enhanced progress_reports table with individual product tracking fields');
  },

  async down(queryInterface, Sequelize) {
    console.log('📋 Reverting progress_reports table enhancement...');
    
    // Remove indexes
    await queryInterface.removeIndex('progress_reports', 'idx_progress_product');
    await queryInterface.removeIndex('progress_reports', 'idx_progress_order_product');
    await queryInterface.removeIndex('progress_reports', 'idx_progress_report_type');
    await queryInterface.removeIndex('progress_reports', 'idx_progress_order_product_combined');
    
    // Remove columns
    await queryInterface.removeColumn('progress_reports', 'productId');
    await queryInterface.removeColumn('progress_reports', 'orderProductId');
    await queryInterface.removeColumn('progress_reports', 'reportType');
    
    console.log('✅ Reverted progress_reports table to original structure');
  }
}; 