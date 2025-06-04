const sequelize = require('./db');
const { DataTypes } = require('sequelize');

async function createMaterialPurchaseAlertTable() {
  try {
    console.log('Starting MaterialPurchaseAlert table creation...');

    // Create the table
    await sequelize.getQueryInterface().createTable('material_purchase_alerts', {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      
      // Core relationships  
      materialId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'materials',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Material that needs purchasing'
      },
      orderId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'orders',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Order that triggered the alert'
      },
      
      // Stock analysis data
      currentStock: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Stock level when alert was created'
      },
      safetyStock: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Safety stock threshold'
      },
      requiredStock: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Additional stock needed for order'
      },
      
      // Alert management
      status: {
        type: DataTypes.ENUM('pending', 'ordered', 'received', 'resolved'),
        defaultValue: 'pending',
        allowNull: false,
        comment: 'Current status of the purchase alert'
      },
      priority: {
        type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
        defaultValue: 'medium',
        allowNull: false,
        comment: 'Priority level based on stock shortage severity'
      },
      
      // Timeline tracking
      alertDate: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false,
        comment: 'When the alert was created'
      },
      orderDate: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When material was ordered from supplier'
      },
      expectedDate: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Expected delivery date from supplier'
      },
      resolvedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When alert was resolved (stock replenished)'
      },
      
      // Additional information
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Procurement notes, supplier communications, etc.'
      },
      supplierInfo: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Supplier contact information, quotations, etc.'
      },
      
      // Audit trail
      createdBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'User who created the order that triggered alert'
      },
      resolvedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'User who resolved the alert'
      },
      
      // Timestamps
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

    console.log('Table created successfully. Adding indexes...');

    // Add indexes for performance optimization
    await sequelize.getQueryInterface().addIndex('material_purchase_alerts', ['materialId', 'status'], {
      name: 'idx_material_status'
    });
    
    await sequelize.getQueryInterface().addIndex('material_purchase_alerts', ['orderId', 'alertDate'], {
      name: 'idx_order_alert'
    });
    
    await sequelize.getQueryInterface().addIndex('material_purchase_alerts', ['status', 'priority'], {
      name: 'idx_status_priority'
    });
    
    await sequelize.getQueryInterface().addIndex('material_purchase_alerts', ['alertDate'], {
      name: 'idx_alert_date'
    });
    
    await sequelize.getQueryInterface().addIndex('material_purchase_alerts', ['status'], {
      name: 'idx_status'
    });
    
    await sequelize.getQueryInterface().addIndex('material_purchase_alerts', ['priority'], {
      name: 'idx_priority'
    });

    console.log('✅ MaterialPurchaseAlert table and indexes created successfully!');
    
  } catch (error) {
    if (error.name === 'SequelizeDatabaseError' && error.message.includes('already exists')) {
      console.log('✅ MaterialPurchaseAlert table already exists - skipping creation');
    } else {
      console.error('❌ Error creating MaterialPurchaseAlert table:', error.message);
      throw error;
    }
  } finally {
    await sequelize.close();
  }
}

// Run the migration
createMaterialPurchaseAlertTable(); 