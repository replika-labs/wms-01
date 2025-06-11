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
    console.log('Starting database seeding...')

    try {
        // Create admin user
        const hashedPassword = await bcrypt.hash('admin123', 10)

        const adminUser = await prisma.user.upsert({
            where: { email: 'admin@wms.com' },
            update: {},
            create: {
                name: 'Administrator',
                email: 'admin@wms.com',
                passwordHash: hashedPassword,
                role: 'ADMIN',
                phone: '+1234567890',
                whatsappPhone: '+1234567890',
                isActive: true,
                loginEnabled: true
            }
        })

        console.log('✓ Admin user created:', adminUser.email)

        // Create operator user
        const operatorUser = await prisma.user.upsert({
            where: { email: 'operator@wms.com' },
            update: {},
            create: {
                name: 'Warehouse Operator',
                email: 'operator@wms.com',
                passwordHash: hashedPassword,
                role: 'OPERATOR',
                phone: '+1234567891',
                whatsappPhone: '+1234567891',
                isActive: true,
                loginEnabled: true
            }
        })

        console.log('✓ Operator user created:', operatorUser.email)

        // Create sample materials with new schema (without pricePerUnit and supplier)
        const materialData = [
            {
                material: {
                    name: 'Steel Sheets',
                    description: 'High quality steel sheets for manufacturing',
                    code: generateMaterialCode(50, 'Steel Sheets'),
                    unit: 'pcs',
                    qtyOnHand: 50.0,
                    minStock: 5.0,
                    maxStock: 100.0,
                    reorderPoint: 10.0,
                    reorderQty: 25.0,
                    attributeType: 'Raw Materials',
                    attributeValue: 'Steel'
                },
                purchases: [
                    {
                        supplier: 'Steel Supply Co.',
                        quantity: 30.0,
                        pricePerUnit: 25.50,
                        purchaseDate: new Date('2024-01-15'),
                        status: 'RECEIVED'
                    },
                    {
                        supplier: 'Steel Supply Co.',
                        quantity: 20.0,
                        pricePerUnit: 26.00,
                        purchaseDate: new Date('2024-02-10'),
                        status: 'RECEIVED'
                    }
                ]
            },
            {
                material: {
                    name: 'Electronic Components',
                    description: 'Various electronic components and circuits',
                    code: generateMaterialCode(200, 'Electronic Components'),
                    unit: 'pcs',
                    qtyOnHand: 200.0,
                    minStock: 20.0,
                    maxStock: 500.0,
                    reorderPoint: 50.0,
                    reorderQty: 100.0,
                    attributeType: 'Components',
                    attributeValue: 'Electronic'
                },
                purchases: [
                    {
                        supplier: 'Electronics Hub',
                        quantity: 150.0,
                        pricePerUnit: 5.25,
                        purchaseDate: new Date('2024-01-20'),
                        status: 'RECEIVED'
                    },
                    {
                        supplier: 'Electronics Hub',
                        quantity: 50.0,
                        pricePerUnit: 5.00,
                        purchaseDate: new Date('2024-02-05'),
                        status: 'RECEIVED'
                    }
                ]
            },
            {
                material: {
                    name: 'Plastic Housing',
                    description: 'Durable plastic housing units',
                    code: generateMaterialCode(75, 'Plastic Housing'),
                    unit: 'pcs',
                    qtyOnHand: 75.0,
                    minStock: 10.0,
                    maxStock: 150.0,
                    reorderPoint: 20.0,
                    reorderQty: 50.0,
                    attributeType: 'Components',
                    attributeValue: 'Plastic'
                },
                purchases: [
                    {
                        supplier: 'Plastic Manufacturing Ltd.',
                        quantity: 75.0,
                        pricePerUnit: 12.00,
                        purchaseDate: new Date('2024-01-25'),
                        status: 'RECEIVED'
                    }
                ]
            },
            {
                material: {
                    name: 'Aluminum Rods',
                    description: 'High-grade aluminum rods for structural components',
                    code: generateMaterialCode(30, 'Aluminum Rods'),
                    unit: 'pcs',
                    qtyOnHand: 30.0,
                    minStock: 5.0,
                    maxStock: 80.0,
                    reorderPoint: 10.0,
                    reorderQty: 20.0,
                    attributeType: 'Raw Materials',
                    attributeValue: 'Aluminum'
                },
                purchases: [
                    {
                        supplier: 'Metal Works Ltd.',
                        quantity: 30.0,
                        pricePerUnit: 18.75,
                        purchaseDate: new Date('2024-01-30'),
                        status: 'RECEIVED'
                    }
                ]
            },
            {
                material: {
                    name: 'Rubber Gaskets',
                    description: 'Weather-resistant rubber gaskets and seals',
                    code: generateMaterialCode(150, 'Rubber Gaskets'),
                    unit: 'pcs',
                    qtyOnHand: 150.0,
                    minStock: 25.0,
                    maxStock: 300.0,
                    reorderPoint: 40.0,
                    reorderQty: 75.0,
                    attributeType: 'Components',
                    attributeValue: 'Rubber'
                },
                purchases: [
                    {
                        supplier: 'Rubber Solutions',
                        quantity: 100.0,
                        pricePerUnit: 3.50,
                        purchaseDate: new Date('2024-02-01'),
                        status: 'RECEIVED'
                    },
                    {
                        supplier: 'Rubber Solutions',
                        quantity: 50.0,
                        pricePerUnit: 3.25,
                        purchaseDate: new Date('2024-02-15'),
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

        console.log('✓ Sample materials and purchase history created')

        // Create sample products
        const steelSheets = await prisma.material.findFirst({ where: { name: 'Steel Sheets' } })
        const electronicComponents = await prisma.material.findFirst({ where: { name: 'Electronic Components' } })
        const plasticHousing = await prisma.material.findFirst({ where: { name: 'Plastic Housing' } })
        const aluminumRods = await prisma.material.findFirst({ where: { name: 'Aluminum Rods' } })

        const products = [
            {
                name: 'Basic Widget',
                code: 'WIDGET001',
                materialId: steelSheets?.id,
                category: 'Hardware',
                price: 45.00,
                unit: 'pcs',
                description: 'Standard industrial widget made from steel',
                defaultTarget: 20
            },
            {
                name: 'Electronic Device',
                code: 'DEVICE001',
                materialId: electronicComponents?.id,
                category: 'Electronics',
                price: 125.00,
                unit: 'pcs',
                description: 'Multi-purpose electronic device',
                defaultTarget: 10
            },
            {
                name: 'Assembly Kit',
                code: 'KIT001',
                materialId: steelSheets?.id,
                category: 'Kits',
                price: 85.00,
                unit: 'pcs',
                description: 'Complete assembly kit with all components',
                defaultTarget: 15
            },
            {
                name: 'Protective Housing',
                code: 'HOUSING001',
                materialId: plasticHousing?.id,
                category: 'Enclosures',
                price: 65.00,
                unit: 'pcs',
                description: 'Durable plastic protective housing',
                defaultTarget: 25
            },
            {
                name: 'Structural Frame',
                code: 'FRAME001',
                materialId: aluminumRods?.id,
                category: 'Structures',
                price: 95.00,
                unit: 'pcs',
                description: 'Lightweight aluminum structural frame',
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

        console.log('✓ Sample products created')

        // Create sample product colors
        const productColors = [
            // Basic colors
            { colorName: 'Ash Brown', colorCode: 'ASHBR' },
            { colorName: 'Ash Grey', colorCode: 'ASHGR' },
            { colorName: 'Beige', colorCode: 'BEIG' },
            { colorName: 'Burgundy', colorCode: 'BGDY' },
            { colorName: 'Black', colorCode: 'BLCK' },
            { colorName: 'Baby Pink', colorCode: 'BPNK' },
            { colorName: 'Broken White', colorCode: 'BW' },
            { colorName: 'Cloud', colorCode: 'CLD' },
            { colorName: 'Cotton', colorCode: 'CTN' },
            { colorName: 'Dark Ash', colorCode: 'DASH' },
            { colorName: 'Dark Navy', colorCode: 'DNVY' },
            { colorName: 'Dark Olive', colorCode: 'DOLV' },
            { colorName: 'Dusty Pink', colorCode: 'DPNK' },
            { colorName: 'Forest Green', colorCode: 'FGRN' },
            { colorName: 'Grey', colorCode: 'GREY' },
            { colorName: 'Hunter Green', colorCode: 'HGRN' },
            { colorName: 'Ivory', colorCode: 'IVRY' },
            { colorName: 'Khaki', colorCode: 'KHAK' },
            { colorName: 'Light Blue', colorCode: 'LBLU' },
            { colorName: 'Light Grey', colorCode: 'LGRY' },
            { colorName: 'Maroon', colorCode: 'MARN' },
            { colorName: 'Mustard', colorCode: 'MSTD' },
            { colorName: 'Navy', colorCode: 'NAVY' },
            { colorName: 'Nude', colorCode: 'NUDE' },
            { colorName: 'Olive', colorCode: 'OLIV' },
            { colorName: 'Pink', colorCode: 'PINK' },
            { colorName: 'Purple', colorCode: 'PRPL' },
            { colorName: 'Red', colorCode: 'RED' },
            { colorName: 'Sage Green', colorCode: 'SGRN' },
            { colorName: 'Tan', colorCode: 'TAN' },
            { colorName: 'Teal', colorCode: 'TEAL' },
            { colorName: 'White', colorCode: 'WHT' },
            { colorName: 'Wine', colorCode: 'WINE' },
            { colorName: 'Yellow', colorCode: 'YLLOW' }
        ];

        // Create sample product variations (sizes)
        const productVariations = [
            // Standard sizes
            { variationType: 'Size', variationValue: '180x60' },
            { variationType: 'Size', variationValue: '190x70' },
            { variationType: 'Size', variationValue: '200x200' },

            // Additional size variations
            { variationType: 'Size', variationValue: 'XS' },
            { variationType: 'Size', variationValue: 'S' },
            { variationType: 'Size', variationValue: 'M' },
            { variationType: 'Size', variationValue: 'L' },
            { variationType: 'Size', variationValue: 'XL' },
            { variationType: 'Size', variationValue: 'XXL' },

            // Style variations
            { variationType: 'Style', variationValue: 'Regular' },
            { variationType: 'Style', variationValue: 'Slim' },
            { variationType: 'Style', variationValue: 'Loose' },
            { variationType: 'Style', variationValue: 'Oversized' },
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
                        priceAdjustment: Math.random() > 0.7 ? (Math.random() * 20000) : null, // 30% chance of price adjustment
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

        console.log('✓ Sample product colors and variations created')

        // Create sample contacts
        const contacts = [
            {
                name: 'Production Worker A',
                phone: '+1234567891',
                whatsappPhone: '+1234567891',
                email: 'worker.a@company.com',
                contactType: 'WORKER',
                company: 'Internal Production Team',
                notes: 'Experienced production worker'
            },
            {
                name: 'Manufacturing Partner Ltd.',
                phone: '+1234567892',
                email: 'orders@manufacturingpartner.com',
                contactType: 'SUPPLIER',
                company: 'Manufacturing Partner Ltd.',
                address: '123 Industrial Ave, Manufacturing District'
            },
            {
                name: 'Customer Corp',
                phone: '+1234567893',
                email: 'procurement@customercorp.com',
                contactType: 'CUSTOMER',
                company: 'Customer Corp',
                address: '456 Business St, Commercial District'
            },
            {
                name: 'Quality Control Specialist',
                phone: '+1234567894',
                whatsappPhone: '+1234567894',
                email: 'qc.specialist@company.com',
                contactType: 'WORKER',
                company: 'Internal QC Team',
                notes: 'Handles quality assurance and testing'
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

        console.log('✓ Sample contacts created')

        // Create sample inventaris (general inventory items)
        const inventarisItems = [
            {
                name: 'Office Supplies',
                quantity: 50,
                unit: 'pcs',
                notes: 'Various office supplies and stationery'
            },
            {
                name: 'Safety Equipment',
                quantity: 25,
                unit: 'sets',
                notes: 'Safety helmets, gloves, and protective gear'
            },
            {
                name: 'Cleaning Supplies',
                quantity: 30,
                unit: 'pcs',
                notes: 'Cleaning materials and maintenance supplies'
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

        console.log('✓ Sample inventaris items created')

        console.log('Database seeding completed successfully!')

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