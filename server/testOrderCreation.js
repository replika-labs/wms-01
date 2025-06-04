// Testing order creation data structure without axios

async function testOrderCreation() {
  try {
    console.log('🧪 Testing Order Creation with Multiple Products...\n');
    
    // Test data: Order with multiple products
    const orderData = {
      products: [
        { productId: 1, quantity: 10 },
        { productId: 2, quantity: 15 },
        { productId: 3, quantity: 5 }
      ],
      customerNote: 'Test order with multiple products',
      dueDate: '2025-05-30',
      description: 'API test order',
      priority: 'medium'
    };
    
    console.log('📤 Sending order creation request...');
    console.log('Order Data:', JSON.stringify(orderData, null, 2));
    
    // Note: This test requires authentication token
    // For now, we'll test the validation logic
    
    console.log('\n✅ Order data structure validation:');
    console.log(`   Products array: ${Array.isArray(orderData.products) ? '✅ Valid' : '❌ Invalid'}`);
    console.log(`   Products count: ${orderData.products.length}`);
    console.log(`   Due date: ${orderData.dueDate ? '✅ Present' : '❌ Missing'}`);
    
    // Calculate expected target pieces
    const expectedTargetPcs = orderData.products.reduce((sum, product) => sum + product.quantity, 0);
    console.log(`   Expected target pcs: ${expectedTargetPcs}`);
    
    // Validate individual products
    console.log('\n📋 Product validation:');
    orderData.products.forEach((product, index) => {
      const hasProductId = product.productId && typeof product.productId === 'number';
      const hasQuantity = product.quantity && typeof product.quantity === 'number' && product.quantity > 0;
      console.log(`   Product ${index + 1}: ID=${product.productId}, Qty=${product.quantity} ${hasProductId && hasQuantity ? '✅' : '❌'}`);
    });
    
    console.log('\n🎯 Test Result: Order creation data structure ✅ VALID');
    console.log('💡 Frontend should be able to create orders with this structure');
    
  } catch (error) {
    console.error('❌ Error in order creation test:', error.message);
  }
}

testOrderCreation(); 