const bcrypt = require('bcrypt');
const { User } = require('./models');
require('./config/database');

async function createAdmin() {
  try {
    // Check if admin user exists
    const existingAdmin = await User.findOne({
      where: { role: 'admin' }
    });

    if (existingAdmin) {
      console.log('Admin user already exists:');
      console.log(`- Email: ${existingAdmin.email}`);
      console.log(`- Name: ${existingAdmin.name}`);
      console.log(`- Active: ${existingAdmin.isActive}`);
      return;
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@example.com',
      phone: '081234567890',
      passwordHash: hashedPassword,
      role: 'admin',
      isActive: true,
      loginEnabled: true
    });

    console.log('Admin user created successfully:');
    console.log(`- Email: ${adminUser.email}`);
    console.log(`- Password: admin123`);
    console.log(`- Name: ${adminUser.name}`);
    console.log('You can now login with these credentials!');

  } catch (error) {
    console.error('Error creating admin user:', error.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

createAdmin(); 