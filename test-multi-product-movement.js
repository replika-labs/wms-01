const fetch = require('node-fetch');

// Test Multi-Product MaterialMovement Creation
async function testMultiProductMovement() {
  console.log('🧪 =============================================');
  console.log('🧪 TESTING MULTI-PRODUCT MATERIAL MOVEMENT');
  console.log('🧪 =============================================');
  
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
    console.log(`✅ Target pieces: ${order.targetPcs}`);
    
    // Calculate current progress
    const currentProgress = order.ProgressReports?.reduce((total, report) => total + report.pcsFinished, 0) || 0;
    const remainingPcs = order.targetPcs - currentProgress;
    console.log(`✅ Current progress: ${currentProgress}/${order.targetPcs} (${remainingPcs} remaining)`);
    
    if (remainingPcs <= 0) {
      console.log('⚠️ Order is already completed. Creating test progress with 0 pieces but fabric usage only...');
    }
    
    // Display products and materials
    const products = [];
    order.OrderProducts.forEach((orderProduct, index) => {
      const product = orderProduct.Product;
      console.log(`   ${index + 1}. OrderProduct ID: ${orderProduct.id}`);
      console.log(`      Product: ${product.name} (ID: ${product.id})`);
      console.log(`      Material: ${product.Material?.name || 'No Material'} (ID: ${product.materialId || 'N/A'})`);
      console.log(`      Quantity: ${orderProduct.qty} pcs`);
      
      products.push({
        orderProductId: orderProduct.id,
        productId: product.id,
        productName: product.name,
        materialId: product.materialId,
        materialName: product.Material?.name,
        targetQty: orderProduct.qty
      });
    });
    
    // Check completion summary
    if (orderLinkData.completionSummary) {
      console.log('\n📊 COMPLETION SUMMARY:');
      console.log(`   Total Products: ${orderLinkData.completionSummary.totalProducts}`);
      console.log(`   Completed Products: ${orderLinkData.completionSummary.completedProducts}`);
      console.log(`   Total Pieces: ${orderLinkData.completionSummary.completedPieces}/${orderLinkData.completionSummary.totalPieces}`);
      console.log(`   Order Completion: ${orderLinkData.completionSummary.orderCompletionPercentage}%`);
    }
    
    // Check incomplete products
    if (orderLinkData.incompleteProducts && orderLinkData.incompleteProducts.length > 0) {
      console.log('\n📋 INCOMPLETE PRODUCTS:');
      orderLinkData.incompleteProducts.forEach((incomplete, index) => {
        console.log(`   ${index + 1}. OrderProduct ${incomplete.orderProductId}: ${incomplete.remainingQty}/${incomplete.qty} remaining`);
      });
    }
    
    // Step 2: Simulate multi-product fabric usage submission
    console.log('\n📤 STEP 2: Simulating multi-product fabric usage submission...');
    
    let pcsPerProduct;
    if (remainingPcs > 0) {
      // Distribute remaining pieces among products
      pcsPerProduct = Math.max(1, Math.floor(remainingPcs / products.length));
      console.log(`🧪 TEST SCENARIO: ${pcsPerProduct} piece(s) per product with fabric usage`);
    } else {
      // Order completed - test fabric usage tracking only
      pcsPerProduct = 1;
      console.log('🧪 TEST SCENARIO: Testing fabric usage tracking (pieces already completed)');
    }
    
    const productProgressData = products.map((product, index) => ({
      productId: product.productId,
      orderProductId: product.orderProductId,
      pcsFinished: pcsPerProduct,
      pcsTargetForThisReport: pcsPerProduct,
      fabricUsed: (index + 1) * 1.5, // Different fabric amounts: 1.5, 3.0, 4.5, etc.
      workHours: (index + 1) * 2,
      qualityScore: 95 + index,
      qualityNotes: `Quality check for ${product.productName}`,
      challenges: `Minor adjustment needed for ${product.productName}`,
      estimatedCompletion: null,
      photos: []
    }));
    
    console.log('🧪 Prepared progress data:');
    productProgressData.forEach((progress, index) => {
      console.log(`   Product ${index + 1}: ${progress.pcsFinished} pcs, ${progress.fabricUsed} fabric units`);
    });
    
    const totalPcsSubmitting = productProgressData.reduce((sum, p) => sum + p.pcsFinished, 0);
    const totalFabricExpected = productProgressData.reduce((sum, p) => sum + p.fabricUsed, 0);
    console.log(`🧪 Total pieces submitting: ${totalPcsSubmitting}`);
    console.log(`🧪 Expected total fabric usage: ${totalFabricExpected} units`);
    console.log(`🧪 Expected MaterialMovement records: ${productProgressData.length}`);
    
    // Adjust for completed orders
    if (remainingPcs <= 0) {
      console.log('⚠️ Adjusting for completed order - setting pieces to 0 but keeping fabric usage');
      productProgressData.forEach(progress => {
        progress.pcsFinished = 0;
        progress.pcsTargetForThisReport = 0;
      });
    }
    
    const progressResponse = await fetch(`${baseUrl}/api/order-links/${orderLinkToken}/progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        progressType: 'per-product',
        productProgressData,
        overallNote: 'Multi-product test submission - Enhanced Debug',
        overallPhoto: null,
        tailorName: 'Test Tailor - Enhanced Debug',
        isCompletingOrder: false
      })
    });
    
    const progressData = await progressResponse.json();
    
    if (!progressResponse.ok) {
      console.log('\n❌ Progress submission failed:');
      console.log('Error:', progressData.message);
      console.log('Response:', JSON.stringify(progressData, null, 2));
      throw new Error(`Progress submission failed: ${progressData.message}`);
    }
    
    console.log('\n✅ STEP 3: Progress submission successful!');
    console.log('📋 Response analysis:');
    console.log(`   Message: ${progressData.message}`);
    console.log(`   Progress Report ID: ${progressData.progressReport?.id}`);
    console.log(`   Product Reports Created: ${progressData.productReports?.length || 0}`);
    console.log(`   Fabric Movements Created: ${progressData.fabricMovements?.length || 0}`);
    console.log(`   Total Fabric Used: ${progressData.totalFabricUsed || 0}`);
    console.log(`   Movements Created: ${progressData.movementsCreated || 0}`);
    
    // Step 4: Verify MaterialMovement records
    console.log('\n🔍 STEP 4: Verifying MaterialMovement records...');
    
    if (progressData.fabricMovements && progressData.fabricMovements.length > 0) {
      console.log('✅ MaterialMovement records found:');
      progressData.fabricMovements.forEach((movement, index) => {
        console.log(`   Movement ${index + 1}:`);
        console.log(`     ID: ${movement.id}`);
        console.log(`     Material: ${movement.materialName} (ID: ${movement.materialId})`);
        console.log(`     Quantity: ${movement.qty}`);
        console.log(`     Type: ${movement.movementType}`);
        console.log(`     Description: ${movement.description}`);
      });
      
      // Verify each product created a movement
      const expectedMovements = productProgressData.filter(p => p.fabricUsed > 0).length;
      const actualMovements = progressData.fabricMovements.length;
      
      if (actualMovements === expectedMovements) {
        console.log(`✅ SUCCESS: All ${expectedMovements} expected MaterialMovement records created!`);
      } else {
        console.log(`❌ MISMATCH: Expected ${expectedMovements} movements, but got ${actualMovements}`);
      }
      
      // Verify total fabric usage
      const actualTotalFabric = progressData.totalFabricUsed;
      if (Math.abs(actualTotalFabric - totalFabricExpected) < 0.01) {
        console.log(`✅ SUCCESS: Total fabric usage matches - ${actualTotalFabric} units`);
      } else {
        console.log(`❌ MISMATCH: Expected ${totalFabricExpected} total fabric, but got ${actualTotalFabric}`);
      }
    } else {
      console.log('❌ ERROR: No MaterialMovement records found in response!');
      console.log('🔍 Response details:', JSON.stringify(progressData, null, 2));
    }
    
    // Step 5: Database verification (if possible)
    console.log('\n🔍 STEP 5: Database verification summary');
    console.log('📋 What to check in database:');
    console.log(`   1. progress_reports table: Should have 1 new record with ID ${progressData.progressReport?.id}`);
    console.log(`   2. product_progress_reports table: Should have ${productProgressData.length} new records`);
    console.log(`   3. material_movements table: Should have ${productProgressData.length} new KELUAR records`);
    console.log('   4. Each MaterialMovement should have:');
    console.log('      - movementType: KELUAR');
    console.log('      - movementSource: order');
    console.log(`      - referenceNumber: PROG-${progressData.progressReport?.id}`);
    console.log('      - Product-specific description and notes');
    
    console.log('\n🎯 TEST RESULT SUMMARY:');
    const testResults = {
      progressSubmission: progressResponse.ok,
      productReportsCreated: (progressData.productReports?.length || 0) === productProgressData.length,
      materialMovementsCreated: (progressData.fabricMovements?.length || 0) === productProgressData.length,
      totalFabricCorrect: Math.abs((progressData.totalFabricUsed || 0) - totalFabricExpected) < 0.01,
      multiProductSupport: (progressData.fabricMovements?.length || 0) > 1
    };
    
    Object.entries(testResults).forEach(([test, passed]) => {
      console.log(`   ${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
    });
    
    const allTestsPassed = Object.values(testResults).every(Boolean);
    console.log(`\n🏆 OVERALL RESULT: ${allTestsPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
    
    if (allTestsPassed) {
      console.log('🎉 Multi-product MaterialMovement creation is working correctly!');
      console.log('🎉 Every product with fabric usage creates individual MaterialMovement records.');
    } else {
      console.log('🔧 Issues detected in multi-product MaterialMovement creation.');
      console.log('🔧 Check the debug logs above for detailed analysis.');
    }
    
  } catch (error) {
    console.error('\n❌ TEST FAILED WITH ERROR:');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
if (require.main === module) {
  testMultiProductMovement()
    .then(() => {
      console.log('\n🧪 Test completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = testMultiProductMovement; 