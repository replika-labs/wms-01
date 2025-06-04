const express = require('express');
const asyncHandler = require('express-async-handler');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { OrderLink, Order, User, ProgressReport, Contact, MaterialMovement, Product } = require('../models');
const crypto = require('crypto');
const { sequelize } = require('../config/database');

const router = express.Router();

// Helper function to generate a secure token
const generateToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// POST /api/order-links - Create new order link (protected by middleware protect and adminOnly)
router.post('/', protect, adminOnly, asyncHandler(async (req, res) => {
  const { orderId, userId, expireAt } = req.body;

  // Validate required fields - userId is now optional
  if (!orderId || !expireAt) {
    res.status(400).json({ 
      success: false, 
      message: 'Order ID dan tanggal kadaluarsa harus diisi' 
    });
    return;
  }

  // Check if order exists
  const order = await Order.findByPk(orderId);
  if (!order) {
    res.status(404).json({ message: 'Order tidak ditemukan' });
    return;
  }

  // Check if user (penjahit) exists - only if userId is provided
  if (userId) {
    const user = await User.findByPk(userId);
    if (!user || user.role !== 'penjahit') {
      res.status(404).json({ message: 'User (Penjahit) tidak ditemukan atau bukan penjahit' });
      return;
    }
  }

  // Generate unique token
  const token = generateToken();

  // Create order link - userId can be null for public links
  const newOrderLink = await OrderLink.create({
    orderId,
    userId: userId || null, // Allow null for public links
    token,
    expireAt,
    isActive: true
  });

  // Fetch the complete link with related data (excluding sensitive user data)
  const completeLink = await OrderLink.findByPk(newOrderLink.id, {
    include: [
        { model: Order, attributes: ['id', 'orderNumber', 'targetPcs', 'dueDate', 'description'] },
        { model: User, attributes: ['id', 'name'], required: false } // Make User join optional
    ]
  });

  res.status(201).json(completeLink);
}));

// GET /api/order-links/:token - Get order details by token (Public Access - no user token needed)
router.get('/:token', asyncHandler(async (req, res) => {
    const { token } = req.params;

    const orderLink = await OrderLink.findOne({
        where: { token, isActive: true },
        include: [
            { model: Order, 
              attributes: ['id', 'orderNumber', 'status', 'targetPcs', 'customerNote', 'dueDate', 'description'],
              include: [
                  { model: ProgressReport, attributes: ['id', 'pcsFinished', 'reportedAt', 'note'], include: [{ model: User, attributes: ['id', 'name'] }] },
                  { model: User, as: 'Tailor', attributes: ['id', 'name', 'whatsappPhone'], required: false },
                  { model: Contact, as: 'TailorContact', attributes: ['id', 'name', 'whatsappPhone', 'email', 'company', 'position'], required: false },
                  { model: Product, attributes: ['id', 'name', 'materialId'], through: { attributes: ['qty'] }, required: false }
              ]
            },
            { model: User, attributes: ['id', 'name'] } // Penjahit yang ditugaskan
        ]
    });

    if (!orderLink) {
        res.status(404).json({ success: false, message: 'Link Order tidak ditemukan atau sudah tidak aktif' });
        return;
    }

    // Check if link has expired
    if (new Date() > new Date(orderLink.expireAt)) {
        // Optionally deactivate the link if expired
        // await orderLink.update({ isActive: false });
        res.status(400).json({ success: false, message: 'Link Order sudah kadaluarsa' });
        return;
    }

    res.status(200).json({ success: true, orderLink });
}));

// POST /api/order-links/:token/progress - Add progress report via order link (Public Access - no user token needed)
router.post('/:token/progress', asyncHandler(async (req, res) => {
    const { token } = req.params;
    const { pcsFinished, photoUrl, resiPengiriman, note, tailorName, fabricUsage, productMaterials } = req.body;

    // Find the active order link
    const orderLink = await OrderLink.findOne({
        where: { token, isActive: true },
        include: [{ model: Order, attributes: ['id', 'targetPcs', 'completedPcs', 'status'] }]
    });

    if (!orderLink) {
        res.status(404).json({ success: false, message: 'Link Order tidak ditemukan atau sudah tidak aktif' });
        return;
    }

     // Check if link has expired
    if (new Date() > new Date(orderLink.expireAt)) {
        res.status(400).json({ success: false, message: 'Link Order sudah kadaluarsa' });
        return;
    }

    // Validate required fields for progress report
    if (pcsFinished === undefined) {
         res.status(400).json({ 
            success: false, 
            message: 'Jumlah pcs selesai (pcsFinished) harus diisi' 
          });
        return;
    }

    // Validate pcsFinished doesn't exceed remaining quantity
    const order = orderLink.Order;
    const remainingPcs = order.targetPcs - order.completedPcs;
    if (pcsFinished > remainingPcs) {
        res.status(400).json({
            success: false,
            message: `Jumlah pcs selesai tidak boleh melebihi sisa target (${remainingPcs} pcs)`
        });
        return;
    }

    // Use transaction to ensure data consistency
    const result = await sequelize.transaction(async (t) => {
        // Create progress report
        const newReport = await ProgressReport.create({
            orderId: orderLink.orderId,
            userId: orderLink.userId || null, // Use null if no user assigned to OrderLink
            pcsFinished,
            photoUrl,
            resiPengiriman,
            note,
            tailorName, // Include tailor name (required for identification)
            reportedAt: new Date()
        }, { transaction: t });

        // Update order completedPcs
        const newCompletedPcs = order.completedPcs + parseInt(pcsFinished, 10);
        
        // Determine if order status should be updated
        let newStatus = order.status;
        let statusMessage = null;
        
        // If order was not in processing status yet, change to processing
        if (newStatus === 'created' || newStatus === 'confirmed') {
            newStatus = 'processing';
            statusMessage = 'Status order diubah menjadi processing karena progress telah dilaporkan';
        }
        
        // If order is now complete, change status to completed
        if (newCompletedPcs >= order.targetPcs && newStatus !== 'completed') {
            newStatus = 'completed';
            statusMessage = 'Status order diubah menjadi completed karena target produksi telah tercapai';
        }
        
        // Update order
        await Order.update({
            completedPcs: newCompletedPcs,
            status: newStatus
        }, { 
            where: { id: orderLink.orderId },
            transaction: t 
        });

        // NEW: Process fabric usage and create MaterialMovement entries
        let fabricMovements = [];
        if (fabricUsage > 0 && productMaterials && productMaterials.length > 0) {
            try {
                fabricMovements = await createFabricMovements(
                    orderLink.orderId, 
                    fabricUsage, 
                    productMaterials, 
                    newReport.id,
                    t // Pass transaction
                );
                console.log(`Created ${fabricMovements.length} fabric movements for progress report ${newReport.id}`);
            } catch (fabricError) {
                console.error('Error creating fabric movements:', fabricError);
                // Don't throw - progress report should still succeed even if movement fails
            }
        }

        return { newReport, statusMessage, fabricMovements };
    });

    res.status(201).json({ 
        success: true, 
        message: result.statusMessage || 'Laporan progress berhasil ditambahkan', 
        report: result.newReport,
        fabricMovements: result.fabricMovements || [],
        fabricUsageProcessed: result.fabricMovements?.length > 0
    });
}));

// NEW: Helper function to create fabric movements
const createFabricMovements = async (orderId, fabricUsage, productMaterials, progressReportId, transaction) => {
    try {
        // Group by material (in case multiple products use same material)
        const materialUsage = {};
        productMaterials.forEach(pm => {
            if (pm.materialId) {
                materialUsage[pm.materialId] = (materialUsage[pm.materialId] || 0) + (fabricUsage / productMaterials.length);
            }
        });

        // Create MaterialMovement 'KELUAR' entries for each material
        const movements = [];
        for (const [materialId, usageAmount] of Object.entries(materialUsage)) {
            const movement = await MaterialMovement.create({
                materialId: parseInt(materialId),
                orderId: orderId,
                qty: parseFloat(usageAmount),
                movementType: 'KELUAR',
                movementSource: 'order',
                description: `Production usage for Order - Progress Report #${progressReportId}`,
                referenceNumber: `PROD-${orderId}-${progressReportId}`,
                notes: `Fabric consumed during production progress report`
            }, { transaction });
            
            movements.push(movement);
        }

        return movements;
    } catch (error) {
        console.error('Error creating fabric movements:', error);
        throw error;
    }
};

// Note: DELETE and PUT for OrderLink itself might be needed later, but for now, only creation and access/update via token are implemented.

module.exports = router; 