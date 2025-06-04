const express = require('express');
const asyncHandler = require('express-async-handler');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { RecurringPlan, Product } = require('../models');

const router = express.Router();

// GET /api/recurring-plans - Get all recurring plans (protected by middleware protect and adminOnly)
router.get('/', protect, adminOnly, asyncHandler(async (req, res) => {
  const plans = await RecurringPlan.findAll({
    include: [{ model: Product, attributes: ['id', 'name', 'code'] }]
  });
  res.status(200).json(plans);
}));

// GET /api/recurring-plans/:id - Get single recurring plan by ID (protected by middleware protect and adminOnly)
router.get('/:id', protect, adminOnly, asyncHandler(async (req, res) => {
  const plan = await RecurringPlan.findByPk(req.params.id, {
    include: [{ model: Product, attributes: ['id', 'name', 'code'] }]
  });
  if (!plan) {
    res.status(404).json({ message: 'Rencana Berulang tidak ditemukan' });
    return;
  }
  res.status(200).json(plan);
}));

// POST /api/recurring-plans - Create new recurring plan (protected by middleware protect and adminOnly)
router.post('/', protect, adminOnly, asyncHandler(async (req, res) => {
  const { productId, frequency, dayOfWeek, dayOfMonth, qty, nextRun, isActive } = req.body;

  // Validate required fields
  if (!productId || !frequency || !qty || !nextRun) {
    res.status(400).json({ 
      success: false, 
      message: 'Product ID, frequency, quantity, dan next run harus diisi' 
    });
    return;
  }

   if (frequency !== 'WEEKLY' && frequency !== 'MONTHLY') {
     res.status(400).json({ 
      success: false, 
      message: 'Frequency harus \'WEEKLY\' atau \'MONTHLY\'' 
    });
    return;
  }

  // Check if product exists
  const product = await Product.findByPk(productId);
  if (!product) {
    res.status(404).json({ message: 'Product tidak ditemukan' });
    return;
  }

  // Create recurring plan
  const newPlan = await RecurringPlan.create({
    productId,
    frequency,
    dayOfWeek,
    dayOfMonth,
    qty,
    nextRun,
    isActive: isActive !== undefined ? isActive : true
  });

  // Fetch the complete plan with related data
  const completePlan = await RecurringPlan.findByPk(newPlan.id, {
    include: [{ model: Product, attributes: ['id', 'name', 'code'] }]
  });

  res.status(201).json(completePlan);
}));

// PUT /api/recurring-plans/:id - Update recurring plan (protected by middleware protect and adminOnly)
router.put('/:id', protect, adminOnly, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { productId, frequency, dayOfWeek, dayOfMonth, qty, nextRun, isActive } = req.body;
  
  const plan = await RecurringPlan.findByPk(id);
  if (!plan) {
    res.status(404).json({ message: 'Rencana Berulang tidak ditemukan' });
    return;
  }

  // Check if product exists if productId is being updated
  if (productId !== undefined && plan.productId !== productId) {
      const product = await Product.findByPk(productId);
      if (!product) {
          res.status(404).json({ message: 'Product baru tidak ditemukan' });
          return;
      }
  }

  await plan.update({ 
    productId: productId !== undefined ? productId : plan.productId,
    frequency: frequency !== undefined ? frequency : plan.frequency,
    dayOfWeek: dayOfWeek !== undefined ? dayOfWeek : plan.dayOfWeek,
    dayOfMonth: dayOfMonth !== undefined ? dayOfMonth : plan.dayOfMonth,
    qty: qty !== undefined ? qty : plan.qty,
    nextRun: nextRun !== undefined ? nextRun : plan.nextRun,
    isActive: isActive !== undefined ? isActive : plan.isActive
  });
  
  // Fetch the updated plan with related data
  const updatedPlan = await RecurringPlan.findByPk(id, {
    include: [{ model: Product, attributes: ['id', 'name', 'code'] }]
  });

  res.status(200).json(updatedPlan);
}));

// DELETE /api/recurring-plans/:id - Delete recurring plan (protected by middleware protect and adminOnly)
router.delete('/:id', protect, adminOnly, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const plan = await RecurringPlan.findByPk(id);
  
  if (!plan) {
    res.status(404).json({ message: 'Rencana Berulang tidak ditemukan' });
    return;
  }

  await plan.destroy();
  res.status(204).send();
}));

module.exports = router; 