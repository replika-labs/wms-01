'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('📋 Creating enhanced material_movements table with purchase integration...');
    
    // Create material_movements table with enhanced fields
    await queryInterface.createTable('material_movements', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      
      // Existing core fields
      materialId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'materials',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Reference to material being moved'
      },
      
      orderId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'orders',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Reference to related order (optional)'
      },
      
      userId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'User who initiated the movement'
      },
      
      qty: {
        type: Sequelize.DOUBLE,
        allowNull: false,
        comment: 'Quantity moved'
      },
      
      movementType: {
        type: Sequelize.ENUM('MASUK', 'KELUAR'),
        allowNull: false,
        comment: 'Direction of movement: MASUK (in) or KELUAR (out)'
      },
      
      description: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Movement description'
      },
      
      // NEW FIELDS for purchase integration
      purchaseLogId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'purchase_logs',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Reference to purchase that generated this movement'
      },
      
      movementSource: {
        type: Sequelize.ENUM('manual', 'purchase', 'order', 'adjustment'),
        defaultValue: 'manual',
        allowNull: false,
        comment: 'Source of the movement'
      },
      
      referenceNumber: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Reference number (purchase order, delivery note, etc.)'
      },
      
      unitPrice: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Unit price for inventory valuation'
      },
      
      totalValue: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Total value of movement (qty * unitPrice)'
      },
      
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Additional movement notes'
      },
      
      // Timestamps
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });
    
    console.log('📊 Adding performance indexes...');
    
    // Add indexes for performance
    await queryInterface.addIndex('material_movements', ['materialId'], {
      name: 'idx_movement_material'
    });
    
    await queryInterface.addIndex('material_movements', ['purchaseLogId'], {
      name: 'idx_movement_purchase'
    });
    
    await queryInterface.addIndex('material_movements', ['movementType'], {
      name: 'idx_movement_type'
    });
    
    await queryInterface.addIndex('material_movements', ['movementSource'], {
      name: 'idx_movement_source'
    });
    
    await queryInterface.addIndex('material_movements', ['createdAt'], {
      name: 'idx_movement_date'
    });
    
    await queryInterface.addIndex('material_movements', ['orderId'], {
      name: 'idx_movement_order'
    });
    
    await queryInterface.addIndex('material_movements', ['userId'], {
      name: 'idx_movement_user'
    });
    
    console.log('✅ Enhanced material_movements table created successfully with purchase integration');
  },

  async down(queryInterface, Sequelize) {
    console.log('🗑️ Dropping material_movements table...');
    await queryInterface.dropTable('material_movements');
    console.log('✅ material_movements table dropped successfully');
  }
}; 