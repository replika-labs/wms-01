'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('orders', 'tailorContactId', {
      type: Sequelize.INTEGER,
      allowNull: true, // Allow null for existing orders
      references: {
        model: 'contacts',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL' // If tailor contact is deleted, set tailorContactId to null instead of deleting order
    });

    // Add index for better query performance
    await queryInterface.addIndex('orders', ['tailorContactId'], {
      name: 'idx_orders_tailor_contact_id'
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove index first
    await queryInterface.removeIndex('orders', 'idx_orders_tailor_contact_id');
    
    // Remove column
    await queryInterface.removeColumn('orders', 'tailorContactId');
  }
}; 