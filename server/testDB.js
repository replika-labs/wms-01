const { sequelize } = require('./config/database');
const { Order, Material, ProgressReport, User, Product, MaterialMovement, StatusChange } = require('./models');

async function testDatabase() {
    try {
        console.log('Testing database connection...');
        
        // Test database connection
        await sequelize.authenticate();
        console.log('✅ Database connection successful');
        
        // Test each model
        console.log('\nTesting models...');
        
        const models = { Order, Material, ProgressReport, User, Product, MaterialMovement, StatusChange };
        
        for (const [modelName, model] of Object.entries(models)) {
            try {
                const count = await model.count();
                console.log(`✅ ${modelName}: ${count} records`);
            } catch (error) {
                console.error(`❌ Error with ${modelName}:`, error.message);
            }
        }
        
        // Test basic dashboard queries
        console.log('\nTesting dashboard queries...');
        
        try {
            const orderCount = await Order.count();
            console.log(`✅ Order count: ${orderCount}`);
        } catch (error) {
            console.error('❌ Error counting orders:', error.message);
        }
        
        try {
            const materialCount = await Material.count();
            console.log(`✅ Material count: ${materialCount}`);
        } catch (error) {
            console.error('❌ Error counting materials:', error.message);
        }
        
        try {
            const userCount = await User.count();
            console.log(`✅ User count: ${userCount}`);
        } catch (error) {
            console.error('❌ Error counting users:', error.message);
        }
        
        console.log('\n✅ Database test completed successfully');
        
    } catch (error) {
        console.error('❌ Database test failed:', error);
    } finally {
        await sequelize.close();
    }
}

testDatabase(); 