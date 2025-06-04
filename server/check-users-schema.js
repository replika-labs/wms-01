const { Sequelize } = require('sequelize');

// Database connection
const sequelize = new Sequelize('wms_db', 'root', '', {
  host: '127.0.0.1',
  dialect: 'mysql',
  logging: false
});

async function checkUsersSchema() {
  try {
    console.log('Checking users table schema...');
    
    // Test connection
    await sequelize.authenticate();
    console.log('Database connection established.');
    
    // Get table schema
    const [results] = await sequelize.query("DESCRIBE users");
    
    console.log('\n📋 Users Table Schema:');
    console.log('================================');
    results.forEach(column => {
      console.log(`- ${column.Field}: ${column.Type} ${column.Null === 'NO' ? '(Required)' : '(Optional)'}`);
    });
    
    // Check specifically for phone fields
    const phoneFields = results.filter(col => col.Field.toLowerCase().includes('phone'));
    console.log('\n📱 Phone-related Fields:');
    console.log('================================');
    if (phoneFields.length > 0) {
      phoneFields.forEach(field => {
        console.log(`✅ ${field.Field}: ${field.Type} ${field.Null === 'NO' ? '(Required)' : '(Optional)'}`);
      });
    } else {
      console.log('❌ No phone fields found');
    }
    
  } catch (error) {
    console.error('❌ Error checking schema:', error);
  } finally {
    await sequelize.close();
  }
}

checkUsersSchema(); 