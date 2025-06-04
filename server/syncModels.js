const sequelize = require('./db');
const models = require('./models');

(async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established.');
    await sequelize.sync({ alter: true });
    console.log('All models were synchronized successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    process.exit(1);
  }
})(); 