const { sequelize } = require('./config/database');

async function runOrderProductMigration() {
  try {
    console.log('🔄 Running OrderProduct completion tracking migration...');
    
    // Add completion tracking fields to OrderProduct table
    await sequelize.query(`
      ALTER TABLE order_products 
      ADD COLUMN completedQty INT NOT NULL DEFAULT 0 COMMENT 'Total pieces completed for this specific product in the order',
      ADD COLUMN isCompleted BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Whether this specific product in the order is completed',
      ADD COLUMN completionDate DATETIME NULL COMMENT 'Date when this product was marked as completed'
    `);
    console.log('✅ Added per-product completion tracking fields');

    // Add indexes for performance
    await sequelize.query('CREATE INDEX idx_orderproduct_completion_status ON order_products(isCompleted)');
    await sequelize.query('CREATE INDEX idx_orderproduct_order_completion ON order_products(orderId, isCompleted)');
    await sequelize.query('CREATE INDEX idx_orderproduct_completion_date ON order_products(completionDate)');
    console.log('✅ Added performance indexes');

    // Mark migration as completed in SequelizeMeta
    await sequelize.query('INSERT IGNORE INTO SequelizeMeta (name) VALUES ("20250125_add_orderproduct_completion_tracking.js")');
    console.log('✅ Marked migration as completed in SequelizeMeta');
    
    console.log('🎉 OrderProduct completion tracking migration completed successfully!');
    console.log('📊 Database now supports:');
    console.log('   - Per-product completion tracking (completedQty, isCompleted, completionDate)');
    console.log('   - Performance indexes for completion queries');
    console.log('   - Individual product completion status');
    
  } catch (error) {
    if (error.message.includes('Duplicate column name')) {
      console.log('⚠️  Migration already applied - columns already exist');
      console.log('✅ OrderProduct completion tracking is ready!');
    } else {
      console.error('❌ Error running OrderProduct migration:', error.message);
      console.error(error);
    }
  } finally {
    await sequelize.close();
  }
}

runOrderProductMigration(); 