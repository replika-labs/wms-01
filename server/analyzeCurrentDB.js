const { Order, OrderProduct, Product } = require('./models');
const sequelize = require('./db');

async function analyzeCurrentDatabase() {
  try {
    console.log('📊 COMPREHENSIVE DATABASE ANALYSIS');
    console.log('=====================================\n');
    
    // Get all orders with their products
    const orders = await Order.findAll({
      include: [{
        model: Product,
        through: { model: OrderProduct }
      }],
      order: [['createdAt', 'DESC']]
    });
    
    console.log(`📋 TOTAL ORDERS: ${orders.length}`);
    console.log(`📦 TOTAL ORDER-PRODUCT RECORDS: ${await OrderProduct.count()}\n`);
    
    // Analyze each order
    let ordersWithProducts = 0;
    let ordersWithMultipleProducts = 0;
    let totalProductsAcrossOrders = 0;
    let targetPcsConsistencyIssues = 0;
    
    console.log('📋 ORDER DETAILS:');
    console.log('=================');
    
    orders.forEach((order, index) => {
      const productCount = order.Products ? order.Products.length : 0;
      totalProductsAcrossOrders += productCount;
      
      if (productCount > 0) ordersWithProducts++;
      if (productCount > 1) ordersWithMultipleProducts++;
      
      // Calculate total quantity from products
      let calculatedTargetPcs = 0;
      if (order.Products) {
        calculatedTargetPcs = order.Products.reduce((sum, product) => {
          return sum + (product.OrderProduct ? product.OrderProduct.qty : 0);
        }, 0);
      }
      
      const targetConsistent = calculatedTargetPcs === order.targetPcs;
      if (!targetConsistent && productCount > 0) targetPcsConsistencyIssues++;
      
      console.log(`${index + 1}. ${order.orderNumber} (${order.status})`);
      console.log(`   Products: ${productCount}`);
      console.log(`   Target Pcs: ${order.targetPcs} | Calculated: ${calculatedTargetPcs} ${targetConsistent ? '✅' : '❌'}`);
      
      if (order.Products && order.Products.length > 0) {
        order.Products.forEach((product, pIndex) => {
          const qty = product.OrderProduct ? product.OrderProduct.qty : 0;
          console.log(`     ${pIndex + 1}. ${product.name} (ID: ${product.id}) - Qty: ${qty}`);
        });
      }
      console.log('');
    });
    
    // Summary statistics
    console.log('📊 SUMMARY STATISTICS:');
    console.log('======================');
    console.log(`✅ Orders with products: ${ordersWithProducts}`);
    console.log(`✅ Orders with multiple products: ${ordersWithMultipleProducts}`);
    console.log(`✅ Average products per order: ${(totalProductsAcrossOrders / orders.length).toFixed(2)}`);
    console.log(`${targetPcsConsistencyIssues === 0 ? '✅' : '❌'} Target Pcs consistency issues: ${targetPcsConsistencyIssues}`);
    
    // Final assessment
    console.log('\n🎯 ASSESSMENT:');
    console.log('===============');
    
    if (ordersWithMultipleProducts > 0 && targetPcsConsistencyIssues === 0) {
      console.log('✅ DATABASE STATUS: EXCELLENT - Multiple products functionality working correctly');
      console.log('💡 RECOMMENDATION: Keep current database - no reset needed');
    } else if (ordersWithMultipleProducts > 0 && targetPcsConsistencyIssues > 0) {
      console.log('⚠️  DATABASE STATUS: FUNCTIONAL but with inconsistencies');
      console.log('💡 RECOMMENDATION: Optional reset to fix data consistency');
    } else {
      console.log('⚠️  DATABASE STATUS: Limited test data');
      console.log('💡 RECOMMENDATION: Reset and seed with proper test data');
    }
    
  } catch (error) {
    console.error('❌ Error analyzing database:', error.message);
  } finally {
    await sequelize.close();
  }
}

analyzeCurrentDatabase(); 