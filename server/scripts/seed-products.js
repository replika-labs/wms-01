const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const sampleProducts = [
    {
        name: 'Basic T-Shirt',
        code: 'TSH-001',
        category: 'Clothing',
        price: 75000,
        unit: 'pcs',
        description: 'Basic cotton t-shirt with various colors',
        defaultTarget: 50,
        qtyOnHand: 25,
        colours: [
            { colorName: 'White', colorCode: '#FFFFFF' },
            { colorName: 'Black', colorCode: '#000000' },
            { colorName: 'Navy', colorCode: '#000080' }
        ],
        variations: [
            { variationType: 'Size', variationValue: 'Small (S)', priceAdjustment: 0 },
            { variationType: 'Size', variationValue: 'Medium (M)', priceAdjustment: 5000 },
            { variationType: 'Size', variationValue: 'Large (L)', priceAdjustment: 10000 },
            { variationType: 'Size', variationValue: 'Extra Large (XL)', priceAdjustment: 15000 }
        ]
    },
    {
        name: 'Polo Shirt',
        code: 'POL-001',
        category: 'Clothing',
        price: 120000,
        unit: 'pcs',
        description: 'Premium polo shirt with collar',
        defaultTarget: 30,
        qtyOnHand: 15,
        colours: [
            { colorName: 'Navy Blue', colorCode: '#000080' },
            { colorName: 'Forest Green', colorCode: '#228B22' },
            { colorName: 'Maroon', colorCode: '#800000' }
        ],
        variations: [
            { variationType: 'Size', variationValue: 'Small (S)', priceAdjustment: 0 },
            { variationType: 'Size', variationValue: 'Medium (M)', priceAdjustment: 10000 },
            { variationType: 'Size', variationValue: 'Large (L)', priceAdjustment: 20000 }
        ]
    },
    {
        name: 'Cotton Hoodie',
        code: 'HOD-001',
        category: 'Clothing',
        price: 180000,
        unit: 'pcs',
        description: 'Comfortable cotton hoodie with drawstring',
        defaultTarget: 20,
        qtyOnHand: 8,
        colours: [
            { colorName: 'Heather Gray', colorCode: '#D3D3D3' },
            { colorName: 'Black', colorCode: '#000000' },
            { colorName: 'Navy', colorCode: '#000080' }
        ],
        variations: [
            { variationType: 'Size', variationValue: 'Medium (M)', priceAdjustment: 0 },
            { variationType: 'Size', variationValue: 'Large (L)', priceAdjustment: 15000 },
            { variationType: 'Size', variationValue: 'Extra Large (XL)', priceAdjustment: 25000 }
        ]
    },
    {
        name: 'Denim Jeans',
        code: 'JNS-001',
        category: 'Clothing',
        price: 250000,
        unit: 'pcs',
        description: 'Classic blue denim jeans',
        defaultTarget: 25,
        qtyOnHand: 12,
        colours: [
            { colorName: 'Classic Blue', colorCode: '#4169E1' },
            { colorName: 'Dark Wash', colorCode: '#191970' },
            { colorName: 'Light Wash', colorCode: '#87CEEB' }
        ],
        variations: [
            { variationType: 'Size', variationValue: '28', priceAdjustment: 0 },
            { variationType: 'Size', variationValue: '30', priceAdjustment: 0 },
            { variationType: 'Size', variationValue: '32', priceAdjustment: 0 },
            { variationType: 'Size', variationValue: '34', priceAdjustment: 0 },
            { variationType: 'Size', variationValue: '36', priceAdjustment: 5000 }
        ]
    },
    {
        name: 'Sports Cap',
        code: 'CAP-001',
        category: 'Accessories',
        price: 85000,
        unit: 'pcs',
        description: 'Adjustable sports cap with embroidered logo',
        defaultTarget: 40,
        qtyOnHand: 20,
        colours: [
            { colorName: 'Black', colorCode: '#000000' },
            { colorName: 'White', colorCode: '#FFFFFF' },
            { colorName: 'Red', colorCode: '#FF0000' },
            { colorName: 'Blue', colorCode: '#0000FF' }
        ],
        variations: [
            { variationType: 'Fit', variationValue: 'Regular', priceAdjustment: 0 },
            { variationType: 'Fit', variationValue: 'Snapback', priceAdjustment: 10000 }
        ]
    },
    {
        name: 'Canvas Tote Bag',
        code: 'BAG-001',
        category: 'Accessories',
        price: 95000,
        unit: 'pcs',
        description: 'Eco-friendly canvas tote bag',
        defaultTarget: 35,
        qtyOnHand: 18,
        colours: [
            { colorName: 'Natural', colorCode: '#F5F5DC' },
            { colorName: 'Black', colorCode: '#000000' },
            { colorName: 'Navy', colorCode: '#000080' }
        ],
        variations: [
            { variationType: 'Size', variationValue: 'Small', priceAdjustment: -10000 },
            { variationType: 'Size', variationValue: 'Medium', priceAdjustment: 0 },
            { variationType: 'Size', variationValue: 'Large', priceAdjustment: 15000 }
        ]
    }
];

async function seedProducts() {
    try {
        console.log('🌱 Starting products seeding...');

        // Check if products already exist
        const existingProducts = await prisma.product.findMany({
            where: {
                code: {
                    in: sampleProducts.map(p => p.code)
                }
            }
        });

        if (existingProducts.length > 0) {
            console.log(`⚠️  Found ${existingProducts.length} existing products with similar codes`);
            console.log('Existing codes:', existingProducts.map(p => p.code));

            const proceed = process.argv.includes('--force');
            if (!proceed) {
                console.log('Use --force flag to overwrite existing products');
                return;
            }

            // Delete existing products and their relations
            await prisma.productVariation.deleteMany({
                where: { productId: { in: existingProducts.map(p => p.id) } }
            });
            await prisma.productColour.deleteMany({
                where: { productId: { in: existingProducts.map(p => p.id) } }
            });
            await prisma.product.deleteMany({
                where: { id: { in: existingProducts.map(p => p.id) } }
            });
            console.log('🗑️  Deleted existing products');
        }

        // Create products with relations
        for (const productData of sampleProducts) {
            const { colours, variations, ...productFields } = productData;

            console.log(`Creating product: ${productFields.name}`);

            const product = await prisma.product.create({
                data: {
                    ...productFields,
                    isActive: true
                }
            });

            // Create colours
            if (colours && colours.length > 0) {
                await prisma.productColour.createMany({
                    data: colours.map(colour => ({
                        productId: product.id,
                        colorName: colour.colorName,
                        colorCode: colour.colorCode,
                        isActive: true
                    }))
                });
                console.log(`  ✓ Added ${colours.length} colours`);
            }

            // Create variations
            if (variations && variations.length > 0) {
                await prisma.productVariation.createMany({
                    data: variations.map(variation => ({
                        productId: product.id,
                        variationType: variation.variationType,
                        variationValue: variation.variationValue,
                        priceAdjustment: variation.priceAdjustment || 0,
                        isActive: true
                    }))
                });
                console.log(`  ✓ Added ${variations.length} variations`);
            }

            console.log(`  ✅ Product ${product.code} created successfully`);
        }

        console.log('🎉 Products seeding completed successfully!');
        console.log(`📦 Created ${sampleProducts.length} products with colours and variations`);

    } catch (error) {
        console.error('❌ Error seeding products:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run the seeder
if (require.main === module) {
    seedProducts()
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = { seedProducts }; 