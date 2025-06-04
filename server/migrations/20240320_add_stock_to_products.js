'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('products', 'qtyOnHand', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      allowNull: false
    });

    await queryInterface.addColumn('products', 'unit', {
      type: Sequelize.STRING,
      defaultValue: 'pcs',
      allowNull: false
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('products', 'qtyOnHand');
    await queryInterface.removeColumn('products', 'unit');
  }
}; 