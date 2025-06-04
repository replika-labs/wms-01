'use strict';

const bcrypt = require('bcryptjs');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create demo users
    const users = await queryInterface.bulkInsert('Users', [
      {
        name: 'Admin User',
        email: 'admin@wms.com',
        passwordHash: await bcrypt.hash('admin123', 10),
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Regular User',
        email: 'user@wms.com',
        passwordHash: await bcrypt.hash('user123', 10),
        role: 'penjahit',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], { returning: true });

    // Create demo products
    const products = await queryInterface.bulkInsert('Products', [
      {
        name: 'T-Shirt Basic',
        code: 'TS-BASIC-001',
        qtyOnHand: 100,
        unit: 'pcs',
        description: 'Basic cotton t-shirt for everyday wear',
        defaultTarget: 100,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Jeans Slim Fit',
        code: 'JN-SLIM-001',
        qtyOnHand: 50,
        unit: 'pcs',
        description: 'Slim fit jeans with modern cut',
        defaultTarget: 50,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Hoodie Premium',
        code: 'HD-PREM-001',
        qtyOnHand: 75,
        unit: 'pcs',
        description: 'Premium quality hoodie with fleece lining',
        defaultTarget: 75,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Sweater Casual',
        code: 'SW-CAS-001',
        qtyOnHand: 60,
        unit: 'pcs',
        description: 'Casual sweater for daily use',
        defaultTarget: 60,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], { returning: true });

    // Create demo materials
    const materials = await queryInterface.bulkInsert('Materials', [
      {
        name: 'Cotton Fabric',
        code: 'MAT-COT-001',
        qtyOnHand: 500,
        unit: 'meter',
        safetyStock: 100,
        description: 'High quality cotton fabric',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Denim Fabric',
        code: 'MAT-DEN-001',
        qtyOnHand: 300,
        unit: 'meter',
        safetyStock: 50,
        description: 'Premium denim fabric',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Polyester Fabric',
        code: 'MAT-POL-001',
        qtyOnHand: 400,
        unit: 'meter',
        safetyStock: 75,
        description: 'Durable polyester fabric',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], { returning: true });

    // Create demo orders with different statuses
    const orders = await queryInterface.bulkInsert('Orders', [
      {
        orderNumber: 'ORD-2024-001',
        targetPcs: 100,
        completedPcs: 0,
        status: 'created',
        priority: 'high',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        description: 'Urgent order for summer collection',
        customerNote: 'Need fast delivery',
        userId: users[0].id,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        orderNumber: 'ORD-2024-002',
        targetPcs: 50,
        completedPcs: 25,
        status: 'processing',
        priority: 'medium',
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
        description: 'Regular order for basic collection',
        customerNote: '',
        userId: users[1].id,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        orderNumber: 'ORD-2024-003',
        targetPcs: 75,
        completedPcs: 75,
        status: 'completed',
        priority: 'low',
        dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        description: 'Completed order for winter collection',
        customerNote: 'Quality check required',
        userId: users[0].id,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        orderNumber: 'ORD-2024-004',
        targetPcs: 200,
        completedPcs: 0,
        status: 'cancelled',
        priority: 'urgent',
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        description: 'Cancelled bulk order',
        customerNote: 'Customer requested cancellation',
        userId: users[1].id,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], { returning: true });

    // Create order-product relationships
    await queryInterface.bulkInsert('OrderProducts', [
      {
        orderId: orders[0].id,
        productId: products[0].id,
        quantity: 50,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        orderId: orders[0].id,
        productId: products[1].id,
        quantity: 50,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        orderId: orders[1].id,
        productId: products[2].id,
        quantity: 50,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        orderId: orders[2].id,
        productId: products[3].id,
        quantity: 75,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        orderId: orders[3].id,
        productId: products[0].id,
        quantity: 100,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        orderId: orders[3].id,
        productId: products[1].id,
        quantity: 100,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);

    // Create product-material relationships
    await queryInterface.bulkInsert('ProductMaterials', [
      {
        productId: products[0].id,
        materialId: materials[0].id,
        quantity: 2, // 2 meters per piece
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        productId: products[1].id,
        materialId: materials[1].id,
        quantity: 3, // 3 meters per piece
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        productId: products[2].id,
        materialId: materials[2].id,
        quantity: 2.5, // 2.5 meters per piece
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        productId: products[3].id,
        materialId: materials[0].id,
        quantity: 1.5, // 1.5 meters per piece
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    // Delete in reverse order to handle foreign key constraints
    await queryInterface.bulkDelete('ProductMaterials', null, {});
    await queryInterface.bulkDelete('OrderProducts', null, {});
    await queryInterface.bulkDelete('Orders', null, {});
    await queryInterface.bulkDelete('Materials', null, {});
    await queryInterface.bulkDelete('Products', null, {});
    await queryInterface.bulkDelete('Users', null, {});
  }
}; 