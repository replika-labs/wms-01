const { sequelize } = require('./config/database');
const Contact = require('./models/Contact');

(async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected successfully.');
    
    // Check contacts count
    const contactsCount = await Contact.count();
    console.log(`📊 Total contacts in database: ${contactsCount}`);
    
    if (contactsCount > 0) {
      // Get contacts by type
      const suppliers = await Contact.count({ where: { type: 'supplier' } });
      const tailors = await Contact.count({ where: { type: 'tailor' } });
      const internal = await Contact.count({ where: { type: 'internal' } });
      
      console.log(`   - Suppliers: ${suppliers}`);
      console.log(`   - Tailors: ${tailors}`);
      console.log(`   - Internal: ${internal}`);
      
      // Show first 5 contacts
      console.log('\n📋 Sample contacts:');
      const sampleContacts = await Contact.findAll({ limit: 5 });
      sampleContacts.forEach(contact => {
        console.log(`   - ${contact.name} (${contact.type}) - Active: ${contact.isActive}`);
      });
    } else {
      console.log('❌ No contacts found in database!');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})(); 