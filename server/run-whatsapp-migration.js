const { Sequelize } = require('sequelize');
const migration = require('./migrations/20250524143737-add-whatsapp-phone-to-users.js');

// Database connection
const sequelize = new Sequelize('wms_db', 'root', '', {
  host: '127.0.0.1',
  dialect: 'mysql',
  logging: console.log
});

async function runMigration() {
  try {
    console.log('Starting WhatsApp phone migration...');
    
    // Test connection
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    // Run migration
    await migration.up(sequelize.getQueryInterface(), Sequelize);
    console.log('✅ WhatsApp phone migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await sequelize.close();
  }
}

runMigration(); 