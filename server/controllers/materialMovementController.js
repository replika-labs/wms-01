const MaterialMovement = require('../models/MaterialMovement');
const Material = require('../models/Material');
const PurchaseLog = require('../models/PurchaseLog');
const Order = require('../models/Order');
const User = require('../models/User');
const { ProductProgressReport, ProductProgressPhoto, Product, OrderProduct } = require('../models');
const { Op } = require('sequelize');

class MaterialMovementController {
  
  // Get all material movements with filtering and pagination
  static async getAllMovements(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        materialId,
        movementType,
        movementSource,
        startDate,
        endDate,
        search
      } = req.query;
      
      const offset = (page - 1) * limit;
      const whereClause = {};
      
      // Apply filters
      if (materialId) whereClause.materialId = materialId;
      if (movementType) whereClause.movementType = movementType;
      if (movementSource) whereClause.movementSource = movementSource;
      
      // Date range filter
      if (startDate || endDate) {
        whereClause.createdAt = {};
        if (startDate) whereClause.createdAt[Op.gte] = new Date(startDate);
        if (endDate) whereClause.createdAt[Op.lte] = new Date(endDate);
      }
      
      // Search filter
      if (search) {
        whereClause[Op.or] = [
          { description: { [Op.like]: `%${search}%` } },
          { notes: { [Op.like]: `%${search}%` } },
          { referenceNumber: { [Op.like]: `%${search}%` } }
        ];
      }
      
      const { count, rows } = await MaterialMovement.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: Material,
            attributes: ['id', 'name', 'code', 'unit']
          },
          {
            model: Order,
            attributes: ['id', 'orderNumber'],
            required: false
          },
          {
            model: User,
            attributes: ['id', 'name'],
            required: false
          },
          {
            model: PurchaseLog,
            as: 'PurchaseLog',
            attributes: ['id', 'supplier', 'purchasedDate'],
            required: false
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
      
      res.json({
        movements: rows,
        pagination: {
          total: count,
          pages: Math.ceil(count / limit),
          current: parseInt(page),
          limit: parseInt(limit)
        }
      });
      
    } catch (error) {
      console.error('Error fetching material movements:', error);
      res.status(500).json({ error: 'Failed to fetch material movements' });
    }
  }
  
  // Get movement by ID
  static async getMovementById(req, res) {
    try {
      const { id } = req.params;
      
      const movement = await MaterialMovement.findByPk(id, {
        include: [
          {
            model: Material,
            attributes: ['id', 'name', 'code', 'unit', 'qtyOnHand']
          },
          {
            model: Order,
            attributes: ['id', 'orderNumber', 'status'],
            required: false
          },
          {
            model: User,
            attributes: ['id', 'name', 'email'],
            required: false
          },
          {
            model: PurchaseLog,
            as: 'PurchaseLog',
            attributes: ['id', 'supplier', 'purchasedDate', 'status'],
            required: false
          }
        ]
      });
      
      if (!movement) {
        return res.status(404).json({ error: 'Movement not found' });
      }
      
      res.json(movement);
      
    } catch (error) {
      console.error('Error fetching movement:', error);
      res.status(500).json({ error: 'Failed to fetch movement' });
    }
  }
  
  // Create new material movement
  static async createMovement(req, res) {
    try {
      const {
        materialId,
        orderId,
        qty,
        movementType,
        description,
        movementSource = 'manual',
        referenceNumber,
        unitPrice,
        notes
      } = req.body;
      
      // Validate required fields
      if (!materialId || !qty || !movementType) {
        return res.status(400).json({ 
          error: 'materialId, qty, and movementType are required' 
        });
      }
      
      // Calculate total value
      const totalValue = unitPrice ? (qty * unitPrice) : null;
      
      const movement = await MaterialMovement.create({
        materialId,
        orderId: orderId || null,
        userId: req.user?.id || null,
        qty,
        movementType,
        description,
        movementSource,
        referenceNumber,
        unitPrice,
        totalValue,
        notes
      });
      
      // Fetch created movement with includes
      const createdMovement = await MaterialMovement.findByPk(movement.id, {
        include: [
          {
            model: Material,
            attributes: ['id', 'name', 'code', 'unit']
          },
          {
            model: Order,
            attributes: ['id', 'orderNumber'],
            required: false
          },
          {
            model: User,
            attributes: ['id', 'name'],
            required: false
          }
        ]
      });
      
      res.status(201).json(createdMovement);
      
    } catch (error) {
      console.error('Error creating movement:', error);
      res.status(500).json({ error: 'Failed to create movement' });
    }
  }
  
  // Update material movement
  static async updateMovement(req, res) {
    try {
      const { id } = req.params;
      const {
        qty,
        movementType,
        description,
        referenceNumber,
        unitPrice,
        notes
      } = req.body;
      
      const movement = await MaterialMovement.findByPk(id);
      
      if (!movement) {
        return res.status(404).json({ error: 'Movement not found' });
      }
      
      // Don't allow updating purchase-generated movements
      if (movement.movementSource === 'purchase') {
        return res.status(400).json({ 
          error: 'Cannot update purchase-generated movements' 
        });
      }
      
      // Calculate new total value
      const totalValue = unitPrice ? (qty * unitPrice) : movement.totalValue;
      
      await movement.update({
        qty: qty || movement.qty,
        movementType: movementType || movement.movementType,
        description: description || movement.description,
        referenceNumber: referenceNumber || movement.referenceNumber,
        unitPrice: unitPrice || movement.unitPrice,
        totalValue,
        notes: notes || movement.notes
      });
      
      // Fetch updated movement with includes
      const updatedMovement = await MaterialMovement.findByPk(id, {
        include: [
          {
            model: Material,
            attributes: ['id', 'name', 'code', 'unit']
          },
          {
            model: Order,
            attributes: ['id', 'orderNumber'],
            required: false
          },
          {
            model: User,
            attributes: ['id', 'name'],
            required: false
          }
        ]
      });
      
      res.json(updatedMovement);
      
    } catch (error) {
      console.error('Error updating movement:', error);
      res.status(500).json({ error: 'Failed to update movement' });
    }
  }
  
  // Delete material movement
  static async deleteMovement(req, res) {
    try {
      const { id } = req.params;
      
      const movement = await MaterialMovement.findByPk(id);
      
      if (!movement) {
        return res.status(404).json({ error: 'Movement not found' });
      }
      
      // Don't allow deleting purchase-generated movements
      if (movement.movementSource === 'purchase') {
        return res.status(400).json({ 
          error: 'Cannot delete purchase-generated movements' 
        });
      }
      
      await movement.destroy();
      
      res.json({ message: 'Movement deleted successfully' });
      
    } catch (error) {
      console.error('Error deleting movement:', error);
      res.status(500).json({ error: 'Failed to delete movement' });
    }
  }
  
  // Get movements by material
  static async getMovementsByMaterial(req, res) {
    try {
      const { materialId } = req.params;
      const { movementType, movementSource } = req.query;
      
      const movements = await MaterialMovement.findByMaterial(materialId, {
        movementType,
        movementSource,
        include: [
          {
            model: Order,
            attributes: ['id', 'orderNumber'],
            required: false
          },
          {
            model: User,
            attributes: ['id', 'name'],
            required: false
          },
          {
            model: PurchaseLog,
            as: 'PurchaseLog',
            attributes: ['id', 'supplier', 'purchasedDate'],
            required: false
          }
        ]
      });
      
      res.json(movements);
      
    } catch (error) {
      console.error('Error fetching movements by material:', error);
      res.status(500).json({ error: 'Failed to fetch movements by material' });
    }
  }
  
  // Get inventory calculation for material
  static async getInventoryForMaterial(req, res) {
    try {
      const { materialId } = req.params;
      
      const inventory = await MaterialMovement.calculateInventoryForMaterial(materialId);
      
      // Get material details
      const material = await Material.findByPk(materialId, {
        attributes: ['id', 'name', 'code', 'unit', 'qtyOnHand', 'safetyStock']
      });
      
      if (!material) {
        return res.status(404).json({ error: 'Material not found' });
      }
      
      res.json({
        material,
        inventory,
        comparison: {
          materialQtyOnHand: material.qtyOnHand,
          calculatedStock: inventory.currentStock,
          difference: inventory.currentStock - material.qtyOnHand,
          isInSync: Math.abs(inventory.currentStock - material.qtyOnHand) < 0.01
        }
      });
      
    } catch (error) {
      console.error('Error calculating inventory:', error);
      res.status(500).json({ error: 'Failed to calculate inventory' });
    }
  }
  
  // Get movement analytics
  static async getMovementAnalytics(req, res) {
    try {
      const { materialId, startDate, endDate } = req.query;
      
      const whereClause = {};
      if (materialId) whereClause.materialId = materialId;
      
      // Date range filter
      if (startDate || endDate) {
        whereClause.createdAt = {};
        if (startDate) whereClause.createdAt[Op.gte] = new Date(startDate);
        if (endDate) whereClause.createdAt[Op.lte] = new Date(endDate);
      }
      
      // Get movement statistics
      const [masukMovements, keluarMovements, totalMovements] = await Promise.all([
        MaterialMovement.findAll({
          where: { ...whereClause, movementType: 'MASUK' },
          attributes: ['qty', 'totalValue'],
          raw: true
        }),
        MaterialMovement.findAll({
          where: { ...whereClause, movementType: 'KELUAR' },
          attributes: ['qty', 'totalValue'],
          raw: true
        }),
        MaterialMovement.count({ where: whereClause })
      ]);
      
      const totalMasuk = masukMovements.reduce((sum, m) => sum + (parseFloat(m.qty) || 0), 0);
      const totalKeluar = keluarMovements.reduce((sum, m) => sum + (parseFloat(m.qty) || 0), 0);
      const totalValueMasuk = masukMovements.reduce((sum, m) => sum + (parseFloat(m.totalValue) || 0), 0);
      const totalValueKeluar = keluarMovements.reduce((sum, m) => sum + (parseFloat(m.totalValue) || 0), 0);
      
      res.json({
        totalMovements,
        totalMasuk,
        totalKeluar,
        netMovement: totalMasuk - totalKeluar,
        totalValueMasuk,
        totalValueKeluar,
        netValue: totalValueMasuk - totalValueKeluar
      });
      
    } catch (error) {
      console.error('Error getting movement analytics:', error);
      res.status(500).json({ error: 'Failed to get movement analytics' });
    }
  }

  // NEW: Get material movements by order ID for progress tracking
  static async getMovementsByOrder(req, res) {
    try {
      const { orderId } = req.params;
      
      if (!orderId) {
        return res.status(400).json({ error: 'Order ID is required' });
      }

      const movements = await MaterialMovement.findAll({
        where: { orderId: parseInt(orderId) },
        include: [
          {
            model: Material,
            attributes: ['id', 'name', 'code', 'unit', 'qtyOnHand']
          },
          {
            model: Order,
            attributes: ['id', 'orderNumber', 'status'],
            required: false
          },
          {
            model: User,
            attributes: ['id', 'name'],
            required: false
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      // Format movements as tickets
      const tickets = movements.map(movement => this.formatMovementAsTicket(movement));

      res.json({
        success: true,
        movements: tickets,
        summary: {
          totalMovements: tickets.length,
          totalKeluar: tickets.filter(t => t.movementType === 'KELUAR').length,
          totalMasuk: tickets.filter(t => t.movementType === 'MASUK').length,
          totalFabricUsage: tickets
            .filter(t => t.movementType === 'KELUAR' && t.movementSource === 'ORDER_PROGRESS')
            .reduce((sum, t) => sum + t.qty, 0)
        }
      });
      
    } catch (error) {
      console.error('Error fetching movements by order:', error);
      res.status(500).json({ error: 'Failed to fetch movements by order' });
    }
  }

  // NEW: Helper method to format movement as ticket for frontend display
  static formatMovementAsTicket(movement) {
    const ticket = {
      id: movement.id,
      ticketNumber: `MVT-${String(movement.id).padStart(6, '0')}`,
      materialId: movement.materialId,
      materialName: movement.Material?.name || 'Unknown Material',
      materialCode: movement.Material?.code || '',
      materialUnit: movement.Material?.unit || 'units',
      orderId: movement.orderId,
      orderNumber: movement.Order?.orderNumber || '',
      movementType: movement.movementType,
      qty: parseFloat(movement.qty),
      movementSource: movement.movementSource,
      description: movement.description,
      referenceNumber: movement.referenceNumber,
      notes: movement.notes,
      createdAt: movement.createdAt,
      formattedDateTime: new Date(movement.createdAt).toLocaleString('id-ID', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Jakarta'
      }),
      createdBy: movement.User?.name || 'System',
      unitPrice: movement.unitPrice ? parseFloat(movement.unitPrice) : null,
      totalValue: movement.totalValue ? parseFloat(movement.totalValue) : null
    };

    // Add specific formatting for different movement sources
    if (movement.movementSource === 'ORDER_PROGRESS') {
      ticket.badge = {
        text: 'Progress',
        color: 'bg-blue-100 text-blue-800'
      };
      ticket.icon = '📝';
    } else if (movement.movementSource === 'ORDER_COMPLETION') {
      ticket.badge = {
        text: 'Completion',
        color: 'bg-green-100 text-green-800'
      };
      ticket.icon = '✅';
    } else if (movement.movementSource === 'PURCHASE') {
      ticket.badge = {
        text: 'Purchase',
        color: 'bg-purple-100 text-purple-800'
      };
      ticket.icon = '🛒';
    } else {
      ticket.badge = {
        text: 'Manual',
        color: 'bg-gray-100 text-gray-800'
      };
      ticket.icon = '✏️';
    }

    return ticket;
  }

  // NEW: Get material movements for per-product tracking
  static async getPerProductMovements(req, res) {
    try {
      const { orderId, productId } = req.params;
      const { reportId } = req.query;

      let whereClause = {
        movementSource: ['ORDER_PROGRESS_PER_PRODUCT', 'ORDER_PROGRESS'],
        movementType: 'KELUAR'
      };

      if (orderId) whereClause.orderId = orderId;

      const movements = await MaterialMovement.findAll({
        where: whereClause,
        include: [
          {
            model: Material,
            attributes: ['id', 'name', 'code', 'unit']
          },
          {
            model: Order,
            attributes: ['id', 'orderNumber'],
            include: [{
              model: OrderProduct,
              as: 'OrderProducts',
              where: productId ? { productId } : {},
              required: productId ? true : false,
              include: [{
                model: Product,
                attributes: ['id', 'name', 'description']
              }]
            }]
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      // Filter movements that mention the specific product
      let filteredMovements = movements;
      if (productId) {
        filteredMovements = movements.filter(movement => {
          return movement.description && movement.description.includes(productId) ||
                 movement.notes && movement.notes.includes(`Product: ${productId}`) ||
                 movement.Order?.OrderProducts?.some(op => op.productId === parseInt(productId));
        });
      }

      // Calculate totals
      const totalFabricUsed = filteredMovements.reduce((sum, movement) => sum + parseFloat(movement.qty), 0);
      const uniqueProducts = [...new Set(filteredMovements.map(movement => 
        movement.Order?.OrderProducts?.map(op => op.Product?.name)
      ).flat())].filter(Boolean);

      res.json({
        success: true,
        movements: filteredMovements.map(movement => this.formatMovementAsTicket(movement)),
        summary: {
          totalMovements: filteredMovements.length,
          totalFabricUsed,
          uniqueProducts,
          dateRange: {
            earliest: filteredMovements.length > 0 ? 
              new Date(Math.min(...filteredMovements.map(m => new Date(m.createdAt)))) : null,
            latest: filteredMovements.length > 0 ? 
              new Date(Math.max(...filteredMovements.map(m => new Date(m.createdAt)))) : null
          }
        }
      });

    } catch (error) {
      console.error('Error fetching per-product movements:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch per-product movements',
        message: error.message 
      });
    }
  }

  // NEW: Create per-product fabric movement
  static async createPerProductMovement(req, res) {
    try {
      const {
        materialId,
        orderId,
        productId,
        orderProductId,
        progressReportId,
        qty,
        description,
        notes,
        unitPrice,
        pcsFinished,
        qualityScore
      } = req.body;

      // Validate required fields
      if (!materialId || !orderId || !productId || !qty) {
        return res.status(400).json({
          success: false,
          error: 'materialId, orderId, productId, and qty are required'
        });
      }

      // Get product details for description
      const product = await Product.findByPk(productId, {
        attributes: ['id', 'name', 'description']
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          error: 'Product not found'
        });
      }

      // Create movement record
      const movement = await MaterialMovement.create({
        materialId,
        orderId,
        userId: req.user?.id || null,
        qty: parseFloat(qty),
        movementType: 'KELUAR',
        movementSource: 'ORDER_PROGRESS_PER_PRODUCT',
        description: description || `Fabric used for ${product.name} - ${pcsFinished || 0} pieces`,
        referenceNumber: progressReportId ? `PROD-${progressReportId}` : null,
        unitPrice: unitPrice ? parseFloat(unitPrice) : null,
        totalValue: unitPrice ? (parseFloat(qty) * parseFloat(unitPrice)) : null,
        notes: notes || `Product: ${product.name}, Quality: ${qualityScore || 100}%`,
        progressReportId: progressReportId || null
      });

      // Update material stock
      await Material.decrement('stock', {
        by: parseFloat(qty),
        where: { id: materialId }
      });

      // Fetch created movement with relationships
      const createdMovement = await MaterialMovement.findByPk(movement.id, {
        include: [
          {
            model: Material,
            attributes: ['id', 'name', 'code', 'unit', 'stock']
          },
          {
            model: Order,
            attributes: ['id', 'orderNumber']
          }
        ]
      });

      res.json({
        success: true,
        message: 'Per-product fabric movement created successfully',
        movement: this.formatMovementAsTicket(createdMovement),
        materialStock: {
          materialId: createdMovement.Material.id,
          newStock: createdMovement.Material.stock,
          fabricUsed: parseFloat(qty)
        }
      });

    } catch (error) {
      console.error('Error creating per-product movement:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create per-product movement',
        message: error.message
      });
    }
  }

  // NEW: Get fabric usage analytics per product
  static async getPerProductFabricAnalytics(req, res) {
    try {
      const { productId, orderId, startDate, endDate } = req.query;

      let whereClause = {
        movementType: 'KELUAR',
        movementSource: ['ORDER_PROGRESS_PER_PRODUCT', 'ORDER_PROGRESS']
      };

      if (orderId) whereClause.orderId = orderId;

      // Date range filter
      if (startDate || endDate) {
        whereClause.createdAt = {};
        if (startDate) whereClause.createdAt[Op.gte] = new Date(startDate);
        if (endDate) whereClause.createdAt[Op.lte] = new Date(endDate);
      }

      const movements = await MaterialMovement.findAll({
        where: whereClause,
        include: [
          {
            model: Material,
            attributes: ['id', 'name', 'code', 'unit']
          },
          {
            model: Order,
            attributes: ['id', 'orderNumber'],
            include: [{
              model: OrderProduct,
              as: 'OrderProducts',
              where: productId ? { productId } : {},
              required: false,
              include: [{
                model: Product,
                attributes: ['id', 'name']
              }]
            }]
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      // Process analytics
      const analytics = {
        totalMovements: movements.length,
        totalFabricUsed: 0,
        averageFabricPerPiece: 0,
        fabricByMaterial: {},
        fabricByProduct: {},
        efficiencyTrends: [],
        dailyUsage: {}
      };

      movements.forEach(movement => {
        const qty = parseFloat(movement.qty);
        analytics.totalFabricUsed += qty;

        // Group by material
        const materialKey = movement.Material.id;
        if (!analytics.fabricByMaterial[materialKey]) {
          analytics.fabricByMaterial[materialKey] = {
            materialId: materialKey,
            materialName: movement.Material.name,
            materialCode: movement.Material.code,
            unit: movement.Material.unit,
            totalUsed: 0,
            movementCount: 0
          };
        }
        analytics.fabricByMaterial[materialKey].totalUsed += qty;
        analytics.fabricByMaterial[materialKey].movementCount++;

        // Group by product (from description or notes)
        const productName = movement.Order?.OrderProducts?.[0]?.Product?.name || 
                           this.extractProductFromDescription(movement.description);
        if (productName) {
          if (!analytics.fabricByProduct[productName]) {
            analytics.fabricByProduct[productName] = {
              productName,
              totalUsed: 0,
              movementCount: 0,
              averagePerMovement: 0
            };
          }
          analytics.fabricByProduct[productName].totalUsed += qty;
          analytics.fabricByProduct[productName].movementCount++;
          analytics.fabricByProduct[productName].averagePerMovement = 
            analytics.fabricByProduct[productName].totalUsed / analytics.fabricByProduct[productName].movementCount;
        }

        // Daily usage tracking
        const date = new Date(movement.createdAt).toISOString().split('T')[0];
        if (!analytics.dailyUsage[date]) {
          analytics.dailyUsage[date] = { date, totalUsed: 0, movementCount: 0 };
        }
        analytics.dailyUsage[date].totalUsed += qty;
        analytics.dailyUsage[date].movementCount++;
      });

      // Convert objects to arrays for easier frontend consumption
      analytics.fabricByMaterial = Object.values(analytics.fabricByMaterial);
      analytics.fabricByProduct = Object.values(analytics.fabricByProduct);
      analytics.dailyUsage = Object.values(analytics.dailyUsage).sort((a, b) => 
        new Date(a.date) - new Date(b.date)
      );

      res.json({
        success: true,
        analytics,
        metadata: {
          productId: productId || 'all',
          orderId: orderId || 'all',
          dateRange: { startDate, endDate },
          generatedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Error getting per-product fabric analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get fabric analytics',
        message: error.message
      });
    }
  }

  // NEW: Helper method to extract product name from movement description
  static extractProductFromDescription(description) {
    if (!description) return null;
    
    // Try to extract product name from common patterns
    const patterns = [
      /Fabric used for (.+?) - \d+/,
      /Product: (.+?),/,
      /for product (.+?)$/i
    ];
    
    for (const pattern of patterns) {
      const match = description.match(pattern);
      if (match) return match[1].trim();
    }
    
    return null;
  }

  // NEW: Bulk create movements for per-product progress
  static async bulkCreatePerProductMovements(req, res) {
    try {
      const { movements } = req.body;

      if (!movements || !Array.isArray(movements) || movements.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'movements array is required'
        });
      }

      const createdMovements = [];
      const materialUpdates = {};

      // Process each movement
      for (const movementData of movements) {
        const {
          materialId,
          orderId,
          productId,
          qty,
          description,
          notes,
          progressReportId
        } = movementData;

        // Get product details
        const product = await Product.findByPk(productId);
        if (!product) continue;

        // Create movement
        const movement = await MaterialMovement.create({
          materialId,
          orderId,
          userId: req.user?.id || null,
          qty: parseFloat(qty),
          movementType: 'KELUAR',
          movementSource: 'ORDER_PROGRESS_PER_PRODUCT',
          description: description || `Fabric used for ${product.name}`,
          referenceNumber: progressReportId ? `BULK-${progressReportId}` : null,
          notes: notes || `Bulk per-product fabric usage`,
          progressReportId: progressReportId || null
        });

        createdMovements.push(movement);

        // Track material stock updates
        if (!materialUpdates[materialId]) {
          materialUpdates[materialId] = 0;
        }
        materialUpdates[materialId] += parseFloat(qty);
      }

      // Bulk update material stocks
      for (const [materialId, totalQty] of Object.entries(materialUpdates)) {
        await Material.decrement('stock', {
          by: totalQty,
          where: { id: materialId }
        });
      }

      res.json({
        success: true,
        message: `Successfully created ${createdMovements.length} per-product movements`,
        movements: createdMovements.map(m => ({
          id: m.id,
          materialId: m.materialId,
          qty: m.qty,
          description: m.description
        })),
        materialUpdates: Object.keys(materialUpdates).map(materialId => ({
          materialId,
          fabricUsed: materialUpdates[materialId]
        }))
      });

    } catch (error) {
      console.error('Error bulk creating per-product movements:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to bulk create movements',
        message: error.message
      });
    }
  }
}

module.exports = MaterialMovementController; 
