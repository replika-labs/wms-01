const sequelize = require('./db');

async function runTailorMigration() {
  try {
    console.log('Running migration to add tailorId to orders table...');
    
    const queryInterface = sequelize.getQueryInterface();
    
    // Check if column already exists
    const tableDescription = await queryInterface.describeTable('orders');
    if (tableDescription.tailorId) {
      console.log('⚠️ tailorId column already exists in orders table');
      return;
    }
    
    // Add tailorId column
    await queryInterface.addColumn('orders', 'tailorId', {
      type: sequelize.constructor.INTEGER,
      allowNull: true, // Allow null for existing orders
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL' // If tailor is deleted, set tailorId to null instead of deleting order
    });

    // Add index for better query performance
    await queryInterface.addIndex('orders', ['tailorId'], {
      name: 'idx_orders_tailor_id'
    });
    
    console.log('✅ Migration completed successfully!');
    console.log('tailorId column added to orders table with foreign key constraint');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('Error details:', error.message);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

runTailorMigration(); 