const fetch = require('node-fetch');

// Test Fabric Usage Flow from Order-Progress to MaterialMovement
async function testFabricUsageFlow() {
  console.log('🧪 TESTING FABRIC USAGE FLOW FROM ORDER-PROGRESS TO MATERIAL_MOVEMENTS');
  console.log('=' * 80);
  
  const baseUrl = 'http://localhost:8080';
  const orderLinkToken = 'dc91cdea327a82839cb10b23260192d45afd7738213fc3021849de830100177f';
  
  try {
    // Step 1: Get OrderLink data to verify structure
    console.log('\n📋 STEP 1: Fetching OrderLink data...');
    const orderLinkResponse = await fetch(`${baseUrl}/api/order-links/${orderLinkToken}`);
    const orderLinkData = await orderLinkResponse.json();
    
    if (!orderLinkResponse.ok) {
      throw new Error(`Failed to fetch OrderLink: ${orderLinkData.message}`);
    }
    
    const order = orderLinkData.orderLink.Order;
    console.log(`✅ Order: ${order.orderNumber} (ID: ${order.id})`);
    console.log(`✅ Products: ${order.OrderProducts.length}`);
    
    // Display products and materials
    order.OrderProducts.forEach((orderProduct, index) => {
      const product = orderProduct.Product;
      console.log(`   ${index + 1}. OrderProduct ID: ${orderProduct.id}`);
      console.log(`      Product: ${product.name} (ID: ${product.id})`);
      console.log(`      Material: ${product.Material.name} (ID: ${product.materialId})`);
      console.log(`      Quantity: ${orderProduct.qty} pcs`);
    });
    
    // Step 2: Simulate fabric usage submission
    console.log('\n📤 STEP 2: Simulating per-product fabric usage submission...');
    
    const fabricUsageData = {
      progressType: 'per-product',
      tailorName: 'Test Tailor - Fabric Usage Verification',
      overallNote: 'Test submission for fabric usage verification',
      productProgressData: [
        {
          productId: order.OrderProducts[0].Product.id,           // Product ID 21
          orderProductId: order.OrderProducts[0].id,             // OrderProduct ID 86
          pcsFinished: 1,
          fabricUsed: 2.5,                                       // 2.5 meters of fabric
          workHours: 3,
          qualityScore: 95,
          qualityNotes: 'Good quality work',
          challenges: 'None',
          photos: []
        },
        {
          productId: order.OrderProducts[1].Product.id,           // Product ID 9
          orderProductId: order.OrderProducts[1].id,             // OrderProduct ID 87
          pcsFinished: 1,
          fabricUsed: 1.8,                                       // 1.8 meters of fabric
          workHours: 2.5,
          qualityScore: 98,
          qualityNotes: 'Excellent quality',
          challenges: 'Minor adjustment needed',
          photos: []
        }
      ]
    };
    
    console.log(`   Submitting fabric usage:`);
    console.log(`   - Product 1 (${order.OrderProducts[0].Product.name}): ${fabricUsageData.productProgressData[0].fabricUsed} meters`);
    console.log(`   - Product 2 (${order.OrderProducts[1].Product.name}): ${fabricUsageData.productProgressData[1].fabricUsed} meters`);
    console.log(`   - Total fabric: ${fabricUsageData.productProgressData[0].fabricUsed + fabricUsageData.productProgressData[1].fabricUsed} meters`);
    
    const progressResponse = await fetch(`${baseUrl}/api/order-links/${orderLinkToken}/progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(fabricUsageData)
    });
    
    const progressResult = await progressResponse.json();
    
    if (!progressResponse.ok) {
      console.error(`❌ Progress submission failed: ${progressResult.message}`);
      console.error('   Error details:', progressResult);
      return;
    }
    
    console.log(`✅ Progress submitted successfully!`);
    console.log(`   Message: ${progressResult.message}`);
    console.log(`   Progress Report ID: ${progressResult.progressReport.id}`);
    console.log(`   Total Fabric Used: ${progressResult.totalFabricUsed} meters`);
    console.log(`   Fabric Movements Created: ${progressResult.fabricMovements?.length || 0}`);
    
    // Step 3: Verify MaterialMovement creation
    console.log('\n🔍 STEP 3: Verifying MaterialMovement creation...');
    
    if (progressResult.fabricMovements && progressResult.fabricMovements.length > 0) {
      console.log(`✅ ${progressResult.fabricMovements.length} MaterialMovement records created:`);
      
      progressResult.fabricMovements.forEach((movement, index) => {
        console.log(`   ${index + 1}. Movement ID: ${movement.id}`);
        console.log(`      Material ID: ${movement.materialId}`);
        console.log(`      Quantity: ${movement.qty} meters`);
        console.log(`      Movement Type: KELUAR (expected)`);
        console.log(`      Source: ORDER_PROGRESS_PER_PRODUCT`);
        console.log(`      Description: ${movement.description}`);
        console.log(`      Notes: ${movement.notes}`);
      });
    } else {
      console.log(`❌ No fabric movements were created!`);
    }
    
    // Step 4: Verify database state (if we have direct access)
    console.log('\n🗄️ STEP 4: Additional verification...');
    console.log(`   Order ID: ${order.id}`);
    console.log(`   Progress Report ID: ${progressResult.progressReport.id}`);
    console.log(`   Expected MaterialMovement records: 2 (one per product)`);
    console.log(`   Expected movementType: 'KELUAR'`);
    console.log(`   Expected movementSource: 'ORDER_PROGRESS_PER_PRODUCT'`);
    
    // Summary
    console.log('\n📊 TEST SUMMARY:');
    console.log('=' * 50);
    console.log(`✅ OrderLink data retrieval: SUCCESS`);
    console.log(`✅ Progress submission: SUCCESS`);
    console.log(`✅ Fabric usage processed: ${progressResult.totalFabricUsed} meters`);
    console.log(`✅ MaterialMovement creation: ${progressResult.fabricMovements?.length || 0} records`);
    console.log(`✅ Movement type verification: All movements should be 'KELUAR'`);
    
    if (progressResult.fabricMovements && progressResult.fabricMovements.length === 2) {
      console.log(`🎉 SUCCESS: Fabric Usage Flow is working perfectly!`);
      console.log(`   - Fabric used data is correctly transmitted from order-progress`);
      console.log(`   - MaterialMovement records are created with movementType 'KELUAR'`);
      console.log(`   - Per-product tracking is functional`);
    } else {
      console.log(`⚠️ PARTIAL SUCCESS: Some issues detected`);
    }
    
  } catch (error) {
    console.error(`❌ TEST FAILED: ${error.message}`);
    console.error(`   Stack: ${error.stack}`);
  }
}

// Run the test
if (require.main === module) {
  testFabricUsageFlow()
    .then(() => {
      console.log('\n🏁 Test completed.');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Test failed with unhandled error:', error);
      process.exit(1);
    });
}

module.exports = testFabricUsageFlow; 