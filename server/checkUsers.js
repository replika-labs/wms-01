const { User } = require('./models');
const { sequelize } = require('./config/database');

async function checkUsers() {
    try {
        console.log('Checking users in database...');
        
        const users = await User.findAll({
            attributes: ['id', 'name', 'email', 'role', 'loginEnabled']
        });
        
        console.log(`Found ${users.length} users:`);
        users.forEach(user => {
            console.log(`- ID: ${user.id}, Name: ${user.name}, Email: ${user.email}, Role: ${user.role}, Login Enabled: ${user.loginEnabled}`);
        });
        
    } catch (error) {
        console.error('Error checking users:', error);
    } finally {
        await sequelize.close();
    }
}

checkUsers(); 