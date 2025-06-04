'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if table already exists
    const tableExists = await queryInterface.showAllTables().then(tables => 
      tables.includes('contacts')
    );

    if (!tableExists) {
      await queryInterface.createTable('contacts', {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        name: {
          type: Sequelize.STRING(255),
          allowNull: false,
          comment: 'Contact name'
        },
        type: {
          type: Sequelize.ENUM('supplier', 'tailor', 'internal'),
          allowNull: false,
          comment: 'Contact type - supplier, tailor, or internal'
        },
        email: {
          type: Sequelize.STRING(255),
          allowNull: true,
          comment: 'Email address'
        },
        phone: {
          type: Sequelize.STRING(50),
          allowNull: true,
          comment: 'Phone number'
        },
        whatsappPhone: {
          type: Sequelize.STRING(50),
          allowNull: true,
          comment: 'WhatsApp phone number'
        },
        address: {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: 'Physical address'
        },
        company: {
          type: Sequelize.STRING(255),
          allowNull: true,
          comment: 'Company name'
        },
        position: {
          type: Sequelize.STRING(255),
          allowNull: true,
          comment: 'Position/role in company'
        },
        notes: {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: 'General notes about contact'
        },
        isActive: {
          type: Sequelize.BOOLEAN,
          defaultValue: true,
          comment: 'Active status'
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
          fields: ['type'],
          options: { name: 'idx_contacts_type' }
        },
        {
          fields: ['name'],
          options: { name: 'idx_contacts_name' }
        },
        {
          fields: ['isActive'],
          options: { name: 'idx_contacts_active' }
        }
      ];

      for (const indexConfig of indexesToAdd) {
        try {
          await queryInterface.addIndex('contacts', indexConfig.fields, indexConfig.options);
        } catch (error) {
          if (!error.message.includes('Duplicate key name')) {
            throw error;
          }
          console.log(`Index ${indexConfig.options.name} already exists, skipping...`);
        }
      }
    } else {
      console.log('Table contacts already exists, skipping creation...');
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tableExists = await queryInterface.showAllTables().then(tables => 
      tables.includes('contacts')
    );

    if (tableExists) {
      // Try to remove indexes safely
      const indexesToRemove = ['idx_contacts_active', 'idx_contacts_name', 'idx_contacts_type'];
      
      for (const indexName of indexesToRemove) {
        try {
          await queryInterface.removeIndex('contacts', indexName);
        } catch (error) {
          console.log(`Index ${indexName} might not exist, continuing...`);
        }
      }
      
      await queryInterface.dropTable('contacts');
    }
  }
}; 