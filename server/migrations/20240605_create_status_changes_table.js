'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if table already exists
    const tableExists = await queryInterface.showAllTables().then(tables => 
      tables.includes('status_changes')
    );

    if (!tableExists) {
      await queryInterface.createTable('status_changes', {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true
        },
        orderId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'orders',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        oldStatus: {
          type: Sequelize.STRING,
          allowNull: false
        },
        newStatus: {
          type: Sequelize.STRING,
          allowNull: false
        },
        changedBy: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        note: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false
        }
      });

      // Check and add indexes safely
      try {
        await queryInterface.addIndex('status_changes', ['orderId'], {
          name: 'status_changes_order_id'
        });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index status_changes_order_id already exists, skipping...');
      }

      try {
        await queryInterface.addIndex('status_changes', ['changedBy'], {
          name: 'status_changes_changed_by'
        });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
        console.log('Index status_changes_changed_by already exists, skipping...');
      }
    } else {
      console.log('Table status_changes already exists, skipping creation...');
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tableExists = await queryInterface.showAllTables().then(tables => 
      tables.includes('status_changes')
    );

    if (tableExists) {
      await queryInterface.dropTable('status_changes');
    }
  }
}; 