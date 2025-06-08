const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

// Helper function to generate material code for seeding
const generateMaterialCode = (totalUnits, supplier) => {
    // Generate 3 random alphabets
    const randomAlphabets = Array.from({ length: 3 }, () =>
        String.fromCharCode(65 + Math.floor(Math.random() * 26))
    ).join('')

    // Get current date in YYYYMMDD format
    const currentDate = new Date().toISOString().slice(0, 10).replace(/-/g, '')

    // Clean supplier name (remove spaces, special characters, limit to 6 chars)
    const cleanSupplier = (supplier || 'UNKNOWN')
        .replace(/[^A-Z0-9]/gi, '')
        .toUpperCase()
        .slice(0, 6) || 'UNKNWN'

    // Format: [3 RANDOM ALPHABET]-[TOTAL_UNITS]-[SUPPLIER]-[DATE_YYYYMMDD]
    return `${randomAlphabets}-${totalUnits}-${cleanSupplier}-${currentDate}`
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

        // Create sample materials with new schema (without MaterialType)
        const materials = [
            {
                name: 'Steel Sheets',
                description: 'High quality steel sheets for manufacturing',
                code: generateMaterialCode(50, 'Steel Supply Co.'),
                unit: 'pcs',
                qtyOnHand: 50.0,
                pricePerUnit: 25.50,
                supplier: 'Steel Supply Co.',
                minStock: 5.0,
                maxStock: 100.0,
                reorderPoint: 10.0,
                reorderQty: 25.0,
                attributeType: 'Raw Materials',
                attributeValue: 'Steel'
            },
            {
                name: 'Electronic Components',
                description: 'Various electronic components and circuits',
                code: generateMaterialCode(200, 'Electronics Hub'),
                unit: 'pcs',
                qtyOnHand: 200.0,
                pricePerUnit: 5.25,
                supplier: 'Electronics Hub',
                minStock: 20.0,
                maxStock: 500.0,
                reorderPoint: 50.0,
                reorderQty: 100.0,
                attributeType: 'Components',
                attributeValue: 'Electronic'
            },
            {
                name: 'Plastic Housing',
                description: 'Durable plastic housing units',
                code: generateMaterialCode(75, 'Plastic Manufacturing Ltd.'),
                unit: 'pcs',
                qtyOnHand: 75.0,
                pricePerUnit: 12.00,
                supplier: 'Plastic Manufacturing Ltd.',
                minStock: 10.0,
                maxStock: 150.0,
                reorderPoint: 20.0,
                reorderQty: 50.0,
                attributeType: 'Components',
                attributeValue: 'Plastic'
            },
            {
                name: 'Aluminum Rods',
                description: 'High-grade aluminum rods for structural components',
                code: generateMaterialCode(30, 'Metal Works Ltd.'),
                unit: 'pcs',
                qtyOnHand: 30.0,
                pricePerUnit: 18.75,
                supplier: 'Metal Works Ltd.',
                minStock: 5.0,
                maxStock: 80.0,
                reorderPoint: 10.0,
                reorderQty: 20.0,
                attributeType: 'Raw Materials',
                attributeValue: 'Aluminum'
            },
            {
                name: 'Rubber Gaskets',
                description: 'Weather-resistant rubber gaskets and seals',
                code: generateMaterialCode(150, 'Rubber Solutions'),
                unit: 'pcs',
                qtyOnHand: 150.0,
                pricePerUnit: 3.50,
                supplier: 'Rubber Solutions',
                minStock: 25.0,
                maxStock: 300.0,
                reorderPoint: 40.0,
                reorderQty: 75.0,
                attributeType: 'Components',
                attributeValue: 'Rubber'
            }
        ]

        for (const material of materials) {
            const existingMaterial = await prisma.material.findFirst({
                where: { name: material.name }
            })

            if (!existingMaterial) {
                await prisma.material.create({
                    data: material
                })
            }
        }

        console.log('✓ Sample materials created')

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