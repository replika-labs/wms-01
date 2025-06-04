const { sequelize } = require('./config/database');

async function addNeedMaterialStatus() {
  try {
    console.log('Adding "need material" status to orders table...');
    
    // Check current status enum values
    const [currentEnum] = await sequelize.query(`
      SHOW COLUMNS FROM orders LIKE 'status'
    `);
    
    console.log('Current status enum:', currentEnum[0].Type);
    
    // Add 'need material' to the enum if not already present
    const enumValues = currentEnum[0].Type;
    if (!enumValues.includes('need material')) {
      await sequelize.query(`
        ALTER TABLE orders 
        MODIFY COLUMN status ENUM(
          'created',
          'need material',
          'confirmed',
          'processing',
          'completed',
          'shipped',
          'delivered',
          'cancelled'
        ) DEFAULT 'created' NOT NULL
      `);
      
      console.log('✅ Successfully added "need material" status to orders table');
    } else {
      console.log('✅ "need material" status already exists in orders table');
    }
    
    // Verify the change
    const [updatedEnum] = await sequelize.query(`
      SHOW COLUMNS FROM orders LIKE 'status'
    `);
    
    console.log('Updated status enum:', updatedEnum[0].Type);
    
  } catch (error) {
    console.error('❌ Error adding "need material" status:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run if called directly
if (require.main === module) {
  addNeedMaterialStatus()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = addNeedMaterialStatus; 