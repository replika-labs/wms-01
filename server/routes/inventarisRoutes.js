const express = require('express');
const asyncHandler = require('express-async-handler');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { Inventaris } = require('../models');

const router = express.Router();

// GET /api/inventaris - Get all inventaris items (protected by middleware protect)
router.get('/', protect, asyncHandler(async (req, res) => {
  const inventarisItems = await Inventaris.findAll();
  res.status(200).json(inventarisItems);
}));

// GET /api/inventaris/:id - Get single inventaris item by ID (protected by middleware protect)
router.get('/:id', protect, asyncHandler(async (req, res) => {
  const inventarisItem = await Inventaris.findByPk(req.params.id);
  if (!inventarisItem) {
    res.status(404).json({ message: 'Item Inventaris tidak ditemukan' });
    return;
  }
  res.status(200).json(inventarisItem);
}));

// POST /api/inventaris - Create new inventaris item (protected by middleware protect and adminOnly)
router.post('/', protect, adminOnly, asyncHandler(async (req, res) => {
  const { itemName, qty, unit } = req.body;

  // Validate required fields
  if (!itemName) {
    res.status(400).json({ 
      success: false, 
      message: 'Nama item inventaris harus diisi' 
    });
    return;
  }

  // Create inventaris item
  const newInventarisItem = await Inventaris.create({
    itemName,
    qty: qty || 0,
    unit
  });

  res.status(201).json(newInventarisItem);
}));

// PUT /api/inventaris/:id - Update inventaris item (protected by middleware protect and adminOnly)
router.put('/:id', protect, adminOnly, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { itemName, qty, unit } = req.body;
  
  const inventarisItem = await Inventaris.findByPk(id);
  if (!inventarisItem) {
    res.status(404).json({ message: 'Item Inventaris tidak ditemukan' });
    return;
  }

  await inventarisItem.update({ 
    itemName: itemName || inventarisItem.itemName,
    qty: qty !== undefined ? qty : inventarisItem.qty,
    unit: unit !== undefined ? unit : inventarisItem.unit
  });
  
  res.status(200).json(inventarisItem);
}));

// DELETE /api/inventaris/:id - Delete inventaris item (protected by middleware protect and adminOnly)
router.delete('/:id', protect, adminOnly, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const inventarisItem = await Inventaris.findByPk(id);
  
  if (!inventarisItem) {
    res.status(404).json({ message: 'Item Inventaris tidak ditemukan' });
    return;
  }

  await inventarisItem.destroy();
  res.status(204).send();
}));

module.exports = router; 