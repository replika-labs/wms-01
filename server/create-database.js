const mysql = require('mysql2/promise');

async function createDatabase() {
  let connection;
  
  try {
    // Connect to MySQL without specifying a database
    connection = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: '' // Empty password for Laragon default
    });

    console.log('Connected to MySQL server');

    // Create database if it doesn't exist
    await connection.execute('CREATE DATABASE IF NOT EXISTS wms_db');
    console.log('Database wms_db created or already exists');

    // Show databases to confirm
    const [rows] = await connection.execute('SHOW DATABASES');
    console.log('Available databases:');
    rows.forEach(row => {
      console.log(`- ${row.Database}`);
    });

  } catch (error) {
    console.error('Error creating database:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

createDatabase(); 