'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // First, drop the foreign key constraint for materialNewId
      await queryInterface.removeConstraint('products', 'fk_products_material_new', { transaction });
      console.log('✅ Removed foreign key constraint: fk_products_material_new');
      
      // Remove the materialNewId column
      await queryInterface.removeColumn('products', 'materialNewId', { transaction });
      console.log('✅ Removed materialNewId column from products table');
      
      // Ensure materialId has proper foreign key to materials table
      try {
        await queryInterface.addConstraint('products', {
          fields: ['materialId'],
          type: 'foreign key',
          name: 'fk_products_material',
          references: {
            table: 'materials',
            field: 'id'
          },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
          transaction
        });
        console.log('✅ Added/ensured foreign key constraint: products.materialId → materials.id');
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log('ℹ️  Foreign key constraint for materialId already exists');
        } else {
          throw error;
        }
      }
      
      await transaction.commit();
      console.log('🎉 Migration completed successfully!');
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Migration failed:', error.message);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Add back materialNewId column
      await queryInterface.addColumn('products', 'materialNewId', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'materials_new',
          key: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      }, { transaction });
      console.log('✅ Restored materialNewId column');
      
      // Add back the foreign key constraint
      await queryInterface.addConstraint('products', {
        fields: ['materialNewId'],
        type: 'foreign key',
        name: 'fk_products_material_new',
        references: {
          table: 'materials_new',
          field: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
        transaction
      });
      console.log('✅ Restored foreign key constraint: fk_products_material_new');
      
      await transaction.commit();
      console.log('🎉 Rollback completed successfully!');
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Rollback failed:', error.message);
      throw error;
    }
  }
}; 