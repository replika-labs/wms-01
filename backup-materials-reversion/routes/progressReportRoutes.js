const express = require('express');
const asyncHandler = require('express-async-handler');
const { protect } = require('../middleware/authMiddleware'); // Progress report bisa diisi oleh penjahit, jadi tidak perlu adminOnly
const { ProgressReport, Order, User } = require('../models');
const { sequelize } = require('../config/database');

const router = express.Router();

// GET /api/progress-reports - Get all progress reports (protected by middleware protect)
router.get('/', protect, asyncHandler(async (req, res) => {
  const reports = await ProgressReport.findAll({
    include: [
      { model: Order, attributes: ['id', 'orderNumber'] },
      { model: User, attributes: ['id', 'name'] }
    ],
    order: [['reportedAt', 'DESC']]
  });
  res.status(200).json(reports);
}));

// GET /api/progress-reports/:id - Get single progress report by ID (protected by middleware protect)
router.get('/:id', protect, asyncHandler(async (req, res) => {
  const report = await ProgressReport.findByPk(req.params.id, {
    include: [
      { model: Order, attributes: ['id', 'orderNumber'] },
      { model: User, attributes: ['id', 'name'] }
    ]
  });
  if (!report) {
    res.status(404).json({ message: 'Laporan Progress tidak ditemukan' });
    return;
  }
  res.status(200).json(report);
}));

// POST /api/progress-reports - Create new progress report (protected by middleware protect)
router.post('/', protect, asyncHandler(async (req, res) => {
  const { orderId, pcsFinished, photoUrl, resiPengiriman, note } = req.body;
  const userId = req.user.id; // Get user ID from authenticated user

  // Validate required fields
  if (!orderId || !pcsFinished) {
    res.status(400).json({ 
      success: false, 
      message: 'Order ID dan jumlah pcs selesai harus diisi' 
    });
    return;
  }

  // Check if order exists
  const order = await Order.findByPk(orderId);
  if (!order) {
    res.status(404).json({ message: 'Order tidak ditemukan' });
    return;
  }

  // Validate pcsFinished doesn't exceed remaining quantity
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
      orderId,
      userId,
      pcsFinished,
      photoUrl,
      resiPengiriman,
      note,
      reportedAt: new Date() // Set reportedAt to current time
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
    await order.update({
      completedPcs: newCompletedPcs,
      status: newStatus
    }, { transaction: t });

    // Fetch the complete report with related data
    const completeReport = await ProgressReport.findByPk(newReport.id, {
      include: [
        { model: Order, attributes: ['id', 'orderNumber', 'status', 'completedPcs', 'targetPcs'] },
        { model: User, attributes: ['id', 'name'] }
      ],
      transaction: t
    });

    return { completeReport, statusMessage };
  });

  // Return the response with status message if status was changed
  res.status(201).json({
    ...result.completeReport.toJSON(),
    message: result.statusMessage
  });
}));

// PUT /api/progress-reports/:id - Update progress report (protected by middleware protect)
router.put('/:id', protect, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { orderId, pcsFinished, photoUrl, resiPengiriman, note } = req.body;
  
  const report = await ProgressReport.findByPk(id);
  if (!report) {
    res.status(404).json({ message: 'Laporan Progress tidak ditemukan' });
    return;
  }

  // Optional: Restrict updates based on user (only allow owner to update)
  // if (report.userId !== req.user.id && req.user.role !== 'admin') {
  //     res.status(403).json({ message: 'Anda tidak diizinkan mengupdate laporan ini' });
  //     return;
  // }

  // Check if order exists if orderId is being updated
   if (orderId !== undefined && report.orderId !== orderId) {
      const order = await Order.findByPk(orderId);
      if (!order) {
          res.status(404).json({ message: 'Order baru tidak ditemukan' });
          return;
      }
  }

  // Use transaction to ensure data consistency
  const result = await sequelize.transaction(async (t) => {
    // Get the original order
    const originalOrderId = orderId !== undefined ? orderId : report.orderId;
    const order = await Order.findByPk(originalOrderId, { transaction: t });
    if (!order) {
      throw new Error('Order tidak ditemukan');
    }

    // Calculate the change in pcsFinished
    const oldPcsFinished = report.pcsFinished;
    const newPcsFinished = pcsFinished !== undefined ? parseInt(pcsFinished, 10) : oldPcsFinished;
    const deltaFinished = newPcsFinished - oldPcsFinished;
    
    // Update the report
    await report.update({ 
      orderId: orderId !== undefined ? orderId : report.orderId,
      pcsFinished: newPcsFinished,
      photoUrl: photoUrl !== undefined ? photoUrl : report.photoUrl,
      resiPengiriman: resiPengiriman !== undefined ? resiPengiriman : report.resiPengiriman,
      note: note !== undefined ? note : report.note,
    }, { transaction: t });
    
    // Only update order if pcsFinished has changed
    if (deltaFinished !== 0) {
      // Update order completedPcs
      const newCompletedPcs = order.completedPcs + deltaFinished;
      
      // Validate new completedPcs doesn't exceed target or go below 0
      if (newCompletedPcs > order.targetPcs) {
        throw new Error(`Jumlah pcs selesai tidak boleh melebihi target (${order.targetPcs} pcs)`);
      }
      
      if (newCompletedPcs < 0) {
        throw new Error('Jumlah pcs selesai tidak boleh negatif');
      }
      
      // Determine if order status should be updated
      let newStatus = order.status;
      let statusMessage = null;
      
      // If order was not in processing status yet, change to processing
      if ((newStatus === 'created' || newStatus === 'confirmed') && newCompletedPcs > 0) {
        newStatus = 'processing';
        statusMessage = 'Status order diubah menjadi processing karena progress telah dilaporkan';
      }
      
      // If order is now complete, change status to completed
      if (newCompletedPcs >= order.targetPcs && newStatus !== 'completed') {
        newStatus = 'completed';
        statusMessage = 'Status order diubah menjadi completed karena target produksi telah tercapai';
      }
      
      // Update order
      await order.update({
        completedPcs: newCompletedPcs,
        status: newStatus
      }, { transaction: t });
      
      return { updatedReport: report, statusMessage, order };
    }
    
    return { updatedReport: report, statusMessage: null, order };
  });
  
  // Return the response with status message if status was changed
  const response = {
    ...result.updatedReport.toJSON(),
    order: {
      id: result.order.id,
      orderNumber: result.order.orderNumber,
      status: result.order.status,
      completedPcs: result.order.completedPcs,
      targetPcs: result.order.targetPcs
    }
  };
  
  if (result.statusMessage) {
    response.message = result.statusMessage;
  }
  
  res.status(200).json(response);
}));

// DELETE /api/progress-reports/:id - Delete progress report (protected by middleware protect)
router.delete('/:id', protect, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const report = await ProgressReport.findByPk(id);
  
  if (!report) {
    res.status(404).json({ message: 'Laporan Progress tidak ditemukan' });
    return;
  }

  // Optional: Restrict deletion based on user (only allow owner or admin to delete)
  // if (report.userId !== req.user.id && req.user.role !== 'admin') {
  //     res.status(403).json({ message: 'Anda tidak diizinkan menghapus laporan ini' });
  //     return;
  // }

  // Use transaction to ensure data consistency
  await sequelize.transaction(async (t) => {
    // Get the original order to update completedPcs
    const order = await Order.findByPk(report.orderId, { transaction: t });
    if (order) {
      // Update order completedPcs by subtracting the deleted report's pcsFinished
      const newCompletedPcs = Math.max(0, order.completedPcs - report.pcsFinished);
      
      // Determine if order status should be updated
      let newStatus = order.status;
      
      // If order was completed but now it's not, change status back to processing
      if (order.status === 'completed' && newCompletedPcs < order.targetPcs) {
        newStatus = 'processing';
      }
      
      // Update order
      await order.update({
        completedPcs: newCompletedPcs,
        status: newStatus
      }, { transaction: t });
    }
    
    // Delete the progress report
    await report.destroy({ transaction: t });
  });
  
  res.status(204).send();
}));

module.exports = router; 