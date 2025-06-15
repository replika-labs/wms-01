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
    console.log('Starting hijab WMS database seeding...')

    try {
        // Create admin user
        const hashedPassword = await bcrypt.hash('admin123', 10)

        const adminUser = await prisma.user.upsert({
            where: { email: 'admin@hijabwms.com' },
            update: {},
            create: {
                name: 'Hijab Store Administrator',
                email: 'admin@hijabwms.com',
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
            where: { email: 'operator@hijabwms.com' },
            update: {},
            create: {
                name: 'Warehouse Operator',
                email: 'operator@hijabwms.com',
                passwordHash: hashedPassword,
                role: 'OPERATOR',
                phone: '+62812345679',
                whatsappPhone: '+62812345679',
                isActive: true,
                loginEnabled: true
            }
        })

        console.log('✓ Operator user created:', operatorUser.email)

        // Create hijab-related materials with purchase history
        const materialData = [
            {
                material: {
                    name: 'Chiffon Fabric',
                    description: 'High quality chiffon fabric for premium hijabs',
                    code: generateMaterialCode(100, 'Chiffon Fabric'),
                    unit: 'meter',
                    qtyOnHand: 100.0,
                    minStock: 10.0,
                    maxStock: 200.0,
                    reorderPoint: 20.0,
                    reorderQty: 50.0,
                    location: 'Fabric Storage A1',
                    attributeType: 'Fabric',
                    attributeValue: 'Chiffon'
                },
                purchases: [
                    {
                        supplier: 'Premium Textile Indonesia',
                        quantity: 60.0,
                        pricePerUnit: 45000,
                        purchaseDate: new Date('2024-01-15'),
                        status: 'RECEIVED'
                    },
                    {
                        supplier: 'Premium Textile Indonesia',
                        quantity: 40.0,
                        pricePerUnit: 47000,
                        purchaseDate: new Date('2024-02-10'),
                        status: 'RECEIVED'
                    }
                ]
            },
            {
                material: {
                    name: 'Voile Fabric',
                    description: 'Soft and breathable voile fabric for daily hijabs',
                    code: generateMaterialCode(150, 'Voile Fabric'),
                    unit: 'meter',
                    qtyOnHand: 150.0,
                    minStock: 15.0,
                    maxStock: 300.0,
                    reorderPoint: 30.0,
                    reorderQty: 75.0,
                    location: 'Fabric Storage A2',
                    attributeType: 'Fabric',
                    attributeValue: 'Voile'
                },
                purchases: [
                    {
                        supplier: 'Hijab Fabric Supplier',
                        quantity: 100.0,
                        pricePerUnit: 35000,
                        purchaseDate: new Date('2024-01-20'),
                        status: 'RECEIVED'
                    },
                    {
                        supplier: 'Hijab Fabric Supplier',
                        quantity: 50.0,
                        pricePerUnit: 36000,
                        purchaseDate: new Date('2024-02-05'),
                        status: 'RECEIVED'
                    }
                ]
            },
            {
                material: {
                    name: 'Cotton Jersey',
                    description: 'Comfortable cotton jersey for inner hijabs',
                    code: generateMaterialCode(80, 'Cotton Jersey'),
                    unit: 'meter',
                    qtyOnHand: 80.0,
                    minStock: 8.0,
                    maxStock: 160.0,
                    reorderPoint: 15.0,
                    reorderQty: 40.0,
                    location: 'Fabric Storage B1',
                    attributeType: 'Fabric',
                    attributeValue: 'Cotton Jersey'
                },
                purchases: [
                    {
                        supplier: 'Cotton Textile Co.',
                        quantity: 80.0,
                        pricePerUnit: 28000,
                        purchaseDate: new Date('2024-01-25'),
                        status: 'RECEIVED'
                    }
                ]
            },
            {
                material: {
                    name: 'Silk Satin',
                    description: 'Luxurious silk satin for premium hijab collection',
                    code: generateMaterialCode(50, 'Silk Satin'),
                    unit: 'meter',
                    qtyOnHand: 50.0,
                    minStock: 5.0,
                    maxStock: 100.0,
                    reorderPoint: 10.0,
                    reorderQty: 25.0,
                    location: 'Premium Storage C1',
                    attributeType: 'Fabric',
                    attributeValue: 'Silk Satin'
                },
                purchases: [
                    {
                        supplier: 'Luxury Silk Imports',
                        quantity: 50.0,
                        pricePerUnit: 85000,
                        purchaseDate: new Date('2024-01-30'),
                        status: 'RECEIVED'
                    }
                ]
            },
            {
                material: {
                    name: 'Hijab Pins',
                    description: 'Decorative and functional hijab pins',
                    code: generateMaterialCode(500, 'Hijab Pins'),
                    unit: 'pcs',
                    qtyOnHand: 500.0,
                    minStock: 50.0,
                    maxStock: 1000.0,
                    reorderPoint: 100.0,
                    reorderQty: 200.0,
                    location: 'Accessories Storage D1',
                    attributeType: 'Accessories',
                    attributeValue: 'Pins'
                },
                purchases: [
                    {
                        supplier: 'Hijab Accessories Supplier',
                        quantity: 300.0,
                        pricePerUnit: 5000,
                        purchaseDate: new Date('2024-02-01'),
                        status: 'RECEIVED'
                    },
                    {
                        supplier: 'Hijab Accessories Supplier',
                        quantity: 200.0,
                        pricePerUnit: 4800,
                        purchaseDate: new Date('2024-02-15'),
                        status: 'RECEIVED'
                    }
                ]
            },
            {
                material: {
                    name: 'Magnetic Hijab Clips',
                    description: 'Modern magnetic clips for easy hijab styling',
                    code: generateMaterialCode(200, 'Magnetic Clips'),
                    unit: 'pcs',
                    qtyOnHand: 200.0,
                    minStock: 20.0,
                    maxStock: 400.0,
                    reorderPoint: 40.0,
                    reorderQty: 100.0,
                    location: 'Accessories Storage D2',
                    attributeType: 'Accessories',
                    attributeValue: 'Magnetic Clips'
                },
                purchases: [
                    {
                        supplier: 'Modern Hijab Solutions',
                        quantity: 200.0,
                        pricePerUnit: 12000,
                        purchaseDate: new Date('2024-02-05'),
                        status: 'RECEIVED'
                    }
                ]
            },
            {
                material: {
                    name: 'Hijab Caps/Ciput',
                    description: 'Inner caps for comfortable hijab wearing',
                    code: generateMaterialCode(100, 'Hijab Caps'),
                    unit: 'pcs',
                    qtyOnHand: 100.0,
                    minStock: 10.0,
                    maxStock: 200.0,
                    reorderPoint: 20.0,
                    reorderQty: 50.0,
                    location: 'Inner Wear Storage E1',
                    attributeType: 'Inner Wear',
                    attributeValue: 'Caps'
                },
                purchases: [
                    {
                        supplier: 'Hijab Essentials Co.',
                        quantity: 100.0,
                        pricePerUnit: 15000,
                        purchaseDate: new Date('2024-02-08'),
                        status: 'RECEIVED'
                    }
                ]
            },
            {
                material: {
                    name: 'Lace Trim',
                    description: 'Decorative lace trim for hijab edges',
                    code: generateMaterialCode(300, 'Lace Trim'),
                    unit: 'meter',
                    qtyOnHand: 300.0,
                    minStock: 30.0,
                    maxStock: 600.0,
                    reorderPoint: 60.0,
                    reorderQty: 150.0,
                    location: 'Trim Storage F1',
                    attributeType: 'Trim',
                    attributeValue: 'Lace'
                },
                purchases: [
                    {
                        supplier: 'Decorative Trims Ltd.',
                        quantity: 300.0,
                        pricePerUnit: 8000,
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

        console.log('✓ Hijab materials and purchase history created')

        // Create hijab products
        const chiffonFabric = await prisma.material.findFirst({ where: { name: 'Chiffon Fabric' } })
        const voileFabric = await prisma.material.findFirst({ where: { name: 'Voile Fabric' } })
        const cottonJersey = await prisma.material.findFirst({ where: { name: 'Cotton Jersey' } })
        const silkSatin = await prisma.material.findFirst({ where: { name: 'Silk Satin' } })

        const products = [
            {
                name: 'Premium Chiffon Hijab',
                code: 'HIJ-CHF-001',
                materialId: chiffonFabric?.id,
                category: 'Premium Hijabs',
                price: 125000,
                unit: 'pcs',
                description: 'Elegant chiffon hijab perfect for formal occasions',
                defaultTarget: 50
            },
            {
                name: 'Daily Voile Hijab',
                code: 'HIJ-VOI-001',
                materialId: voileFabric?.id,
                category: 'Daily Hijabs',
                price: 85000,
                unit: 'pcs',
                description: 'Comfortable voile hijab for everyday wear',
                defaultTarget: 100
            },
            {
                name: 'Cotton Inner Hijab',
                code: 'HIJ-CTN-001',
                materialId: cottonJersey?.id,
                category: 'Inner Hijabs',
                price: 45000,
                unit: 'pcs',
                description: 'Soft cotton inner hijab for comfort',
                defaultTarget: 75
            },
            {
                name: 'Luxury Silk Hijab',
                code: 'HIJ-SLK-001',
                materialId: silkSatin?.id,
                category: 'Luxury Hijabs',
                price: 250000,
                unit: 'pcs',
                description: 'Premium silk hijab for special occasions',
                defaultTarget: 25
            },
            {
                name: 'Square Chiffon Hijab',
                code: 'HIJ-SQR-001',
                materialId: chiffonFabric?.id,
                category: 'Square Hijabs',
                price: 95000,
                unit: 'pcs',
                description: 'Versatile square chiffon hijab',
                defaultTarget: 60
            },
            {
                name: 'Instant Voile Hijab',
                code: 'HIJ-INS-001',
                materialId: voileFabric?.id,
                category: 'Instant Hijabs',
                price: 75000,
                unit: 'pcs',
                description: 'Easy-to-wear instant hijab',
                defaultTarget: 80
            }
        ]

        for (const product of products) {
            await prisma.product.upsert({
                where: { code: product.code },
                update: {},
                create: product
            })
        }

        console.log('✓ Hijab products created')

        // Create hijab-specific colors
        const productColors = [
            // Basic hijab colors
            { colorName: 'Black', colorCode: 'BLCK' },
            { colorName: 'White', colorCode: 'WHT' },
            { colorName: 'Broken White', colorCode: 'BW' },
            { colorName: 'Cream', colorCode: 'CRM' },
            { colorName: 'Beige', colorCode: 'BEIG' },
            { colorName: 'Nude', colorCode: 'NUDE' },
            { colorName: 'Dusty Pink', colorCode: 'DPNK' },
            { colorName: 'Baby Pink', colorCode: 'BPNK' },
            { colorName: 'Soft Pink', colorCode: 'SPNK' },
            { colorName: 'Rose Gold', colorCode: 'RGLD' },
            { colorName: 'Navy Blue', colorCode: 'NAVY' },
            { colorName: 'Royal Blue', colorCode: 'RBLU' },
            { colorName: 'Sky Blue', colorCode: 'SBLU' },
            { colorName: 'Powder Blue', colorCode: 'PBLU' },
            { colorName: 'Sage Green', colorCode: 'SGRN' },
            { colorName: 'Olive Green', colorCode: 'OLIV' },
            { colorName: 'Forest Green', colorCode: 'FGRN' },
            { colorName: 'Mint Green', colorCode: 'MINT' },
            { colorName: 'Lavender', colorCode: 'LAVD' },
            { colorName: 'Purple', colorCode: 'PRPL' },
            { colorName: 'Plum', colorCode: 'PLUM' },
            { colorName: 'Burgundy', colorCode: 'BGDY' },
            { colorName: 'Maroon', colorCode: 'MARN' },
            { colorName: 'Wine Red', colorCode: 'WINE' },
            { colorName: 'Coral', colorCode: 'CORL' },
            { colorName: 'Peach', colorCode: 'PECH' },
            { colorName: 'Mustard', colorCode: 'MSTD' },
            { colorName: 'Camel', colorCode: 'CAML' },
            { colorName: 'Taupe', colorCode: 'TAUP' },
            { colorName: 'Grey', colorCode: 'GREY' },
            { colorName: 'Light Grey', colorCode: 'LGRY' },
            { colorName: 'Charcoal', colorCode: 'CHAR' },
            { colorName: 'Mocha', colorCode: 'MOCH' },
            { colorName: 'Chocolate', colorCode: 'CHOC' }
        ];

        // Create hijab-specific variations (sizes and styles)
        const productVariations = [
            // Hijab sizes
            { variationType: 'Size', variationValue: '110x110 cm' },
            { variationType: 'Size', variationValue: '120x120 cm' },
            { variationType: 'Size', variationValue: '130x130 cm' },
            { variationType: 'Size', variationValue: '140x140 cm' },
            { variationType: 'Size', variationValue: '150x150 cm' },
            { variationType: 'Size', variationValue: '160x160 cm' },
            { variationType: 'Size', variationValue: '170x170 cm' },
            { variationType: 'Size', variationValue: '180x180 cm' },
            { variationType: 'Size', variationValue: '200x200 cm' },

            // Rectangle sizes
            { variationType: 'Size', variationValue: '70x180 cm' },
            { variationType: 'Size', variationValue: '75x200 cm' },
            { variationType: 'Size', variationValue: '80x200 cm' },

            // Hijab styles
            { variationType: 'Style', variationValue: 'Plain' },
            { variationType: 'Style', variationValue: 'Printed' },
            { variationType: 'Style', variationValue: 'Embroidered' },
            { variationType: 'Style', variationValue: 'Lace Edge' },
            { variationType: 'Style', variationValue: 'Sequined' },
            { variationType: 'Style', variationValue: 'Pleated' },
            { variationType: 'Style', variationValue: 'Textured' },
            { variationType: 'Style', variationValue: 'Ombre' },
            { variationType: 'Style', variationValue: 'Two-Tone' },

            // Hijab types
            { variationType: 'Type', variationValue: 'Square' },
            { variationType: 'Type', variationValue: 'Rectangle' },
            { variationType: 'Type', variationValue: 'Instant' },
            { variationType: 'Type', variationValue: 'Shawl' },
            { variationType: 'Type', variationValue: 'Pashmina' },
            { variationType: 'Type', variationValue: 'Khimar' },
            { variationType: 'Type', variationValue: 'Bergo' }
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

        console.log('✓ Hijab colors and variations created')

        // Create hijab-related contacts
        const contacts = [
            {
                name: 'Siti Aminah',
                phone: '+628123456789',
                whatsappPhone: '+628123456789',
                email: 'siti.aminah@hijabstore.com',
                contactType: 'WORKER',
                company: 'Hijab Production Team',
                notes: 'Experienced hijab seamstress and quality control'
            },
            {
                name: 'Premium Textile Indonesia',
                phone: '+62215551234',
                email: 'orders@premiumtextile.co.id',
                contactType: 'SUPPLIER',
                company: 'Premium Textile Indonesia',
                address: 'Jl. Industri Tekstil No. 123, Bandung, Jawa Barat'
            },
            {
                name: 'Hijab Fabric Supplier',
                phone: '+62215551235',
                email: 'sales@hijabfabric.co.id',
                contactType: 'SUPPLIER',
                company: 'Hijab Fabric Supplier',
                address: 'Jl. Kain Hijab No. 45, Solo, Jawa Tengah'
            },
            {
                name: 'Luxury Silk Imports',
                phone: '+62215551236',
                email: 'info@luxurysilk.co.id',
                contactType: 'SUPPLIER',
                company: 'Luxury Silk Imports',
                address: 'Jl. Sutra Mewah No. 78, Jakarta Pusat'
            },
            {
                name: 'Hijab Boutique Jakarta',
                phone: '+62215551237',
                email: 'order@hijabboutique.com',
                contactType: 'CUSTOMER',
                company: 'Hijab Boutique Jakarta',
                address: 'Jl. Fashion No. 90, Jakarta Selatan'
            },
            {
                name: 'Muslimah Fashion Store',
                phone: '+62215551238',
                email: 'procurement@muslimahfashion.com',
                contactType: 'CUSTOMER',
                company: 'Muslimah Fashion Store',
                address: 'Jl. Busana Muslim No. 12, Surabaya, Jawa Timur'
            },
            {
                name: 'Fatimah Zahra',
                phone: '+628123456790',
                whatsappPhone: '+628123456790',
                email: 'fatimah.zahra@hijabstore.com',
                contactType: 'WORKER',
                company: 'Hijab Design Team',
                notes: 'Creative designer specializing in modern hijab styles'
            },
            {
                name: 'Hijab Accessories Supplier',
                phone: '+62215551239',
                email: 'sales@hijabaccessories.co.id',
                contactType: 'SUPPLIER',
                company: 'Hijab Accessories Supplier',
                address: 'Jl. Aksesoris Hijab No. 34, Yogyakarta'
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

        console.log('✓ Hijab-related contacts created')

        // Create hijab-specific inventory items only
        const inventarisItems = [
            {
                name: 'Hijab Sewing Machines',
                quantity: 5,
                unit: 'units',
                notes: 'Specialized sewing machines for hijab production'
            },
            {
                name: 'Hijab Cutting Tables',
                quantity: 3,
                unit: 'units',
                notes: 'Large cutting tables for hijab fabric preparation'
            },
            {
                name: 'Hijab Measuring Tools',
                quantity: 20,
                unit: 'sets',
                notes: 'Rulers, measuring tapes, and cutting tools for hijab sizing'
            },
            {
                name: 'Hijab Packaging Materials',
                quantity: 500,
                unit: 'pcs',
                notes: 'Branded boxes, bags, and labels for hijab packaging'
            },
            {
                name: 'Hijab Display Mannequins',
                quantity: 15,
                unit: 'pcs',
                notes: 'Head mannequins specifically for hijab display'
            },
            {
                name: 'Hijab Storage Boxes',
                quantity: 100,
                unit: 'pcs',
                notes: 'Organized storage boxes for hijab inventory management'
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

        console.log('✓ Hijab-specific inventory items created')

        console.log('Hijab WMS database seeding completed successfully!')

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