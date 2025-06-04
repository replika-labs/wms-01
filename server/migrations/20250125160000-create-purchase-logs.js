const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('purchase_logs', {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      purchasedDate: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: 'Date when material was purchased'
      },
      materialId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'materials',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Reference to material being purchased'
      },
      stock: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Quantity of material purchased'
      },
      unit: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'pcs',
        comment: 'Unit of measurement'
      },
      supplier: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Supplier name'
      },
      price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Price per unit'
      },
      totalAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Total purchase amount (calculated: stock * price)'
      },
      status: {
        type: DataTypes.ENUM('lunas', 'dp', 'dibayar', 'dikirim', 'diterima'),
        defaultValue: 'dp',
        allowNull: false,
        comment: 'Purchase status workflow'
      },
      paymentMethod: {
        type: DataTypes.ENUM('transfer', 'cod'),
        defaultValue: 'transfer',
        allowNull: false,
        comment: 'Payment method used'
      },
      picName: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Person in charge of purchase'
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Additional notes about purchase'
      },
      invoiceNumber: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Invoice or receipt number'
      },
      deliveryDate: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Expected or actual delivery date'
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    });

    // Add indexes for performance optimization
    await queryInterface.addIndex('purchase_logs', ['materialId'], {
      name: 'idx_purchase_material'
    });
    
    await queryInterface.addIndex('purchase_logs', ['purchasedDate'], {
      name: 'idx_purchase_date'
    });
    
    await queryInterface.addIndex('purchase_logs', ['status'], {
      name: 'idx_purchase_status'
    });
    
    await queryInterface.addIndex('purchase_logs', ['supplier'], {
      name: 'idx_purchase_supplier'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('purchase_logs');
  }
}; 