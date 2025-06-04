const { sequelize } = require('./config/database');
const { Product, Material, ProductColour, ProductVariation } = require('./models');

async function seedProductsData() {
    try {
        console.log('Seeding enhanced Products data...');
        
        // Get some materials to use as base materials for products
        const materials = await Material.findAll({ limit: 5 });
        if (materials.length === 0) {
            console.log('No materials found. Please seed materials first.');
            return;
        }

        // Sample enhanced products data
        const productsData = [
            {
                name: 'Premium Silk Hijab Collection',
                code: 'HIJ-SILK-001',
                materialId: materials[0].id, // Use first material (silk)
                category: 'Hijab',
                price: 250000,
                qtyOnHand: 50,
                unit: 'pcs',
                description: 'Luxurious silk hijab collection with premium finish',
                defaultTarget: 10
            },
            {
                name: 'Cotton Casual Dress',
                code: 'DRS-CTN-001',
                materialId: materials[1] ? materials[1].id : materials[0].id,
                category: 'Dress',
                price: 180000,
                qtyOnHand: 30,
                unit: 'pcs',
                description: 'Comfortable cotton dress for everyday wear',
                defaultTarget: 8
            },
            {
                name: 'Elegant Abaya',
                code: 'ABY-ELG-001',
                materialId: materials[2] ? materials[2].id : materials[0].id,
                category: 'Abaya',
                price: 320000,
                qtyOnHand: 25,
                unit: 'pcs',
                description: 'Elegant abaya with modern design',
                defaultTarget: 5
            },
            {
                name: 'Modest Blouse',
                code: 'BLS-MOD-001',
                materialId: materials[3] ? materials[3].id : materials[0].id,
                category: 'Blouse',
                price: 150000,
                qtyOnHand: 40,
                unit: 'pcs',
                description: 'Modest and comfortable blouse for professional wear',
                defaultTarget: 12
            },
            {
                name: 'Flowing Skirt',
                code: 'SKT-FLW-001',
                materialId: materials[4] ? materials[4].id : materials[0].id,
                category: 'Skirt',
                price: 120000,
                qtyOnHand: 35,
                unit: 'pcs',
                description: 'Beautiful flowing skirt for modest fashion',
                defaultTarget: 15
            },
            {
                name: 'Classic Pants',
                code: 'PNT-CLS-001',
                materialId: null, // No base material
                category: 'Pants',
                price: 135000,
                qtyOnHand: 28,
                unit: 'pcs',
                description: 'Classic modest pants suitable for various occasions',
                defaultTarget: 10
            }
        ];

        // Create products
        const createdProducts = [];
        for (const productData of productsData) {
            try {
                const product = await Product.create(productData);
                createdProducts.push(product);
                console.log(`✓ Created product: ${product.name} (Code: ${product.code})`);
            } catch (error) {
                console.error(`✗ Failed to create product ${productData.name}:`, error.message);
            }
        }

        // Add colours for products
        const colourData = [
            // Hijab colours
            { productId: createdProducts[0]?.id, code: 'BLK', colourName: 'Black', notes: 'Classic black color' },
            { productId: createdProducts[0]?.id, code: 'NVY', colourName: 'Navy Blue', notes: 'Deep navy blue' },
            { productId: createdProducts[0]?.id, code: 'CRM', colourName: 'Cream', notes: 'Soft cream color' },
            { productId: createdProducts[0]?.id, code: 'RSG', colourName: 'Rose Gold', notes: 'Elegant rose gold' },
            
            // Dress colours
            { productId: createdProducts[1]?.id, code: 'BRN', colourName: 'Brown', notes: 'Earth tone brown' },
            { productId: createdProducts[1]?.id, code: 'GRY', colourName: 'Grey', notes: 'Neutral grey' },
            { productId: createdProducts[1]?.id, code: 'BLU', colourName: 'Blue', notes: 'Fresh blue color' },
            
            // Abaya colours
            { productId: createdProducts[2]?.id, code: 'BLK', colourName: 'Black', notes: 'Traditional black' },
            { productId: createdProducts[2]?.id, code: 'DRK', colourName: 'Dark Grey', notes: 'Sophisticated dark grey' },
            
            // Blouse colours
            { productId: createdProducts[3]?.id, code: 'WHT', colourName: 'White', notes: 'Pure white' },
            { productId: createdProducts[3]?.id, code: 'BEG', colourName: 'Beige', notes: 'Neutral beige' },
            { productId: createdProducts[3]?.id, code: 'LBL', colourName: 'Light Blue', notes: 'Soft light blue' },
            
            // Skirt colours
            { productId: createdProducts[4]?.id, code: 'PNK', colourName: 'Pink', notes: 'Soft pink' },
            { productId: createdProducts[4]?.id, code: 'LVD', colourName: 'Lavender', notes: 'Gentle lavender' },
            
            // Pants colours
            { productId: createdProducts[5]?.id, code: 'BLK', colourName: 'Black', notes: 'Classic black' },
            { productId: createdProducts[5]?.id, code: 'NVY', colourName: 'Navy', notes: 'Navy blue' },
            { productId: createdProducts[5]?.id, code: 'KHK', colourName: 'Khaki', notes: 'Casual khaki' }
        ];

        for (const colour of colourData) {
            if (colour.productId) {
                try {
                    await ProductColour.create(colour);
                    console.log(`  ✓ Added colour ${colour.colourName} (${colour.code}) to product ${colour.productId}`);
                } catch (error) {
                    console.error(`  ✗ Failed to add colour ${colour.colourName}:`, error.message);
                }
            }
        }

        // Add variations (sizes) for products
        const variationData = [
            // Standard sizes for most products
            { productId: createdProducts[0]?.id, code: 'S', size: 'Small', additionalPrice: 0 },
            { productId: createdProducts[0]?.id, code: 'M', size: 'Medium', additionalPrice: 0 },
            { productId: createdProducts[0]?.id, code: 'L', size: 'Large', additionalPrice: 5000 },
            { productId: createdProducts[0]?.id, code: 'XL', size: 'Extra Large', additionalPrice: 10000 },
            
            { productId: createdProducts[1]?.id, code: 'S', size: 'Small', additionalPrice: 0 },
            { productId: createdProducts[1]?.id, code: 'M', size: 'Medium', additionalPrice: 0 },
            { productId: createdProducts[1]?.id, code: 'L', size: 'Large', additionalPrice: 8000 },
            { productId: createdProducts[1]?.id, code: 'XL', size: 'Extra Large', additionalPrice: 15000 },
            
            { productId: createdProducts[2]?.id, code: 'S', size: 'Small', additionalPrice: 0 },
            { productId: createdProducts[2]?.id, code: 'M', size: 'Medium', additionalPrice: 0 },
            { productId: createdProducts[2]?.id, code: 'L', size: 'Large', additionalPrice: 12000 },
            { productId: createdProducts[2]?.id, code: 'XL', size: 'Extra Large', additionalPrice: 20000 },
            
            { productId: createdProducts[3]?.id, code: 'S', size: 'Small', additionalPrice: 0 },
            { productId: createdProducts[3]?.id, code: 'M', size: 'Medium', additionalPrice: 0 },
            { productId: createdProducts[3]?.id, code: 'L', size: 'Large', additionalPrice: 6000 },
            
            { productId: createdProducts[4]?.id, code: 'S', size: 'Small', additionalPrice: 0 },
            { productId: createdProducts[4]?.id, code: 'M', size: 'Medium', additionalPrice: 0 },
            { productId: createdProducts[4]?.id, code: 'L', size: 'Large', additionalPrice: 7000 },
            
            { productId: createdProducts[5]?.id, code: 'S', size: 'Small', additionalPrice: 0 },
            { productId: createdProducts[5]?.id, code: 'M', size: 'Medium', additionalPrice: 0 },
            { productId: createdProducts[5]?.id, code: 'L', size: 'Large', additionalPrice: 5000 },
            { productId: createdProducts[5]?.id, code: 'XL', size: 'Extra Large', additionalPrice: 10000 }
        ];

        for (const variation of variationData) {
            if (variation.productId) {
                try {
                    await ProductVariation.create(variation);
                    console.log(`  ✓ Added variation ${variation.size} (${variation.code}) to product ${variation.productId}`);
                } catch (error) {
                    console.error(`  ✗ Failed to add variation ${variation.size}:`, error.message);
                }
            }
        }

        console.log('\n✅ Enhanced Products data seeding completed!');
        
        // Display summary
        const totalProducts = await Product.count();
        const totalColours = await ProductColour.count();
        const totalVariations = await ProductVariation.count();
        
        console.log(`📊 Database summary:`);
        console.log(`  • Products: ${totalProducts}`);
        console.log(`  • Product Colours: ${totalColours}`);
        console.log(`  • Product Variations: ${totalVariations}`);
        
        // Show sample products with relationships
        console.log('\n📋 Sample products with relationships:');
        const sampleProducts = await Product.findAll({ 
            limit: 3,
            include: [
                { model: Material, attributes: ['name', 'code'] },
                { model: ProductColour, as: 'colours', attributes: ['code', 'colourName'] },
                { model: ProductVariation, as: 'variations', attributes: ['code', 'size', 'additionalPrice'] }
            ]
        });
        
        sampleProducts.forEach(product => {
            console.log(`\n  🛍️  ${product.name} (${product.code})`);
            console.log(`      Category: ${product.category || 'None'}`);
            console.log(`      Base Material: ${product.Material ? product.Material.name : 'None'}`);
            console.log(`      Price: ${product.price ? `IDR ${product.price.toLocaleString()}` : 'Not set'}`);
            console.log(`      Colours: ${product.colours.map(c => c.colourName).join(', ')}`);
            console.log(`      Sizes: ${product.variations.map(v => v.size).join(', ')}`);
        });

    } catch (error) {
        console.error('❌ Error seeding products data:', error);
    } finally {
        await sequelize.close();
    }
}

// Run the seeder
seedProductsData(); 