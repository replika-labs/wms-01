const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

// Helper function to generate material code for seeding
const generateMaterialCode = (totalUnits, materialName) => {
    // Generate 3 random alphabets
    const randomAlphabets = Array.from({ length: 3 }, () =>
        String.fromCharCode(65 + Math.floor(Math.random() * 26))
    ).join('')

    // Get current date in YYYYMMDD format
    const currentDate = new Date().toISOString().slice(0, 10).replace(/-/g, '')

    // Clean material name (remove spaces, special characters, limit to 6 chars)
    const cleanMaterialName = (materialName || 'UNKNOWN')
        .replace(/[^A-Z0-9]/gi, '')
        .toUpperCase()
        .slice(0, 6) || 'UNKNWN'

    // Format: [3 RANDOM ALPHABET]-[TOTAL_UNITS]-[MATERIAL_NAME]-[DATE_YYYYMMDD]
    return `${randomAlphabets}-${totalUnits}-${cleanMaterialName}-${currentDate}`
}

async function main() {
    console.log('Starting furniture WMS database seeding...')

    try {
        // Create admin user
        const hashedPassword = await bcrypt.hash('admin123', 10)

        const adminUser = await prisma.user.upsert({
            where: { email: 'admin@furniwms.com' },
            update: {},
            create: {
                name: 'Furniture Store Administrator',
                email: 'admin@furniwms.com',
                passwordHash: hashedPassword,
                role: 'ADMIN',
                phone: '+62812345678',
                whatsappPhone: '+62812345678',
                isActive: true,
                loginEnabled: true
            }
        })

        console.log('✓ Admin user created:', adminUser.email)

        // Create operator user
        const operatorUser = await prisma.user.upsert({
            where: { email: 'operator@furniwms.com' },
            update: {},
            create: {
                name: 'Warehouse Operator',
                email: 'operator@furniwms.com',
                passwordHash: hashedPassword,
                role: 'OPERATOR',
                phone: '+62812345679',
                whatsappPhone: '+62812345679',
                isActive: true,
                loginEnabled: true
            }
        })

        console.log('✓ Operator user created:', operatorUser.email)

        // Create furniture-related materials with purchase history
        const materialData = [
            {
                material: {
                    name: 'Solid Oak Wood',
                    description: 'Premium solid oak wood for high-end furniture',
                    code: generateMaterialCode(500, 'Oak Wood'),
                    unit: 'board_feet',
                    qtyOnHand: 500.0,
                    minStock: 50.0,
                    maxStock: 1000.0,
                    reorderPoint: 100.0,
                    reorderQty: 250.0,
                    location: 'Wood Storage A1',
                    attributeType: 'Wood',
                    attributeValue: 'Oak'
                },
                purchases: [
                    {
                        supplier: 'Premium Timber Indonesia',
                        quantity: 300.0,
                        pricePerUnit: 150000,
                        purchaseDate: new Date('2024-01-15'),
                        status: 'RECEIVED'
                    },
                    {
                        supplier: 'Premium Timber Indonesia',
                        quantity: 200.0,
                        pricePerUnit: 155000,
                        purchaseDate: new Date('2024-02-10'),
                        status: 'RECEIVED'
                    }
                ]
            },
            {
                material: {
                    name: 'Teak Wood',
                    description: 'High-quality teak wood for outdoor furniture',
                    code: generateMaterialCode(300, 'Teak Wood'),
                    unit: 'board_feet',
                    qtyOnHand: 300.0,
                    minStock: 30.0,
                    maxStock: 600.0,
                    reorderPoint: 60.0,
                    reorderQty: 150.0,
                    location: 'Wood Storage A2',
                    attributeType: 'Wood',
                    attributeValue: 'Teak'
                },
                purchases: [
                    {
                        supplier: 'Jepara Wood Supplier',
                        quantity: 200.0,
                        pricePerUnit: 180000,
                        purchaseDate: new Date('2024-01-20'),
                        status: 'RECEIVED'
                    },
                    {
                        supplier: 'Jepara Wood Supplier',
                        quantity: 100.0,
                        pricePerUnit: 185000,
                        purchaseDate: new Date('2024-02-05'),
                        status: 'RECEIVED'
                    }
                ]
            },
            {
                material: {
                    name: 'Premium Leather',
                    description: 'High-grade leather for upholstery',
                    code: generateMaterialCode(200, 'Leather'),
                    unit: 'sqft',
                    qtyOnHand: 200.0,
                    minStock: 20.0,
                    maxStock: 400.0,
                    reorderPoint: 40.0,
                    reorderQty: 100.0,
                    location: 'Material Storage B1',
                    attributeType: 'Upholstery',
                    attributeValue: 'Leather'
                },
                purchases: [
                    {
                        supplier: 'Luxury Leather Co.',
                        quantity: 200.0,
                        pricePerUnit: 250000,
                        purchaseDate: new Date('2024-01-25'),
                        status: 'RECEIVED'
                    }
                ]
            },
            {
                material: {
                    name: 'High-Density Foam',
                    description: 'Premium foam for comfortable seating',
                    code: generateMaterialCode(150, 'HD Foam'),
                    unit: 'sheets',
                    qtyOnHand: 150.0,
                    minStock: 15.0,
                    maxStock: 300.0,
                    reorderPoint: 30.0,
                    reorderQty: 75.0,
                    location: 'Material Storage B2',
                    attributeType: 'Upholstery',
                    attributeValue: 'Foam'
                },
                purchases: [
                    {
                        supplier: 'Foam Industries',
                        quantity: 150.0,
                        pricePerUnit: 120000,
                        purchaseDate: new Date('2024-01-30'),
                        status: 'RECEIVED'
                    }
                ]
            },
            {
                material: {
                    name: 'Stainless Steel Legs',
                    description: 'Premium stainless steel furniture legs',
                    code: generateMaterialCode(1000, 'Steel Legs'),
                    unit: 'sets',
                    qtyOnHand: 1000.0,
                    minStock: 100.0,
                    maxStock: 2000.0,
                    reorderPoint: 200.0,
                    reorderQty: 500.0,
                    location: 'Hardware Storage C1',
                    attributeType: 'Hardware',
                    attributeValue: 'Legs'
                },
                purchases: [
                    {
                        supplier: 'Metal Hardware Supplier',
                        quantity: 600.0,
                        pricePerUnit: 75000,
                        purchaseDate: new Date('2024-02-01'),
                        status: 'RECEIVED'
                    },
                    {
                        supplier: 'Metal Hardware Supplier',
                        quantity: 400.0,
                        pricePerUnit: 78000,
                        purchaseDate: new Date('2024-02-15'),
                        status: 'RECEIVED'
                    }
                ]
            },
            {
                material: {
                    name: 'Premium Hinges',
                    description: 'High-quality furniture hinges',
                    code: generateMaterialCode(2000, 'Hinges'),
                    unit: 'pairs',
                    qtyOnHand: 2000.0,
                    minStock: 200.0,
                    maxStock: 4000.0,
                    reorderPoint: 400.0,
                    reorderQty: 1000.0,
                    location: 'Hardware Storage C2',
                    attributeType: 'Hardware',
                    attributeValue: 'Hinges'
                },
                purchases: [
                    {
                        supplier: 'Metal Hardware Supplier',
                        quantity: 2000.0,
                        pricePerUnit: 25000,
                        purchaseDate: new Date('2024-02-05'),
                        status: 'RECEIVED'
                    }
                ]
            },
            {
                material: {
                    name: 'Glass Panels',
                    description: 'Tempered glass for table tops and cabinets',
                    code: generateMaterialCode(100, 'Glass'),
                    unit: 'panels',
                    qtyOnHand: 100.0,
                    minStock: 10.0,
                    maxStock: 200.0,
                    reorderPoint: 20.0,
                    reorderQty: 50.0,
                    location: 'Glass Storage D1',
                    attributeType: 'Glass',
                    attributeValue: 'Tempered'
                },
                purchases: [
                    {
                        supplier: 'Glass Solutions Co.',
                        quantity: 100.0,
                        pricePerUnit: 350000,
                        purchaseDate: new Date('2024-02-08'),
                        status: 'RECEIVED'
                    }
                ]
            },
            {
                material: {
                    name: 'Premium Wood Finish',
                    description: 'High-quality wood finish and sealant',
                    code: generateMaterialCode(500, 'Wood Finish'),
                    unit: 'liters',
                    qtyOnHand: 500.0,
                    minStock: 50.0,
                    maxStock: 1000.0,
                    reorderPoint: 100.0,
                    reorderQty: 250.0,
                    location: 'Finishing Storage E1',
                    attributeType: 'Finishing',
                    attributeValue: 'Wood Finish'
                },
                purchases: [
                    {
                        supplier: 'Finishing Materials Ltd.',
                        quantity: 500.0,
                        pricePerUnit: 85000,
                        purchaseDate: new Date('2024-02-12'),
                        status: 'RECEIVED'
                    }
                ]
            }
        ]

        // Create materials and their purchase history
        for (const { material, purchases } of materialData) {
            const existingMaterial = await prisma.material.findFirst({
                where: { name: material.name }
            })

            let createdMaterial;
            if (!existingMaterial) {
                createdMaterial = await prisma.material.create({
                    data: material
                })
            } else {
                createdMaterial = existingMaterial;
            }

            // Create purchase logs for this material
            for (const purchase of purchases) {
                const existingPurchase = await prisma.purchaseLog.findFirst({
                    where: {
                        materialId: createdMaterial.id,
                        supplier: purchase.supplier,
                        purchaseDate: purchase.purchaseDate
                    }
                })

                if (!existingPurchase) {
                    await prisma.purchaseLog.create({
                        data: {
                            materialId: createdMaterial.id,
                            supplier: purchase.supplier,
                            quantity: purchase.quantity,
                            unit: material.unit,
                            pricePerUnit: purchase.pricePerUnit,
                            totalCost: purchase.quantity * purchase.pricePerUnit,
                            purchaseDate: purchase.purchaseDate,
                            status: purchase.status,
                            invoiceNumber: `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                            notes: `Sample purchase data for ${material.name}`
                        }
                    })

                    // Create corresponding material movement for received purchases
                    if (purchase.status === 'RECEIVED') {
                        await prisma.materialMovement.create({
                            data: {
                                materialId: createdMaterial.id,
                                userId: adminUser.id,
                                movementType: 'IN',
                                quantity: purchase.quantity,
                                unit: material.unit,
                                costPerUnit: purchase.pricePerUnit,
                                totalCost: purchase.quantity * purchase.pricePerUnit,
                                notes: `Stock in from purchase - ${purchase.supplier}`,
                                qtyAfter: createdMaterial.qtyOnHand,
                                movementDate: purchase.purchaseDate
                            }
                        })
                    }
                }
            }
        }

        console.log('✓ Furniture materials and purchase history created')

        // Create furniture products
        const oakWood = await prisma.material.findFirst({ where: { name: 'Solid Oak Wood' } })
        const teakWood = await prisma.material.findFirst({ where: { name: 'Teak Wood' } })
        const leather = await prisma.material.findFirst({ where: { name: 'Premium Leather' } })
        const foam = await prisma.material.findFirst({ where: { name: 'High-Density Foam' } })

        const products = [
            {
                name: 'Oak Dining Table',
                code: 'FRN-TBL-001',
                materialId: oakWood?.id,
                category: 'Dining Furniture',
                price: 4500000,
                unit: 'pcs',
                description: 'Elegant solid oak dining table with premium finish',
                defaultTarget: 10
            },
            {
                name: 'Teak Outdoor Chair',
                code: 'FRN-CHR-001',
                materialId: teakWood?.id,
                category: 'Outdoor Furniture',
                price: 1500000,
                unit: 'pcs',
                description: 'Weather-resistant teak wood outdoor chair',
                defaultTarget: 24
            },
            {
                name: 'Leather Sofa',
                code: 'FRN-SOF-001',
                materialId: leather?.id,
                category: 'Living Room',
                price: 8500000,
                unit: 'pcs',
                description: 'Premium leather sofa with high-density foam cushioning',
                defaultTarget: 8
            },
            {
                name: 'Oak Bed Frame',
                code: 'FRN-BED-001',
                materialId: oakWood?.id,
                category: 'Bedroom',
                price: 6500000,
                unit: 'pcs',
                description: 'Solid oak king-size bed frame with storage',
                defaultTarget: 5
            },
            {
                name: 'Teak Wardrobe',
                code: 'FRN-WRD-001',
                materialId: teakWood?.id,
                category: 'Bedroom',
                price: 7500000,
                unit: 'pcs',
                description: 'Spacious teak wood wardrobe with mirror',
                defaultTarget: 4
            },
            {
                name: 'Leather Ottoman',
                code: 'FRN-OTM-001',
                materialId: leather?.id,
                category: 'Living Room',
                price: 2500000,
                unit: 'pcs',
                description: 'Versatile leather ottoman with storage',
                defaultTarget: 12
            }
        ]

        for (const product of products) {
            await prisma.product.upsert({
                where: { code: product.code },
                update: {},
                create: product
            })
        }

        console.log('✓ Furniture products created')

        // Create furniture-specific colors
        const productColors = [
            // Wood finishes
            { colorName: 'Natural Oak', colorCode: 'NOAK' },
            { colorName: 'Dark Oak', colorCode: 'DOAK' },
            { colorName: 'Golden Oak', colorCode: 'GOAK' },
            { colorName: 'Natural Teak', colorCode: 'NTEK' },
            { colorName: 'Dark Teak', colorCode: 'DTEK' },
            { colorName: 'Walnut', colorCode: 'WLNT' },
            { colorName: 'Mahogany', colorCode: 'MHGN' },
            { colorName: 'Espresso', colorCode: 'ESPR' },
            { colorName: 'Ebony', colorCode: 'EBNY' },
            { colorName: 'Whitewash', colorCode: 'WWSH' },
            { colorName: 'Driftwood', colorCode: 'DRFT' },
            { colorName: 'Gray Wash', colorCode: 'GWSH' },

            // Leather colors
            { colorName: 'Black Leather', colorCode: 'BLTHR' },
            { colorName: 'Brown Leather', colorCode: 'BRLTHR' },
            { colorName: 'Tan Leather', colorCode: 'TLTHR' },
            { colorName: 'Cognac Leather', colorCode: 'CGLTHR' },
            { colorName: 'Navy Leather', colorCode: 'NVLTHR' },
            { colorName: 'Burgundy Leather', colorCode: 'BGLTHR' },

            // Fabric colors
            { colorName: 'Charcoal Gray', colorCode: 'CGRY' },
            { colorName: 'Navy Blue', colorCode: 'NVBL' },
            { colorName: 'Cream', colorCode: 'CREM' },
            { colorName: 'Beige', colorCode: 'BEIG' },
            { colorName: 'Sage Green', colorCode: 'SGRN' },
            { colorName: 'Slate Blue', colorCode: 'SLBL' }
        ];

        // Create furniture-specific variations
        const productVariations = [
            // Table sizes
            { variationType: 'Size', variationValue: '4-Seater (120x80 cm)' },
            { variationType: 'Size', variationValue: '6-Seater (150x90 cm)' },
            { variationType: 'Size', variationValue: '8-Seater (180x100 cm)' },
            { variationType: 'Size', variationValue: '10-Seater (220x110 cm)' },

            // Bed sizes
            { variationType: 'Size', variationValue: 'Single (90x200 cm)' },
            { variationType: 'Size', variationValue: 'Super Single (120x200 cm)' },
            { variationType: 'Size', variationValue: 'Queen (160x200 cm)' },
            { variationType: 'Size', variationValue: 'King (180x200 cm)' },
            { variationType: 'Size', variationValue: 'Super King (200x200 cm)' },

            // Sofa configurations
            { variationType: 'Configuration', variationValue: '1-Seater' },
            { variationType: 'Configuration', variationValue: '2-Seater' },
            { variationType: 'Configuration', variationValue: '3-Seater' },
            { variationType: 'Configuration', variationValue: 'L-Shape Right' },
            { variationType: 'Configuration', variationValue: 'L-Shape Left' },
            { variationType: 'Configuration', variationValue: 'U-Shape' },

            // Wardrobe sizes
            { variationType: 'Size', variationValue: '2-Door (120x60x200 cm)' },
            { variationType: 'Size', variationValue: '3-Door (180x60x200 cm)' },
            { variationType: 'Size', variationValue: '4-Door (240x60x200 cm)' },

            // Styles
            { variationType: 'Style', variationValue: 'Modern' },
            { variationType: 'Style', variationValue: 'Contemporary' },
            { variationType: 'Style', variationValue: 'Traditional' },
            { variationType: 'Style', variationValue: 'Rustic' },
            { variationType: 'Style', variationValue: 'Industrial' },
            { variationType: 'Style', variationValue: 'Scandinavian' },
            { variationType: 'Style', variationValue: 'Mid-Century Modern' },

            // Features
            { variationType: 'Feature', variationValue: 'With Storage' },
            { variationType: 'Feature', variationValue: 'With LED Lights' },
            { variationType: 'Feature', variationValue: 'With Mirror' },
            { variationType: 'Feature', variationValue: 'Extendable' },
            { variationType: 'Feature', variationValue: 'Reclining' },
            { variationType: 'Feature', variationValue: 'Swivel' }
        ];

        // Create standalone colors and variations
        for (const color of productColors) {
            const existingColor = await prisma.productColour.findFirst({
                where: {
                    colorName: color.colorName,
                    colorCode: color.colorCode
                }
            });

            if (!existingColor) {
                await prisma.productColour.create({
                    data: {
                        colorName: color.colorName,
                        colorCode: color.colorCode,
                        isActive: true
                    }
                });
            }
        }

        for (const variation of productVariations) {
            const existingVariation = await prisma.productVariation.findFirst({
                where: {
                    variationType: variation.variationType,
                    variationValue: variation.variationValue
                }
            });

            if (!existingVariation) {
                await prisma.productVariation.create({
                    data: {
                        variationType: variation.variationType,
                        variationValue: variation.variationValue,
                        priceAdjustment: Math.random() > 0.8 ? (Math.random() * 25000) : null, // 20% chance of price adjustment
                        isActive: true
                    }
                });
            }
        }

        // Update existing products to reference colors and variations
        const existingProducts = await prisma.product.findMany({
            where: { isActive: true }
        });

        const allColors = await prisma.productColour.findMany();
        const allVariations = await prisma.productVariation.findMany();

        for (const product of existingProducts) {
            // Assign random color and variation to existing products
            const randomColor = allColors[Math.floor(Math.random() * allColors.length)];
            const randomVariation = allVariations[Math.floor(Math.random() * allVariations.length)];

            await prisma.product.update({
                where: { id: product.id },
                data: {
                    productColorId: randomColor.id,
                    productVariationId: randomVariation.id
                }
            });
        }

        console.log('✓ Furniture colors and variations created')

        // Create furniture-related contacts
        const contacts = [
            {
                name: 'Budi Santoso',
                phone: '+628123456789',
                whatsappPhone: '+628123456789',
                email: 'budi.santoso@furniwms.com',
                contactType: 'WORKER',
                company: 'Furniture Production Team',
                notes: 'Master carpenter and quality control supervisor'
            },
            {
                name: 'Premium Timber Indonesia',
                phone: '+62215551234',
                email: 'orders@premiumtimber.co.id',
                contactType: 'SUPPLIER',
                company: 'Premium Timber Indonesia',
                address: 'Jl. Industri Kayu No. 123, Semarang, Jawa Tengah'
            },
            {
                name: 'Jepara Wood Supplier',
                phone: '+62215551235',
                email: 'sales@jeparawood.co.id',
                contactType: 'SUPPLIER',
                company: 'Jepara Wood Supplier',
                address: 'Jl. Ukir Jepara No. 45, Jepara, Jawa Tengah'
            },
            {
                name: 'Luxury Leather Co.',
                phone: '+62215551236',
                email: 'info@luxuryleather.co.id',
                contactType: 'SUPPLIER',
                company: 'Luxury Leather Co.',
                address: 'Jl. Kulit Premium No. 78, Jakarta Pusat'
            },
            {
                name: 'Modern Living Furniture',
                phone: '+62215551237',
                email: 'order@modernliving.com',
                contactType: 'CUSTOMER',
                company: 'Modern Living Furniture',
                address: 'Jl. Interior Modern No. 90, Jakarta Selatan'
            },
            {
                name: 'Home & Living Store',
                phone: '+62215551238',
                email: 'procurement@homeandliving.com',
                contactType: 'CUSTOMER',
                company: 'Home & Living Store',
                address: 'Jl. Furniture No. 12, Surabaya, Jawa Timur'
            },
            {
                name: 'Ahmad Wijaya',
                phone: '+628123456790',
                whatsappPhone: '+628123456790',
                email: 'ahmad.wijaya@furniwms.com',
                contactType: 'WORKER',
                company: 'Furniture Design Team',
                notes: 'Senior furniture designer specializing in modern and contemporary styles'
            },
            {
                name: 'Metal Hardware Supplier',
                phone: '+62215551239',
                email: 'sales@metalhardware.co.id',
                contactType: 'SUPPLIER',
                company: 'Metal Hardware Supplier',
                address: 'Jl. Logam Industri No. 34, Tangerang'
            }
        ]

        for (const contact of contacts) {
            const existingContact = await prisma.contact.findFirst({
                where: { name: contact.name }
            })

            if (!existingContact) {
                await prisma.contact.create({
                    data: contact
                })
            }
        }

        console.log('✓ Furniture-related contacts created')

        // Create furniture-specific inventory items only
        const inventarisItems = [
            {
                name: 'Industrial Wood Cutting Machines',
                quantity: 3,
                unit: 'units',
                notes: 'Heavy-duty machines for precise wood cutting'
            },
            {
                name: 'Assembly Workbenches',
                quantity: 8,
                unit: 'units',
                notes: 'Large workbenches for furniture assembly'
            },
            {
                name: 'Power Tools Set',
                quantity: 15,
                unit: 'sets',
                notes: 'Complete sets of power tools including drills, sanders, and saws'
            },
            {
                name: 'Furniture Packaging Materials',
                quantity: 200,
                unit: 'sets',
                notes: 'Heavy-duty packaging materials including bubble wrap, cardboard, and corner protectors'
            },
            {
                name: 'Spray Painting Booth',
                quantity: 2,
                unit: 'units',
                notes: 'Professional spray booths for furniture finishing'
            },
            {
                name: 'Material Handling Equipment',
                quantity: 5,
                unit: 'units',
                notes: 'Forklifts and pallet jacks for moving heavy furniture'
            }
        ]

        for (const item of inventarisItems) {
            const existingItem = await prisma.inventaris.findFirst({
                where: { name: item.name }
            })

            if (!existingItem) {
                await prisma.inventaris.create({
                    data: item
                })
            }
        }

        console.log('✓ Furniture-specific inventory items created')

        console.log('Furniture WMS database seeding completed successfully!')

    } catch (error) {
        console.error('Error during seeding:', error)
        throw error
    }
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    }) 