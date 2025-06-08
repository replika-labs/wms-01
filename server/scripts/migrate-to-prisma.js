const { PrismaClient } = require('@prisma/client')
require('dotenv').config()

const prisma = new PrismaClient()

async function migrateData() {
    console.log('Starting Prisma setup verification...')

    try {
        // Test Prisma connection
        console.log('Testing Prisma connection...')
        await prisma.$connect()
        console.log('✓ Prisma connected successfully')

        // You can add specific data migration logic here if needed
        // For now, we'll just ensure the schema is properly set up

        console.log('Prisma setup completed successfully!')

    } catch (error) {
        console.error('Prisma setup failed:', error)
        throw error
    } finally {
        await prisma.$disconnect()
    }
}

// Check if the existing tables are compatible
async function checkSchemaCompatibility() {
    console.log('Checking schema compatibility...')

    try {
        // Test basic queries to ensure the schema works
        const userCount = await prisma.user.count()
        console.log(`✓ Found ${userCount} users in database`)

        const materialCount = await prisma.material.count()
        console.log(`✓ Found ${materialCount} materials in database`)

        const productCount = await prisma.product.count()
        console.log(`✓ Found ${productCount} products in database`)

        const orderCount = await prisma.order.count()
        console.log(`✓ Found ${orderCount} orders in database`)

        console.log('✓ Schema compatibility check passed!')

    } catch (error) {
        console.error('Schema compatibility check failed:', error)
        console.log('You may need to run: npm run db:migrate')
        throw error
    }
}

if (require.main === module) {
    migrateData()
        .then(() => checkSchemaCompatibility())
        .then(() => {
            console.log('All checks passed! You can now use Prisma.')
            process.exit(0)
        })
        .catch((error) => {
            console.error('Migration failed:', error)
            process.exit(1)
        })
}

module.exports = { migrateData, checkSchemaCompatibility } 