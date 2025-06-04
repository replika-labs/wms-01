const sequelize = require('./db');
const { User, Product, Order, OrderProduct } = require('./models');

async function seedCleanTestData() {
  try {
    console.log('🌱 Seeding clean test data for Orders with Multiple Products...\n');
    
    // Get admin user
    const admin = await User.findOne({ where: { role: 'admin' } });
    if (!admin) {
      throw new Error('Admin user not found. Please run create-admin.js first.');
    }
    
    // Get existing products
    const products = await Product.findAll({ limit: 8 });
    console.log(`📦 Found ${products.length} products in database`);
    
    if (products.length < 3) {
      throw new Error('Need at least 3 products to create meaningful test orders');
    }
    
    // Clear existing orders and order_products
    await OrderProduct.destroy({ where: {}, force: true });
    await Order.destroy({ where: {}, force: true });
    console.log('🧹 Cleared existing order data\n');
    
    // Test order 1: Multiple products - Fashion Collection
    const order1 = await Order.create({
      orderNumber: 'ORD250524-001',
      userId: admin.id,
      status: 'created',
      priority: 'high',
      dueDate: new Date('2025-06-01'),
      description: 'Fashion collection order with multiple products',
      customerNote: 'Customer wants variety of items for boutique',
      targetPcs: 0, // Will be calculated
      completedPcs: 0
    });
    
    // Add products to order 1
    const order1Products = [
      { productId: products[0].id, qty: 25 },
      { productId: products[1].id, qty: 15 },
      { productId: products[2].id, qty: 10 }
    ];
    
    await OrderProduct.bulkCreate(order1Products.map(p => ({
      orderId: order1.id,
      productId: p.productId,
      qty: p.qty
    })));
    
    const order1TargetPcs = order1Products.reduce((sum, p) => sum + p.qty, 0);
    await order1.update({ targetPcs: order1TargetPcs });
    
    console.log(`✅ Order 1 created: ${order1.orderNumber}`);
    console.log(`   Products: ${order1Products.length}, Total Qty: ${order1TargetPcs}`);
    
    // Test order 2: Single product - Simple order
    const order2 = await Order.create({
      orderNumber: 'ORD250524-002', 
      userId: admin.id,
      status: 'confirmed',
      priority: 'medium',
      dueDate: new Date('2025-06-05'),
      description: 'Single product order for testing',
      customerNote: 'Urgent single item needed',
      targetPcs: 30,
      completedPcs: 0
    });
    
    await OrderProduct.create({
      orderId: order2.id,
      productId: products[3].id,
      qty: 30
    });
    
    console.log(`✅ Order 2 created: ${order2.orderNumber}`);
    console.log(`   Products: 1, Total Qty: 30`);
    
    // Test order 3: Large multiple products order
    const order3 = await Order.create({
      orderNumber: 'ORD250524-003',
      userId: admin.id,
      status: 'processing',
      priority: 'urgent',
      dueDate: new Date('2025-05-28'),
      description: 'Large bulk order with mixed products',
      customerNote: 'Wholesale order for retail partner',
      targetPcs: 0,
      completedPcs: 15
    });
    
    const order3Products = [
      { productId: products[0].id, qty: 50 },
      { productId: products[2].id, qty: 35 },
      { productId: products[4] ? products[4].id : products[1].id, qty: 25 },
      { productId: products[5] ? products[5].id : products[0].id, qty: 20 }
    ];
    
    await OrderProduct.bulkCreate(order3Products.map(p => ({
      orderId: order3.id,
      productId: p.productId,
      qty: p.qty
    })));
    
    const order3TargetPcs = order3Products.reduce((sum, p) => sum + p.qty, 0);
    await order3.update({ targetPcs: order3TargetPcs });
    
    console.log(`✅ Order 3 created: ${order3.orderNumber}`);
    console.log(`   Products: ${order3Products.length}, Total Qty: ${order3TargetPcs}`);
    
    // Test order 4: Completed order with multiple products
    const order4 = await Order.create({
      orderNumber: 'ORD250524-004',
      userId: admin.id,
      status: 'completed',
      priority: 'medium',
      dueDate: new Date('2025-06-15'),
      description: 'Completed order example',
      customerNote: 'Successfully completed order',
      targetPcs: 0,
      completedPcs: 0
    });
    
    const order4Products = [
      { productId: products[1].id, qty: 12 },
      { productId: products[3].id, qty: 8 }
    ];
    
    await OrderProduct.bulkCreate(order4Products.map(p => ({
      orderId: order4.id,
      productId: p.productId,
      qty: p.qty
    })));
    
    const order4TargetPcs = order4Products.reduce((sum, p) => sum + p.qty, 0);
    await order4.update({ 
      targetPcs: order4TargetPcs,
      completedPcs: order4TargetPcs // Mark as completed
    });
    
    console.log(`✅ Order 4 created: ${order4.orderNumber}`);
    console.log(`   Products: ${order4Products.length}, Total Qty: ${order4TargetPcs} (COMPLETED)`);
    
    // Summary
    console.log('\n📊 CLEAN TEST DATA SUMMARY:');
    console.log('============================');
    
    const totalOrders = await Order.count();
    const totalOrderProducts = await OrderProduct.count();
    
    console.log(`✅ Total Orders: ${totalOrders}`);
    console.log(`✅ Total Order-Product Records: ${totalOrderProducts}`);
    console.log('\n🎯 Database is ready for testing multiple products functionality!');
    
  } catch (error) {
    console.error('❌ Error seeding clean test data:', error.message);
    console.error(error);
  } finally {
    await sequelize.close();
  }
}

seedCleanTestData(); 