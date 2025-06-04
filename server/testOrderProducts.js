const { OrderProduct, Order, Product } = require('./models');
const sequelize = require('./db');

async function testOrderProducts() {
  try {
    console.log('🔍 Testing OrderProduct relationships...\n');
    
    // Test 1: Count OrderProduct records
    const orderProductCount = await OrderProduct.count();
    console.log(`✅ OrderProduct records: ${orderProductCount}`);
    
    // Test 2: Find orders with products
    const ordersWithProducts = await Order.findAll({
      include: [{
        model: Product,
        through: { model: OrderProduct }
      }],
      limit: 3
    });
    
    console.log(`✅ Orders with products found: ${ordersWithProducts.length}\n`);
    
    // Test 3: Detailed analysis of first order
    if (ordersWithProducts.length > 0) {
      const firstOrder = ordersWithProducts[0];
      console.log('📋 First Order Analysis:');
      console.log(`   Order Number: ${firstOrder.orderNumber}`);
      console.log(`   Target Pcs: ${firstOrder.targetPcs}`);
      console.log(`   Products Count: ${firstOrder.Products ? firstOrder.Products.length : 0}`);
      
      if (firstOrder.Products && firstOrder.Products.length > 0) {
        console.log('   Products Details:');
        firstOrder.Products.forEach((product, index) => {
          const qty = product.OrderProduct ? product.OrderProduct.qty : 'N/A';
          console.log(`     ${index + 1}. ${product.name} - Qty: ${qty}`);
        });
        
        // Calculate total quantity
        const totalQty = firstOrder.Products.reduce((sum, product) => {
          const qty = product.OrderProduct ? product.OrderProduct.qty : 0;
          return sum + qty;
        }, 0);
        console.log(`   Total Calculated Qty: ${totalQty}`);
        console.log(`   Matches Target Pcs: ${totalQty === firstOrder.targetPcs ? '✅ YES' : '❌ NO'}`);
      }
    }
    
    // Test 4: Check for orders with multiple products
    const multiProductOrders = await Order.findAll({
      include: [{
        model: Product,
        through: { model: OrderProduct }
      }]
    });
    
    const ordersWithMultipleProducts = multiProductOrders.filter(order => 
      order.Products && order.Products.length > 1
    );
    
    console.log(`\n✅ Orders with multiple products: ${ordersWithMultipleProducts.length}`);
    
    if (ordersWithMultipleProducts.length > 0) {
      console.log('\n📊 Multiple Products Orders:');
      ordersWithMultipleProducts.forEach((order, index) => {
        console.log(`   ${index + 1}. Order ${order.orderNumber}: ${order.Products.length} products`);
      });
    } else {
      console.log('⚠️  No orders with multiple products found - this might indicate an issue');
    }
    
    console.log('\n🎯 Test Result: Multiple products per order functionality', 
      ordersWithMultipleProducts.length > 0 ? '✅ WORKING' : '⚠️ NEEDS INVESTIGATION');
    
  } catch (error) {
    console.error('❌ Error testing OrderProduct relationships:', error.message);
    console.error(error);
  } finally {
    await sequelize.close();
  }
}

testOrderProducts(); 