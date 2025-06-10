const express = require('express');
const path = require('path');
const cors = require('cors');
const asyncHandler = require('express-async-handler');
require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const ordersManagementRoutes = require('./routes/ordersManagementRoutes');
const productRoutes = require('./routes/productRoutes');
const { protect, adminOnly } = require('./middleware/authMiddleware');
const inventarisRoutes = require('./routes/inventarisRoutes');
const shipmentRoutes = require('./routes/shipmentRoutes');
const materialMovementRoutes = require('./routes/materialMovementRoutes');
const progressReportRoutes = require('./routes/progressReportRoutes');
const remainingMaterialRoutes = require('./routes/remainingMaterialRoutes');
const recurringPlanRoutes = require('./routes/recurringPlanRoutes');
const orderLinkRoutes = require('./routes/orderLinkRoutes');
const userRoutes = require('./routes/userRoutes');
const reportsRoutes = require('./routes/reportsRoutes');
const purchaseLogRoutes = require('./routes/purchaseLogRoutes');
const materialsManagementRoutes = require('./routes/materialsManagementRoutes');
const contactRoutes = require('./routes/contactRoutes');
const productProgressRoutes = require('./routes/productProgressRoutes');

const app = express();
const port = process.env.PORT || 8080;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Cache-Control',
    'Pragma',
    'Expires'
  ],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 200
}));

// Handle preflight requests explicitly
app.options('*', cors());

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve static files for uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/auth/users', userRoutes);
app.use('/api/admin', dashboardRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/orders-management', ordersManagementRoutes);
app.use('/api/products', productRoutes);
app.use('/api/inventaris', inventarisRoutes);
app.use('/api/shipments', shipmentRoutes);
app.use('/api/material-movements', materialMovementRoutes);
app.use('/api/progress-reports', progressReportRoutes);
app.use('/api/remaining-materials', remainingMaterialRoutes);
app.use('/api/recurring-plans', recurringPlanRoutes);
app.use('/api/order-links', orderLinkRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/purchase-logs', purchaseLogRoutes);
app.use('/api/materials-management', materialsManagementRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/product-progress', productProgressRoutes);

// Health check endpoint
app.get('/api/health', asyncHandler(async (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: 'prisma'
  });
}));

// Health check endpoint with detailed database status
app.get('/api/health/db', asyncHandler(async (req, res) => {
  try {
    // Test Prisma connection
    await prisma.$queryRaw`SELECT 1`;

    // Get basic database info
    const stats = {
      connectionStatus: 'connected',
      prismaVersion: process.env.npm_package_dependencies_prisma || 'unknown',
      databaseProvider: 'postgresql'
    };

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: stats
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: {
        message: error.message,
        code: error.code || 'UNKNOWN',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }
    });
  }
}));

// Protected home route
app.get('/api/home', protect, asyncHandler(async (req, res) => {
  res.json({
    message: 'Hello World (Protected)',
    timestamp: new Date().toISOString(),
    user: req.user
  });
}));

// Admin test route
app.get('/api/admin/test', protect, adminOnly, asyncHandler(async (req, res) => {
  res.json({
    message: 'Admin access granted!',
    user: req.user
  });
}));

// Database debug endpoint for admins
app.get('/api/dashboard/debug', protect, adminOnly, asyncHandler(async (req, res) => {
  try {
    // Get model counts using Prisma
    const counts = await Promise.all([
      prisma.order.count().then(count => ({ name: 'Order', count })),
      prisma.material.count().then(count => ({ name: 'Material', count })),
      prisma.product.count().then(count => ({ name: 'Product', count })),
      prisma.user.count().then(count => ({ name: 'User', count })),
      prisma.progressReport.count().then(count => ({ name: 'ProgressReport', count })),
      prisma.materialMovement.count().then(count => ({ name: 'MaterialMovement', count })),
      prisma.statusChange.count().then(count => ({ name: 'StatusChange', count })),
      prisma.materialType.count().then(count => ({ name: 'MaterialType', count })),
      prisma.contact.count().then(count => ({ name: 'Contact', count })),
      prisma.inventaris.count().then(count => ({ name: 'Inventaris', count })),
    ]);

    res.json({
      timestamp: new Date().toISOString(),
      modelCounts: counts,
      database: 'Prisma ORM',
      schema: 'Updated for generalized warehouse management'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}));

// Serve frontend
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/out')));

  app.get('*', (req, res) => res.sendFile(path.resolve(__dirname, '../client', 'out', 'index.html')));
} else {
  app.get('/', (req, res) => res.send('Please set to production'));
}

// Apply error handling
app.use(errorHandler);

// Test database connection and start server
const startServer = async () => {
  try {
    // Test Prisma database connection
    await prisma.$connect();
    console.log('✅ Database connected successfully (Prisma)');

    // Start server
    app.listen(port, () => {
      console.log(`🚀 Server is running on port ${port}`);
      console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 CORS enabled for: ${process.env.CLIENT_URL || 'http://localhost:3000'}`);
      console.log(`🗄️  Database: Prisma ORM with PostgreSQL`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

process.on('SIGINT', async () => {
  console.log('\n🔄 Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

startServer();