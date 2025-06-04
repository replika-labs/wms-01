'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('orders', 'tailorId', {
      type: Sequelize.INTEGER,
      allowNull: true, // Allow null for existing orders
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL' // If tailor is deleted, set tailorId to null instead of deleting order
    });

    // Add index for better query performance
    await queryInterface.addIndex('orders', ['tailorId'], {
      name: 'idx_orders_tailor_id'
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove index first
    await queryInterface.removeIndex('orders', 'idx_orders_tailor_id');
    
    // Remove column
    await queryInterface.removeColumn('orders', 'tailorId');
  }
}; 