const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add missing critical fields to materials_new table
    await queryInterface.addColumn('materials_new', 'code', {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true,
      comment: 'Auto-generated material code for identification'
    });

    await queryInterface.addColumn('materials_new', 'qtyOnHand', {
      type: DataTypes.DOUBLE,
      allowNull: false,
      defaultValue: 0,
      comment: 'Current stock quantity'
    });

    await queryInterface.addColumn('materials_new', 'safetyStock', {
      type: DataTypes.DOUBLE,
      allowNull: false,
      defaultValue: 0,
      comment: 'Safety stock level for reorder alerts'
    });

    await queryInterface.addColumn('materials_new', 'price', {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Material price per unit'
    });

    // Add additional fields for compatibility
    await queryInterface.addColumn('materials_new', 'fabricTypeColor', {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Combined fabric type and color for lookup (e.g., SILK-ROSE GOLD)'
    });

    await queryInterface.addColumn('materials_new', 'purchaseDate', {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Last purchase date for code generation'
    });

    await queryInterface.addColumn('materials_new', 'numberOfRolls', {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 1,
      comment: 'Number of rolls/pieces'
    });

    await queryInterface.addColumn('materials_new', 'totalUnits', {
      type: DataTypes.DOUBLE,
      allowNull: true,
      comment: 'Total units purchased'
    });

    await queryInterface.addColumn('materials_new', 'store', {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Store/supplier name'
    });

    // Add indexes for performance
    await queryInterface.addIndex('materials_new', ['code'], {
      name: 'idx_materials_new_code',
      unique: true
    });

    await queryInterface.addIndex('materials_new', ['name', 'color'], {
      name: 'idx_materials_new_name_color'
    });

    await queryInterface.addIndex('materials_new', ['qtyOnHand'], {
      name: 'idx_materials_new_stock'
    });

    console.log('Enhanced materials_new table with critical fields');
  },

  down: async (queryInterface, Sequelize) => {
    // Remove added columns
    await queryInterface.removeColumn('materials_new', 'code');
    await queryInterface.removeColumn('materials_new', 'qtyOnHand');
    await queryInterface.removeColumn('materials_new', 'safetyStock');
    await queryInterface.removeColumn('materials_new', 'price');
    await queryInterface.removeColumn('materials_new', 'fabricTypeColor');
    await queryInterface.removeColumn('materials_new', 'purchaseDate');
    await queryInterface.removeColumn('materials_new', 'numberOfRolls');
    await queryInterface.removeColumn('materials_new', 'totalUnits');
    await queryInterface.removeColumn('materials_new', 'store');

    // Remove indexes
    await queryInterface.removeIndex('materials_new', 'idx_materials_new_code');
    await queryInterface.removeIndex('materials_new', 'idx_materials_new_name_color');
    await queryInterface.removeIndex('materials_new', 'idx_materials_new_stock');

    console.log('Reverted materials_new table enhancements');
  }
}; 