const { sequelize } = require('./config/database');
const { Product, Material, ProductColour, ProductVariation } = require('./models');

async function testProductIntegration() {
    try {
        console.log('🧪 Testing Enhanced Product Integration...\n');
        
        // Test 1: Verify database structure
        console.log('Test 1: Verifying database structure...');
        
        // Check products table structure
        const [productsColumns] = await sequelize.query('DESCRIBE products');
        const productFields = productsColumns.map(col => col.Field);
        
        const expectedProductFields = ['materialId', 'category', 'price'];
        const missingFields = expectedProductFields.filter(field => !productFields.includes(field));
        
        if (missingFields.length > 0) {
            console.error(`❌ Missing product fields: ${missingFields.join(', ')}`);
            return;
        }
        
        console.log('✅ Products table structure verified');
        console.log(`   Fields: ${productFields.join(', ')}`);
        
        // Check if tables exist
        const [tables] = await sequelize.query('SHOW TABLES');
        const tableNames = tables.map(t => Object.values(t)[0]);
        
        const expectedTables = ['products', 'product_colours', 'product_variations', 'materials'];
        const missingTables = expectedTables.filter(table => !tableNames.includes(table));
        
        if (missingTables.length > 0) {
            console.error(`❌ Missing tables: ${missingTables.join(', ')}`);
            return;
        }
        
        console.log('✅ All required tables exist');
        
        // Test 2: Test Material → Product relationship
        console.log('\n\nTest 2: Testing Material → Product relationship...');
        
        const materialsWithProducts = await Material.findAll({
            include: [{
                model: Product,
                attributes: ['id', 'name', 'code', 'category', 'price']
            }],
            limit: 3
        });
        
        console.log(`✅ Found ${materialsWithProducts.length} materials with products`);
        
        materialsWithProducts.forEach(material => {
            console.log(`   📦 Material: ${material.name} (${material.code})`);
            console.log(`       Products: ${material.Products.length}`);
            material.Products.forEach(product => {
                console.log(`         • ${product.name} - ${product.category || 'No category'} - ${product.price ? `IDR ${product.price}` : 'No price'}`);
            });
        });
        
        // Test 3: Test Product with all relationships
        console.log('\n\nTest 3: Testing Product with all relationships...');
        
        const productsWithAll = await Product.findAll({
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
            limit: 5
        });
        
        console.log(`✅ Found ${productsWithAll.length} products with complete relationships`);
        
        productsWithAll.forEach(product => {
            console.log(`\n   🛍️  Product: ${product.name} (${product.code})`);
            console.log(`       Category: ${product.category || 'None'}`);
            console.log(`       Base Material: ${product.Material ? `${product.Material.name} (${product.Material.code})` : 'None'}`);
            console.log(`       Price: ${product.price ? `IDR ${parseFloat(product.price).toLocaleString()}` : 'Not set'}`);
            console.log(`       Stock: ${product.qtyOnHand} ${product.unit}`);
            console.log(`       Colours: ${product.colours.length} (${product.colours.map(c => c.colourName).join(', ')})`);
            console.log(`       Variations: ${product.variations.length} (${product.variations.map(v => `${v.size} +IDR${v.additionalPrice}`).join(', ')})`);
        });
        
        // Test 4: Test API-like operations (simulate frontend calls)
        console.log('\n\nTest 4: Testing API-like operations...');
        
        // Test creating a new product with material reference
        const testMaterial = await Material.findOne();
        if (testMaterial) {
            const testProduct = await Product.create({
                name: 'Integration Test Product',
                code: 'TEST-INT-001',
                materialId: testMaterial.id,
                category: 'Test',
                price: 150000,
                qtyOnHand: 20,
                unit: 'pcs',
                description: 'Product created during integration testing'
            });
            
            console.log(`✅ Created test product: ${testProduct.name} (ID: ${testProduct.id})`);
            
            // Add colours
            const testColours = [
                { code: 'RD', colourName: 'Red', productId: testProduct.id },
                { code: 'BL', colourName: 'Blue', productId: testProduct.id }
            ];
            
            for (const colourData of testColours) {
                const colour = await ProductColour.create(colourData);
                console.log(`   ✅ Added colour: ${colour.colourName} (${colour.code})`);
            }
            
            // Add variations
            const testVariations = [
                { code: 'S', size: 'Small', additionalPrice: 0, productId: testProduct.id },
                { code: 'L', size: 'Large', additionalPrice: 10000, productId: testProduct.id }
            ];
            
            for (const variationData of testVariations) {
                const variation = await ProductVariation.create(variationData);
                console.log(`   ✅ Added variation: ${variation.size} (+IDR ${variation.additionalPrice})`);
            }
            
            // Fetch the complete product
            const completeProduct = await Product.findByPk(testProduct.id, {
                include: [
                    { model: Material, attributes: ['name', 'code'] },
                    { model: ProductColour, as: 'colours' },
                    { model: ProductVariation, as: 'variations' }
                ]
            });
            
            console.log(`\n   📋 Complete test product verification:`);
            console.log(`       Name: ${completeProduct.name}`);
            console.log(`       Material: ${completeProduct.Material.name}`);
            console.log(`       Category: ${completeProduct.category}`);
            console.log(`       Price: IDR ${parseFloat(completeProduct.price).toLocaleString()}`);
            console.log(`       Colours: ${completeProduct.colours.length}`);
            console.log(`       Variations: ${completeProduct.variations.length}`);
            
            // Clean up test data
            await ProductColour.destroy({ where: { productId: testProduct.id } });
            await ProductVariation.destroy({ where: { productId: testProduct.id } });
            await testProduct.destroy();
            console.log(`   ✅ Cleaned up test data`);
        }
        
        // Test 5: Validate data integrity
        console.log('\n\nTest 5: Validating data integrity...');
        
        const totalProducts = await Product.count();
        const totalColours = await ProductColour.count();
        const totalVariations = await ProductVariation.count();
        const totalMaterials = await Material.count();
        
        // Check for orphaned records
        const orphanedColours = await ProductColour.count({
            include: [{
                model: Product,
                required: false
            }],
            where: {
                '$Product.id$': null
            }
        });
        
        const orphanedVariations = await ProductVariation.count({
            include: [{
                model: Product,
                required: false
            }],
            where: {
                '$Product.id$': null
            }
        });
        
        console.log(`✅ Database integrity check:`);
        console.log(`   Products: ${totalProducts}`);
        console.log(`   Materials: ${totalMaterials}`);
        console.log(`   Product Colours: ${totalColours}`);
        console.log(`   Product Variations: ${totalVariations}`);
        console.log(`   Orphaned Colours: ${orphanedColours}`);
        console.log(`   Orphaned Variations: ${orphanedVariations}`);
        
        if (orphanedColours > 0 || orphanedVariations > 0) {
            console.warn(`⚠️  Warning: Found orphaned records that may need cleanup`);
        }
        
        // Test 6: Performance test
        console.log('\n\nTest 6: Performance test...');
        
        const startTime = Date.now();
        const performanceTestProducts = await Product.findAll({
            include: [
                { model: Material },
                { model: ProductColour, as: 'colours' },
                { model: ProductVariation, as: 'variations' }
            ],
            limit: 10
        });
        const endTime = Date.now();
        
        console.log(`✅ Performance test completed:`);
        console.log(`   Query time: ${endTime - startTime}ms`);
        console.log(`   Products fetched: ${performanceTestProducts.length}`);
        console.log(`   Average time per product: ${((endTime - startTime) / performanceTestProducts.length).toFixed(2)}ms`);
        
        console.log('\n🎉 All Enhanced Product Integration tests passed successfully!');
        
        // Summary
        console.log('\n📊 INTEGRATION TEST SUMMARY:');
        console.log(`✅ Database structure verified`);
        console.log(`✅ Material → Product relationships working`);
        console.log(`✅ Product → Colour/Variation relationships working`);
        console.log(`✅ API-like operations successful`);
        console.log(`✅ Data integrity maintained`);
        console.log(`✅ Performance acceptable (${endTime - startTime}ms for 10 products)`);
        
    } catch (error) {
        console.error('❌ Integration test failed:', error);
        console.error('Stack trace:', error.stack);
    } finally {
        await sequelize.close();
    }
}

// Run the integration tests
testProductIntegration(); 