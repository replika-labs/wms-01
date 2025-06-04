const bcrypt = require('bcrypt');
const { User } = require('./models');
require('./config/database');

async function checkAndResetAdminPassword() {
  try {
    // Find the existing admin user
    const adminUser = await User.findOne({
      where: { role: 'admin' }
    });

    if (!adminUser) {
      console.log('No admin user found!');
      return;
    }

    console.log('Current admin user:');
    console.log(`- Email: ${adminUser.email}`);
    console.log(`- Name: ${adminUser.name}`);
    console.log(`- Active: ${adminUser.isActive}`);

    // Test the current password against common passwords
    const testPasswords = ['admin123', 'password', '123456', 'admin', 'password123'];
    
    for (const testPassword of testPasswords) {
      const isMatch = await bcrypt.compare(testPassword, adminUser.passwordHash);
      if (isMatch) {
        console.log(`✅ Current password is: ${testPassword}`);
        return;
      }
    }

    console.log('❌ Could not determine current password. Resetting to: admin123');
    
    // Reset password to admin123
    const newHashedPassword = await bcrypt.hash('admin123', 10);
    await adminUser.update({ passwordHash: newHashedPassword });
    
    console.log('✅ Password has been reset to: admin123');
    console.log('You can now login with:');
    console.log(`- Email: ${adminUser.email}`);
    console.log(`- Password: admin123`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
}

checkAndResetAdminPassword(); 