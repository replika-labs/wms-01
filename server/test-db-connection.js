const { Sequelize } = require('sequelize');

console.log('Testing database connection...');

const sequelize = new Sequelize('wms_db', 'root', '', {
  host: 'localhost',
  port: 3306,
  dialect: 'mysql',
  logging: console.log
});

async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('✅ SUCCESS: Database connection established successfully.');
    
    // Test query
    const [results] = await sequelize.query('SELECT VERSION() as version');
    console.log('✅ MySQL version:', results[0].version);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ ERROR: Unable to connect to the database');
    console.error('Error details:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

testConnection(); 