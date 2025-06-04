const { Sequelize } = require('sequelize');
require('dotenv').config();

const config = {
  database: process.env.DB_NAME || 'wms_db',
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  host: process.env.DB_HOST || 'localhost',
  dialect: 'mysql',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
};

console.log('Initializing database connection with config:', {
  database: config.database,
  username: config.username,
  host: config.host,
  dialect: config.dialect
});

const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  {
    host: config.host,
    dialect: config.dialect,
    logging: config.logging,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

// Test the connection
(async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
})();

module.exports = sequelize; 