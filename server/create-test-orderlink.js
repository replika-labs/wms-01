const { Order, OrderLink, Product, Material } = require('./models');
const { Op } = require('sequelize');
const crypto = require('crypto');

async function createTestOrderLink() {
  try {
    console.log('🔗 CREATING TEST ORDERLINK\n');
    
    // 1. Find an order with products and materials
    const order = await Order.findOne({
      include: [{
        model: Product,
        include: [{ model: Material }]
      }],
      where: {
        targetPcs: { [Op.gt]: 0 }
      }
    });
    
    if (!order) {
      console.log('❌ No orders with products and materials found');
      process.exit(1);
    }
    
    console.log(`Found Order: ${order.orderNumber}`);
    console.log(`Target Pieces: ${order.targetPcs}`);
    console.log(`Products with Materials:`);
    order.Products?.forEach(product => {
      if (product.Material) {
        console.log(`  - ${product.name}: ${product.Material.name} (${product.Material.qtyOnHand} ${product.Material.unit})`);
      }
    });
    
    // 2. Create OrderLink
    const token = crypto.randomBytes(32).toString('hex');
    const expireAt = new Date();
    expireAt.setDate(expireAt.getDate() + 30); // 30 days from now
    
    const orderLink = await OrderLink.create({
      orderId: order.id,
      userId: null, // Public link
      token: token,
      expireAt: expireAt,
      isActive: true
    });
    
    console.log(`\n✅ OrderLink created successfully!`);
    console.log(`Token: ${token}`);
    console.log(`Expires: ${expireAt.toDateString()}`);
    
    // 3. Generate the URL for testing
    const testUrl = `http://localhost:3000/order-progress/${token}`;
    console.log(`\n🌐 Test URL:`);
    console.log(testUrl);
    
    console.log(`\n📋 TEST INSTRUCTIONS:`);
    console.log(`1. Open the URL above in your browser`);
    console.log(`2. Fill in the form:`);
    console.log(`   - Tailor Name: Test Tailor`);
    console.log(`   - Pieces Completed: 1-5 pieces`);
    console.log(`   - Fabric Usage: 2-5 ${order.Products?.[0]?.Material?.unit || 'units'}`);
    console.log(`   - Notes: Testing material movement integration`);
    console.log(`3. Submit the form`);
    console.log(`4. Check database for new MaterialMovement entries`);
    
    console.log(`\n🔍 TO VERIFY RESULTS, RUN:`);
    console.log(`node -e "const {MaterialMovement} = require('./models'); MaterialMovement.findAll({where: {movementType: 'KELUAR', orderId: ${order.id}}, order: [['createdAt', 'DESC']], limit: 3}).then(m => {console.log('Recent KELUAR movements:'); m.forEach(mov => console.log(\`- ID \${mov.id}: Qty \${mov.qty}, Source: \${mov.movementSource}\`)); process.exit(0);});"`);
    
  } catch (error) {
    console.error('❌ Error creating test OrderLink:', error);
  }
  
  process.exit(0);
}

createTestOrderLink(); 