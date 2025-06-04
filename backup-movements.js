const sequelize = require('./server/db');
const MaterialMovement = require('./server/models/MaterialMovement');
const fs = require('fs');

async function backupMaterialMovements() {
  try {
    console.log('🔍 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connected successfully');
    
    console.log('📊 Fetching existing MaterialMovement records...');
    const movements = await MaterialMovement.findAll({
      order: [['createdAt', 'ASC']]
    });
    
    console.log(`📈 Found ${movements.length} existing MaterialMovement records`);
    
    if (movements.length > 0) {
      // Create backup file
      const backupData = {
        backupDate: new Date().toISOString(),
        totalRecords: movements.length,
        records: movements.map(movement => movement.toJSON())
      };
      
      const backupFilename = `material_movements_backup_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
      fs.writeFileSync(backupFilename, JSON.stringify(backupData, null, 2));
      
      console.log(`💾 Backup saved to: ${backupFilename}`);
      
      // Show summary
      console.log('\n📋 Movement Records Summary:');
      console.log('='.repeat(50));
      
      const summary = movements.reduce((acc, movement) => {
        const type = movement.movementType;
        acc[type] = acc[type] || { count: 0, totalQty: 0 };
        acc[type].count++;
        acc[type].totalQty += parseFloat(movement.qty || 0);
        return acc;
      }, {});
      
      Object.entries(summary).forEach(([type, data]) => {
        console.log(`${type}: ${data.count} records, Total Qty: ${data.totalQty}`);
      });
      
      // Show sample records
      console.log('\n📝 Sample Records:');
      movements.slice(0, 3).forEach((movement, index) => {
        console.log(`${index + 1}. Material ID: ${movement.materialId}, Type: ${movement.movementType}, Qty: ${movement.qty}, Date: ${movement.createdAt}`);
      });
      
    } else {
      console.log('ℹ️  Table is already empty - no backup needed');
    }
    
    console.log('\n✅ Task 1.1 Completed: Material movements backup analysis done');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error backing up material movements:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run backup
backupMaterialMovements(); 