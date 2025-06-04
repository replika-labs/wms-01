const express = require('express');
const asyncHandler = require('express-async-handler');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { Shipment, Order } = require('../models');

const router = express.Router();

// GET /api/shipments - Get all shipments (protected by middleware protect)
router.get('/', protect, asyncHandler(async (req, res) => {
  const shipments = await Shipment.findAll({
    include: [{ model: Order }]
  });
  res.status(200).json(shipments);
}));

// GET /api/shipments/:id - Get single shipment by ID (protected by middleware protect)
router.get('/:id', protect, asyncHandler(async (req, res) => {
  const shipment = await Shipment.findByPk(req.params.id, {
    include: [{ model: Order }]
  });
  if (!shipment) {
    res.status(404).json({ message: 'Pengiriman tidak ditemukan' });
    return;
  }
  res.status(200).json(shipment);
}));

// POST /api/shipments - Create new shipment (protected by middleware protect and adminOnly)
router.post('/', protect, adminOnly, asyncHandler(async (req, res) => {
  const { orderId, trackingNumber, courier, deliveryDate } = req.body;

  // Validate required fields
  if (!orderId) {
    res.status(400).json({ 
      success: false, 
      message: 'Order ID harus diisi' 
    });
    return;
  }

  // Check if order exists
  const order = await Order.findByPk(orderId);
  if (!order) {
    res.status(404).json({ message: 'Order tidak ditemukan' });
    return;
  }

  // Create shipment
  const newShipment = await Shipment.create({
    orderId,
    trackingNumber,
    courier,
    deliveryDate
  });

  res.status(201).json(newShipment);
}));

// PUT /api/shipments/:id - Update shipment (protected by middleware protect and adminOnly)
router.put('/:id', protect, adminOnly, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { orderId, trackingNumber, courier, deliveryDate } = req.body;
  
  const shipment = await Shipment.findByPk(id);
  if (!shipment) {
    res.status(404).json({ message: 'Pengiriman tidak ditemukan' });
    return;
  }

  // Check if order exists if orderId is being updated
  if (orderId !== undefined && shipment.orderId !== orderId) {
    const order = await Order.findByPk(orderId);
    if (!order) {
      res.status(404).json({ message: 'Order baru tidak ditemukan' });
      return;
    }
  }

  await shipment.update({ 
    orderId: orderId !== undefined ? orderId : shipment.orderId,
    trackingNumber: trackingNumber !== undefined ? trackingNumber : shipment.trackingNumber,
    courier: courier !== undefined ? courier : shipment.courier,
    deliveryDate: deliveryDate !== undefined ? deliveryDate : shipment.deliveryDate
  });
  
  res.status(200).json(shipment);
}));

// DELETE /api/shipments/:id - Delete shipment (protected by middleware protect and adminOnly)
router.delete('/:id', protect, adminOnly, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const shipment = await Shipment.findByPk(id);
  
  if (!shipment) {
    res.status(404).json({ message: 'Pengiriman tidak ditemukan' });
    return;
  }

  await shipment.destroy();
  res.status(204).send();
}));

module.exports = router; 