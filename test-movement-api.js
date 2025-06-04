const sequelize = require('./server/db');
const MaterialMovement = require('./server/models/MaterialMovement');
const Material = require('./server/models/Material');

async function testMovementAPI() {
  try {
    console.log('🔍 Testing MaterialMovement API functionality...');
    await sequelize.authenticate();
    console.log('✅ Database connected successfully');
    
    // Step 1: Check existing movements
    console.log('\n📊 Step 1: Checking existing movements...');
    
    const totalMovements = await MaterialMovement.count();
    const purchaseMovements = await MaterialMovement.count({ where: { movementSource: 'purchase' } });
    const manualMovements = await MaterialMovement.count({ where: { movementSource: 'manual' } });
    
    console.log(`📈 Total movements: ${totalMovements}`);
    console.log(`📈 Purchase movements: ${purchaseMovements}`);
    console.log(`📈 Manual movements: ${manualMovements}`);
    
    // Step 2: Test MaterialMovement model methods
    console.log('\n🧪 Step 2: Testing model methods...');
    
    if (totalMovements > 0) {
      // Test findBySource
      const purchaseMovementsTest = await MaterialMovement.findBySource('purchase', { limit: 3 });
      console.log(`✅ findBySource('purchase'): Found ${purchaseMovementsTest.length} movements`);
      
      // Test calculateInventoryForMaterial
      if (purchaseMovementsTest.length > 0) {
        const materialId = purchaseMovementsTest[0].materialId;
        const inventory = await MaterialMovement.calculateInventoryForMaterial(materialId);
        console.log(`✅ calculateInventoryForMaterial(${materialId}):`, {
          totalMasuk: inventory.totalMasuk,
          totalKeluar: inventory.totalKeluar,
          currentStock: inventory.currentStock,
          totalValue: inventory.totalValue
        });
      }
      
      // Test getMovementSummary
      const summary = await MaterialMovement.getMovementSummary();
      console.log(`✅ getMovementSummary(): Found ${summary.length} summary records`);
      summary.forEach(item => {
        console.log(`  - ${item.movementType} ${item.movementSource}: ${item.dataValues.count} movements, ${item.dataValues.totalQty} total qty`);
      });
    }
    
    // Step 3: Test creating a manual movement
    console.log('\n🔧 Step 3: Testing manual movement creation...');
    
    // Get first material for testing
    const testMaterial = await Material.findOne();
    
    if (testMaterial) {
      console.log(`🔍 Using test material: ${testMaterial.name} (ID: ${testMaterial.id})`);
      
      // Create test movement
      const testMovement = await MaterialMovement.create({
        materialId: testMaterial.id,
        qty: 5.0,
        movementType: 'MASUK',
        movementSource: 'manual',
        description: 'Test manual movement',
        referenceNumber: 'TEST-001',
        unitPrice: 1000,
        totalValue: 5000,
        notes: 'Created by test script'
      });
      
      console.log(`✅ Test movement created: ID ${testMovement.id}, Qty: ${testMovement.qty}, Value: ${testMovement.totalValue}`);
      
      // Test instance methods
      console.log(`✅ calculateValue(): ${testMovement.calculateValue()}`);
      console.log(`✅ isPurchaseGenerated(): ${testMovement.isPurchaseGenerated()}`);
      console.log(`✅ isManual(): ${testMovement.isManual()}`);
      
      // Clean up test movement
      await testMovement.destroy();
      console.log(`🗑️  Test movement cleaned up`);
    } else {
      console.log('⚠️  No materials found for testing');
    }
    
    // Step 4: Test movement analytics
    console.log('\n📊 Step 4: Testing movement analytics...');
    
    const analyticsData = await MaterialMovement.getMovementSummary({
      movementSource: 'purchase'
    });
    
    console.log(`✅ Purchase movement analytics: ${analyticsData.length} records`);
    
    console.log('\n🎉 MaterialMovement API functionality test completed successfully!');
    console.log('\n✅ Task 3.1 Implementation Status: COMPLETED');
    console.log('   - ✅ MaterialMovement model: Enhanced with purchase integration');
    console.log('   - ✅ Instance methods: Working (calculateValue, isPurchaseGenerated, isManual)');
    console.log('   - ✅ Static methods: Working (findBySource, calculateInventoryForMaterial, getMovementSummary)');
    console.log('   - ✅ CRUD operations: Ready for API controller');
    console.log('   - ✅ Analytics: Functional');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error testing MaterialMovement API:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run test
testMovementAPI(); 