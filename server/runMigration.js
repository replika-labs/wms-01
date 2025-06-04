const { sequelize } = require('./config/database');

async function runMigration() {
  try {
    console.log('Running migration to make OrderLink userId nullable...');
    
    const queryInterface = sequelize.getQueryInterface();
    
    await queryInterface.changeColumn('order_links', 'userId', {
      type: sequelize.constructor.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
    
    console.log('✅ Migration completed successfully!');
    console.log('OrderLink userId is now nullable');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

runMigration(); 