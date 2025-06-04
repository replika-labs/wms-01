'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if table already exists
    const tableExists = await queryInterface.showAllTables().then(tables => 
      tables.includes('contact_notes')
    );

    if (!tableExists) {
      await queryInterface.createTable('contact_notes', {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        contactId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'contacts',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          comment: 'Reference to contact'
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
          comment: 'Reference to order (if note is order-related)'
        },
        purchaseLogId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'purchase_logs',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
          comment: 'Reference to purchase log (if note is purchase-related)'
        },
        noteType: {
          type: Sequelize.ENUM('general', 'order', 'purchase', 'performance', 'communication'),
          defaultValue: 'general',
          allowNull: false,
          comment: 'Type of note'
        },
        title: {
          type: Sequelize.STRING(255),
          allowNull: true,
          comment: 'Note title/subject'
        },
        note: {
          type: Sequelize.TEXT,
          allowNull: false,
          comment: 'Note content'
        },
        priority: {
          type: Sequelize.ENUM('low', 'medium', 'high', 'urgent'),
          defaultValue: 'medium',
          allowNull: false,
          comment: 'Note priority level'
        },
        isFollowUpRequired: {
          type: Sequelize.BOOLEAN,
          defaultValue: false,
          comment: 'Whether follow-up is required'
        },
        followUpDate: {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'Follow-up due date'
        },
        createdBy: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
          comment: 'User who created the note'
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        }
      });

      // Add indexes safely
      const indexesToAdd = [
        {
          fields: ['contactId'],
          options: { name: 'idx_contact_notes_contact' }
        },
        {
          fields: ['orderId'],
          options: { name: 'idx_contact_notes_order' }
        },
        {
          fields: ['purchaseLogId'],
          options: { name: 'idx_contact_notes_purchase' }
        },
        {
          fields: ['noteType'],
          options: { name: 'idx_contact_notes_type' }
        },
        {
          fields: ['createdBy'],
          options: { name: 'idx_contact_notes_creator' }
        },
        {
          fields: ['followUpDate'],
          options: { name: 'idx_contact_notes_followup' }
        }
      ];

      for (const indexConfig of indexesToAdd) {
        try {
          await queryInterface.addIndex('contact_notes', indexConfig.fields, indexConfig.options);
        } catch (error) {
          if (!error.message.includes('Duplicate key name')) {
            throw error;
          }
          console.log(`Index ${indexConfig.options.name} already exists, skipping...`);
        }
      }
    } else {
      console.log('Table contact_notes already exists, skipping creation...');
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tableExists = await queryInterface.showAllTables().then(tables => 
      tables.includes('contact_notes')
    );

    if (tableExists) {
      // Try to remove indexes safely
      const indexesToRemove = [
        'idx_contact_notes_followup',
        'idx_contact_notes_creator',
        'idx_contact_notes_type',
        'idx_contact_notes_purchase',
        'idx_contact_notes_order',
        'idx_contact_notes_contact'
      ];
      
      for (const indexName of indexesToRemove) {
        try {
          await queryInterface.removeIndex('contact_notes', indexName);
        } catch (error) {
          console.log(`Index ${indexName} might not exist, continuing...`);
        }
      }
      
      await queryInterface.dropTable('contact_notes');
    }
  }
}; 