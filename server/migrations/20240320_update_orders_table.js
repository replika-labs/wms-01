'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Ubah tipe kolom yang ada
    await queryInterface.changeColumn('orders', 'customerNote', {
      type: Sequelize.TEXT,
      allowNull: true
    });
    await queryInterface.changeColumn('orders', 'description', {
      type: Sequelize.TEXT,
      allowNull: true
    });

    // Update enum status
    await queryInterface.changeColumn('orders', 'status', {
      type: Sequelize.ENUM(
        'created',
        'confirmed',
        'processing',
        'completed',
        'shipped',
        'delivered',
        'cancelled'
      ),
      defaultValue: 'created',
      allowNull: false
    });

    // Tambah kolom baru
    await queryInterface.addColumn('orders', 'completedPcs', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      allowNull: false
    });

    await queryInterface.addColumn('orders', 'priority', {
      type: Sequelize.ENUM('low', 'medium', 'high', 'urgent'),
      defaultValue: 'medium',
      allowNull: false
    });

    await queryInterface.addColumn('orders', 'isActive', {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      allowNull: false
    });

    // Tambah indexes
    await queryInterface.addIndex('orders', ['status']);
    await queryInterface.addIndex('orders', ['dueDate']);
    await queryInterface.addIndex('orders', ['userId']);
  },

  down: async (queryInterface, Sequelize) => {
    // Hapus indexes
    await queryInterface.removeIndex('orders', ['status']);
    await queryInterface.removeIndex('orders', ['dueDate']);
    await queryInterface.removeIndex('orders', ['userId']);

    // Hapus kolom baru
    await queryInterface.removeColumn('orders', 'completedPcs');
    await queryInterface.removeColumn('orders', 'priority');
    await queryInterface.removeColumn('orders', 'isActive');

    // Kembalikan enum status
    await queryInterface.changeColumn('orders', 'status', {
      type: Sequelize.ENUM('created', 'delivery', 'processing', 'done', 'cancelled'),
      defaultValue: 'created'
    });

    // Kembalikan tipe kolom
    await queryInterface.changeColumn('orders', 'customerNote', {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.changeColumn('orders', 'description', {
      type: Sequelize.STRING,
      allowNull: true
    });
  }
}; 