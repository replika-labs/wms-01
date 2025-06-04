const { sequelize } = require('./config/database');
const Contact = require('./models/Contact');
const ContactNote = require('./models/ContactNote');

(async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connected successfully.');
    
    // Create tables
    await Contact.sync({ force: false });
    console.log('Contact table created/updated successfully.');
    
    await ContactNote.sync({ force: false });
    console.log('ContactNote table created/updated successfully.');
    
    // Check table structure
    const contactTableInfo = await sequelize.query('DESCRIBE contacts');
    console.log('Contact table structure:');
    contactTableInfo[0].forEach(col => {
      console.log(`  ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    const contactNoteTableInfo = await sequelize.query('DESCRIBE contact_notes');
    console.log('ContactNote table structure:');
    contactNoteTableInfo[0].forEach(col => {
      console.log(`  ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    console.log('Contact Management system tables created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})(); 