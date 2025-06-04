const express = require('express');
const asyncHandler = require('express-async-handler');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { RemainingFabric, Material } = require('../models');

const router = express.Router();

// GET /api/remaining-fabrics - Get all remaining fabric entries (protected by middleware protect)
router.get('/', protect, asyncHandler(async (req, res) => {
  const remainingFabrics = await RemainingFabric.findAll({
    include: [{ model: Material, attributes: ['id', 'name', 'code', 'unit'] }]
  });
  res.status(200).json(remainingFabrics);
}));

// GET /api/remaining-fabrics/:id - Get single remaining fabric entry by ID (protected by middleware protect)
router.get('/:id', protect, asyncHandler(async (req, res) => {
  const remainingFabric = await RemainingFabric.findByPk(req.params.id, {
    include: [{ model: Material, attributes: ['id', 'name', 'code', 'unit'] }]
  });
  if (!remainingFabric) {
    res.status(404).json({ message: 'Entri sisa kain tidak ditemukan' });
    return;
  }
  res.status(200).json(remainingFabric);
}));

// POST /api/remaining-fabrics - Create new remaining fabric entry (protected by middleware protect and adminOnly)
router.post('/', protect, adminOnly, asyncHandler(async (req, res) => {
  const { materialId, qtyRemaining, photoUrl, note } = req.body;

  // Validate required fields
  if (!materialId || qtyRemaining === undefined) {
    res.status(400).json({ 
      success: false, 
      message: 'Material ID dan quantity sisa kain harus diisi' 
    });
    return;
  }

  // Check if material exists
  const material = await Material.findByPk(materialId);
  if (!material) {
    res.status(404).json({ message: 'Material tidak ditemukan' });
    return;
  }

  // Create remaining fabric entry
  const newRemainingFabric = await RemainingFabric.create({
    materialId,
    qtyRemaining,
    photoUrl,
    note
  });

  // Fetch the complete entry with related data
  const completeEntry = await RemainingFabric.findByPk(newRemainingFabric.id, {
    include: [{ model: Material, attributes: ['id', 'name', 'code', 'unit'] }]
  });

  res.status(201).json(completeEntry);
}));

// PUT /api/remaining-fabrics/:id - Update remaining fabric entry (protected by middleware protect and adminOnly)
router.put('/:id', protect, adminOnly, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { materialId, qtyRemaining, photoUrl, note } = req.body;
  
  const remainingFabric = await RemainingFabric.findByPk(id);
  if (!remainingFabric) {
    res.status(404).json({ message: 'Entri sisa kain tidak ditemukan' });
    return;
  }

  // Check if material exists if materialId is being updated
  if (materialId !== undefined && remainingFabric.materialId !== materialId) {
    const material = await Material.findByPk(materialId);
    if (!material) {
      res.status(404).json({ message: 'Material baru tidak ditemukan' });
      return;
    }
  }

  await remainingFabric.update({ 
    materialId: materialId !== undefined ? materialId : remainingFabric.materialId,
    qtyRemaining: qtyRemaining !== undefined ? qtyRemaining : remainingFabric.qtyRemaining,
    photoUrl: photoUrl !== undefined ? photoUrl : remainingFabric.photoUrl,
    note: note !== undefined ? note : remainingFabric.note
  });
  
  // Fetch the updated entry with related data
  const updatedEntry = await RemainingFabric.findByPk(id, {
     include: [{ model: Material, attributes: ['id', 'name', 'code', 'unit'] }]
  });

  res.status(200).json(updatedEntry);
}));

// DELETE /api/remaining-fabrics/:id - Delete remaining fabric entry (protected by middleware protect and adminOnly)
router.delete('/:id', protect, adminOnly, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const remainingFabric = await RemainingFabric.findByPk(id);
  
  if (!remainingFabric) {
    res.status(404).json({ message: 'Entri sisa kain tidak ditemukan' });
    return;
  }

  await remainingFabric.destroy();
  res.status(204).send();
}));

module.exports = router; 