const express = require('express');
const path = require('path');
const cors = require('cors');
const asyncHandler = require('express-async-handler');
require('dotenv').config();

const { sequelize, testConnection } = require('./config/database');
const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes'); // Import dashboard routes
// const orderRoutes = require('./routes/orderRoutes'); // DEPRECATED: Legacy order routes removed 2025-01-25
const ordersManagementRoutes = require('./routes/ordersManagementRoutes'); // Import optimized orders-management routes
const productRoutes = require('./routes/productRoutes'); // Import product routes (CRUD Product)
const { protect, adminOnly } = require('./middleware/authMiddleware'); // Import middleware
const materialRoutes = require('./routes/materialRoutes');
const inventarisRoutes = require('./routes/inventarisRoutes');
const shipmentRoutes = require('./routes/shipmentRoutes');
const materialMovementRoutes = require('./routes/materialMovementRoutes');
const progressReportRoutes = require('./routes/progressReportRoutes');
const remainingFabricRoutes = require('./routes/remainingFabricRoutes');
const recurringPlanRoutes = require('./routes/recurringPlanRoutes');
const orderLinkRoutes = require('./routes/orderLinkRoutes');
const userRoutes = require('./routes/userRoutes'); // Import user routes
const reportsRoutes = require('./routes/reportsRoutes'); // Import reports routes
const fabricTypeRoutes = require('./routes/fabricTypeRoutes'); // Import fabric type routes
const purchaseLogRoutes = require('./routes/purchaseLogRoutes'); // Import purchase log routes
const materialsManagementRoutes = require('./routes/materialsManagementRoutes'); // Import materials management routes
const contactRoutes = require('./routes/contactRoutes'); // Import contact routes
const productProgressRoutes = require('./routes/productProgressRoutes'); // Import per-product progress routes
const { Order, Material, Product, User, ProgressReport, MaterialMovement, StatusChange } = require('./models');

const app = express();
const port = process.env.PORT || 8080;

// Middleware
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false })); // For handling form data

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
app.use('/api/auth', authRoutes); // Authentication routes
app.use('/api/auth/users', userRoutes); // User management routes
app.use('/api/admin', dashboardRoutes); // Admin routes (old path)
app.use('/api/dashboard', dashboardRoutes); // Dashboard routes (new path)
// app.use('/api/orders', orderRoutes); // DEPRECATED: Legacy CRUD Order routes removed 2025-01-25
app.use('/api/orders-management', ordersManagementRoutes); // Optimized orders-management routes
app.use('/api/products', productRoutes); // CRUD Product routes
app.use('/api/materials', materialRoutes);
app.use('/api/inventaris', inventarisRoutes);
app.use('/api/shipments', shipmentRoutes);
app.use('/api/material-movements', materialMovementRoutes);
app.use('/api/progress-reports', progressReportRoutes);
app.use('/api/remaining-fabrics', remainingFabricRoutes);
app.use('/api/recurring-plans', recurringPlanRoutes);
app.use('/api/order-links', orderLinkRoutes);
app.use('/api/reports', reportsRoutes); // Reports routes
app.use('/api/fabric-types', fabricTypeRoutes); // Fabric type routes
app.use('/api/purchase-logs', purchaseLogRoutes); // Purchase log routes
app.use('/api/materials-management', materialsManagementRoutes); // Materials management routes
app.use('/api/contacts', contactRoutes); // Contact management routes
app.use('/api/product-progress', productProgressRoutes); // Per-product progress tracking routes

// Health check endpoint
app.get('/api/health', asyncHandler(async (req, res) => {
    res.json({ 
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        database: sequelize.connectionManager.pool ? 'connected' : 'disconnected'
    });
}));

// Health check endpoint with detailed database status
app.get('/api/health/db', asyncHandler(async (req, res) => {
  try {
    // Check database connection
    await sequelize.authenticate();
    
    // Get database statistics
    const stats = {
      models: Object.keys(sequelize.models).map(modelName => ({
        name: modelName,
        attributes: Object.keys(sequelize.models[modelName].rawAttributes),
      })),
      connectionStatus: 'connected'
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
        code: error.original?.code || 'UNKNOWN',
        details: error.stack
      }
    });
  }
}));

// Protect /api/home route with 'protect' middleware
app.get('/api/home', protect, asyncHandler(async (req, res) => {
    // Access user data from req.user if needed
    // console.log(req.user);
    res.json({ 
        message: 'Hello World (Protected)',
        timestamp: new Date().toISOString(),
        user: req.user // Optional: include user data for verification
    });
}));

// New test route only for admins
app.get('/api/admin/test', protect, adminOnly, asyncHandler(async (req, res) => {
    res.json({
        message: 'Admin access granted!',
        user: req.user
    });
}));

// Add dashboard debug endpoint
app.get('/api/dashboard/debug', protect, adminOnly, asyncHandler(async (req, res) => {
  try {
    // Get model counts
    const counts = await Promise.all([
      Order.count().then(count => ({ name: 'Order', count })),
      Material.count().then(count => ({ name: 'Material', count })),
      Product.count().then(count => ({ name: 'Product', count })),
      User.count().then(count => ({ name: 'User', count })),
      ProgressReport.count().then(count => ({ name: 'ProgressReport', count })),
      MaterialMovement.count().then(count => ({ name: 'MaterialMovement', count })),
      StatusChange.count().then(count => ({ name: 'StatusChange', count })),
    ]);
    
    // Check model structure
    const structure = {
      Order: Object.keys(Order.rawAttributes),
      Material: Object.keys(Material.rawAttributes),
      Product: Object.keys(Product.rawAttributes),
      User: Object.keys(User.rawAttributes),
      ProgressReport: Object.keys(ProgressReport.rawAttributes),
      MaterialMovement: Object.keys(MaterialMovement.rawAttributes),
      StatusChange: Object.keys(StatusChange.rawAttributes),
    };
    
    res.json({
      timestamp: new Date().toISOString(),
      modelCounts: counts,
      modelStructure: structure
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
      stack: error.stack
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

// Initialize database and start server
const startServer = async () => {
    try {
        // Test database connection
        await testConnection();
        
        // Sync database models
        await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
        console.log('Database models synchronized');

        // Start server
        app.listen(port, () => {
            console.log(`Server is running on port ${port}`);
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`CORS enabled for: ${process.env.CLIENT_URL || 'http://localhost:3000'}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();