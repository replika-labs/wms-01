const MaterialMovement = require('../models/MaterialMovement');
const MaterialNew = require('../models/MaterialNew');
const PurchaseLog = require('../models/PurchaseLog');
const Order = require('../models/Order');
const User = require('../models/User');
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
      const material = await MaterialNew.findByPk(materialId, {
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
      const { startDate, endDate, materialId } = req.query;
      
      const summary = await MaterialMovement.getMovementSummary({
        startDate,
        endDate,
        materialId
      });
      
      // Get total counts
      const totalMovements = await MaterialMovement.count({
        where: {
          ...(startDate && { createdAt: { [Op.gte]: new Date(startDate) } }),
          ...(endDate && { createdAt: { [Op.lte]: new Date(endDate) } }),
          ...(materialId && { materialId })
        }
      });
      
      // Get movements by source
      const movementsBySource = await MaterialMovement.findAll({
        attributes: [
          'movementSource',
          [MaterialMovement.sequelize.fn('COUNT', MaterialMovement.sequelize.col('id')), 'count'],
          [MaterialMovement.sequelize.fn('SUM', MaterialMovement.sequelize.col('qty')), 'totalQty']
        ],
        where: {
          ...(startDate && { createdAt: { [Op.gte]: new Date(startDate) } }),
          ...(endDate && { createdAt: { [Op.lte]: new Date(endDate) } }),
          ...(materialId && { materialId })
        },
        group: ['movementSource']
      });
      
      res.json({
        totalMovements,
        summary,
        movementsBySource
      });
      
    } catch (error) {
      console.error('Error fetching movement analytics:', error);
      res.status(500).json({ error: 'Failed to fetch movement analytics' });
    }
  }
}

module.exports = MaterialMovementController; 