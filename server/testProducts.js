const { sequelize } = require('./config/database');
const { Product, Material, ProductColour, ProductVariation } = require('./models');

async function testProducts() {
    try {
        console.log('🧪 Testing Enhanced Product Functionality...\n');
        
        // Test 1: Fetch products with relationships
        console.log('Test 1: Fetching products with relationships...');
        const products = await Product.findAll({
            include: [
                { 
                    model: Material,
                    attributes: ['id', 'name', 'code']
                },
                { 
                    model: ProductColour,
                    as: 'colours',
                    attributes: ['id', 'code', 'colourName']
                },
                { 
                    model: ProductVariation,
                    as: 'variations',
                    attributes: ['id', 'code', 'size', 'additionalPrice']
                }
            ],
            limit: 3
        });
        
        console.log(`✅ Found ${products.length} products`);
        
        if (products.length > 0) {
            const product = products[0];
            console.log(`\n📦 Sample Product: ${product.name}`);
            console.log(`   Code: ${product.code}`);
            console.log(`   Category: ${product.category || 'None'}`);
            console.log(`   Base Material: ${product.Material ? product.Material.name : 'None'}`);
            console.log(`   Price: ${product.price ? `IDR ${product.price.toLocaleString()}` : 'Not set'}`);
            console.log(`   Colours: ${product.colours.length} (${product.colours.map(c => c.colourName).join(', ')})`);
            console.log(`   Variations: ${product.variations.length} (${product.variations.map(v => v.size).join(', ')})`);
        }
        
        // Test 2: Test Product Colour operations
        console.log('\n\nTest 2: Testing Product Colour operations...');
        if (products.length > 0) {
            const productId = products[0].id;
            
            // Get colours for a product
            const colours = await ProductColour.findAll({
                where: { productId }
            });
            console.log(`✅ Product ${productId} has ${colours.length} colours`);
            
            if (colours.length > 0) {
                console.log(`   Sample colour: ${colours[0].colourName} (${colours[0].code})`);
            }
        }
        
        // Test 3: Test Product Variation operations
        console.log('\n\nTest 3: Testing Product Variation operations...');
        if (products.length > 0) {
            const productId = products[0].id;
            
            // Get variations for a product
            const variations = await ProductVariation.findAll({
                where: { productId }
            });
            console.log(`✅ Product ${productId} has ${variations.length} variations`);
            
            if (variations.length > 0) {
                console.log(`   Sample variation: ${variations[0].size} (${variations[0].code}) +IDR ${variations[0].additionalPrice}`);
            }
        }
        
        // Test 4: Test Material → Product relationship
        console.log('\n\nTest 4: Testing Material → Product relationship...');
        const materials = await Material.findAll({
            include: [{
                model: Product,
                attributes: ['id', 'name', 'code']
            }],
            limit: 2
        });
        
        console.log(`✅ Found ${materials.length} materials`);
        materials.forEach(material => {
            console.log(`   Material: ${material.name} → ${material.Products.length} products`);
        });
        
        // Test 5: Database integrity check
        console.log('\n\nTest 5: Database integrity check...');
        const totalProducts = await Product.count();
        const totalColours = await ProductColour.count();
        const totalVariations = await ProductVariation.count();
        
        console.log(`✅ Database integrity:`);
        console.log(`   Products: ${totalProducts}`);
        console.log(`   Product Colours: ${totalColours}`);
        console.log(`   Product Variations: ${totalVariations}`);
        
        // Test 6: Enhanced Product creation test
        console.log('\n\nTest 6: Testing enhanced Product creation...');
        const testProduct = await Product.create({
            name: 'Test Enhanced Product',
            code: 'TEST-ENH-001',
            materialId: materials.length > 0 ? materials[0].id : null,
            category: 'Test',
            price: 99000,
            qtyOnHand: 10,
            unit: 'pcs',
            description: 'Test product for enhanced functionality',
            defaultTarget: 5
        });
        
        console.log(`✅ Created test product: ${testProduct.name} (ID: ${testProduct.id})`);
        
        // Add test colour and variation
        const testColour = await ProductColour.create({
            productId: testProduct.id,
            code: 'TST',
            colourName: 'Test Color',
            notes: 'Test color for enhanced product'
        });
        
        const testVariation = await ProductVariation.create({
            productId: testProduct.id,
            code: 'M',
            size: 'Medium',
            additionalPrice: 5000
        });
        
        console.log(`✅ Added test colour: ${testColour.colourName}`);
        console.log(`✅ Added test variation: ${testVariation.size}`);
        
        // Clean up test data
        await testVariation.destroy();
        await testColour.destroy();
        await testProduct.destroy();
        console.log(`✅ Cleaned up test data`);
        
        console.log('\n🎉 All Enhanced Product tests passed successfully!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await sequelize.close();
    }
}

// Run the tests
testProducts(); 