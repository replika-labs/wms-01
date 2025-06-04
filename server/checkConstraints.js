const { sequelize } = require('./config/database');

async function checkConstraints() {
  try {
    console.log('Checking constraints for progress_reports table...');
    
    // Check foreign key constraints - without schema name
    const result = await sequelize.query(`
      SELECT CONSTRAINT_NAME, CONSTRAINT_TYPE
      FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
      WHERE TABLE_NAME = 'progress_reports'
    `);
    
    console.log('Constraints found:', result[0]);
    
    // Check column details - without schema name
    const columns = await sequelize.query(`
      SELECT COLUMN_NAME, IS_NULLABLE, DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'progress_reports'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('\nColumn details:');
    columns[0].forEach(col => {
      console.log(`${col.COLUMN_NAME}: ${col.DATA_TYPE} ${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    // Check specifically foreign key constraints
    const fkResult = await sequelize.query(`
      SELECT 
        CONSTRAINT_NAME,
        COLUMN_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE TABLE_NAME = 'progress_reports' 
      AND REFERENCED_TABLE_NAME IS NOT NULL
    `);
    
    console.log('\nForeign key constraints:');
    console.log(fkResult[0]);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

checkConstraints(); 