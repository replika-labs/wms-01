const { sequelize } = require('./config/database');

async function runProgressReportMigration() {
  try {
    console.log('Running migration to make ProgressReport userId nullable...');
    
    const queryInterface = sequelize.getQueryInterface();
    
    // Step 1: Drop existing foreign key constraint (correct name)
    console.log('Step 1: Dropping existing foreign key constraint...');
    await queryInterface.sequelize.query(`
      ALTER TABLE progress_reports 
      DROP FOREIGN KEY progress_reports_ibfk_28
    `);
    console.log('✅ Foreign key constraint dropped');
    
    // Step 2: Modify column to allow NULL
    console.log('Step 2: Making userId column nullable...');
    await queryInterface.sequelize.query(`
      ALTER TABLE progress_reports 
      MODIFY COLUMN userId INT NULL
    `);
    console.log('✅ userId column is now nullable');
    
    // Step 3: Recreate foreign key constraint with ON DELETE SET NULL
    console.log('Step 3: Recreating foreign key constraint...');
    await queryInterface.sequelize.query(`
      ALTER TABLE progress_reports 
      ADD CONSTRAINT fk_progress_reports_userId 
      FOREIGN KEY (userId) REFERENCES users(id) 
      ON DELETE SET NULL ON UPDATE CASCADE
    `);
    console.log('✅ Foreign key constraint recreated with SET NULL');
    
    console.log('🎉 Migration completed successfully!');
    console.log('ProgressReport userId is now nullable');
    console.log('OrderLink forms can now be submitted without authentication');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('Error details:', error.original?.sqlMessage || error.message);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

runProgressReportMigration(); 