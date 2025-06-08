const { PrismaClient } = require('@prisma/client')

const globalForPrisma = globalThis

const prisma = globalForPrisma.prisma || new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    errorFormat: 'pretty'
})

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma
}

// Test the connection
prisma.$connect()
    .then(() => {
        console.log('Prisma database connection has been established successfully.')
    })
    .catch((error) => {
        console.error('Unable to connect to the database with Prisma:', error)
    })

module.exports = prisma 