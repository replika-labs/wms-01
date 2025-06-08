const asyncHandler = require('express-async-handler');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// @desc    Get all materials
// @route   GET /api/materials
// @access  Private
const getMaterials = asyncHandler(async (req, res) => {
    try {
        const materials = await prisma.material.findMany({
            include: {
                materialType: {
                    select: {
                        id: true,
                        name: true,
                        category: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.status(200).json(materials);
    } catch (error) {
        console.error('Error fetching materials:', error);
        res.status(500).json({ message: 'Failed to fetch materials' });
    }
});

// @desc    Get material by ID
// @route   GET /api/materials/:id
// @access  Private
const getMaterialById = asyncHandler(async (req, res) => {
    try {
        const material = await prisma.material.findUnique({
            where: { id: parseInt(req.params.id) },
            include: {
                materialType: {
                    select: {
                        id: true,
                        name: true,
                        category: true
                    }
                }
            }
        });

        if (!material) {
            return res.status(404).json({ message: 'Material not found' });
        }

        res.status(200).json(material);
    } catch (error) {
        console.error('Error fetching material:', error);
        res.status(500).json({ message: 'Failed to fetch material' });
    }
});

// @desc    Create new material
// @route   POST /api/materials
// @access  Private
const createMaterial = asyncHandler(async (req, res) => {
    try {
        const {
            name,
            materialTypeId,
            description,
            unit,
            qtyOnHand,
            pricePerUnit,
            supplier,
            minStock,
            maxStock,
            reorderPoint,
            reorderQty,
            location
        } = req.body;

        // Validation
        if (!name) {
            return res.status(400).json({
                message: 'Name is required'
            });
        }

        // Validate material type exists if provided
        if (materialTypeId) {
            const materialType = await prisma.materialType.findUnique({
                where: { id: parseInt(materialTypeId) }
            });
            if (!materialType) {
                return res.status(400).json({
                    message: `Material type not found. Please select a valid material type.`
                });
            }
        }

        const materialData = {
            name,
            materialTypeId: materialTypeId ? parseInt(materialTypeId) : null,
            description,
            unit: unit || 'pcs',
            qtyOnHand: qtyOnHand !== undefined ? parseFloat(qtyOnHand) : 0,
            pricePerUnit: pricePerUnit ? parseFloat(pricePerUnit) : 0,
            supplier,
            minStock: minStock ? parseFloat(minStock) : 0,
            maxStock: maxStock ? parseFloat(maxStock) : 0,
            reorderPoint: reorderPoint ? parseFloat(reorderPoint) : 0,
            reorderQty: reorderQty ? parseFloat(reorderQty) : 0,
            location
        };

        const material = await prisma.material.create({
            data: materialData,
            include: {
                materialType: {
                    select: {
                        id: true,
                        name: true,
                        category: true
                    }
                }
            }
        });

        res.status(201).json(material);
    } catch (error) {
        console.error('Error creating material:', error);
        res.status(500).json({
            message: 'Failed to create material',
            error: error.message
        });
    }
});

// @desc    Update material
// @route   PUT /api/materials/:id
// @access  Private
const updateMaterial = asyncHandler(async (req, res) => {
    try {
        const materialId = parseInt(req.params.id);
        const material = await prisma.material.findUnique({
            where: { id: materialId }
        });

        if (!material) {
            return res.status(404).json({ message: 'Material not found' });
        }

        const {
            name,
            materialTypeId,
            description,
            unit,
            qtyOnHand,
            pricePerUnit,
            supplier,
            minStock,
            maxStock,
            reorderPoint,
            reorderQty,
            location
        } = req.body;

        // Validate material type if changed
        if (materialTypeId && parseInt(materialTypeId) !== material.materialTypeId) {
            const materialType = await prisma.materialType.findUnique({
                where: { id: parseInt(materialTypeId) }
            });
            if (!materialType) {
                return res.status(400).json({
                    message: `Material type not found. Please select a valid material type.`
                });
            }
        }

        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (materialTypeId !== undefined) updateData.materialTypeId = materialTypeId ? parseInt(materialTypeId) : null;
        if (description !== undefined) updateData.description = description;
        if (unit !== undefined) updateData.unit = unit;
        if (qtyOnHand !== undefined) updateData.qtyOnHand = parseFloat(qtyOnHand);
        if (pricePerUnit !== undefined) updateData.pricePerUnit = pricePerUnit ? parseFloat(pricePerUnit) : 0;
        if (supplier !== undefined) updateData.supplier = supplier;
        if (minStock !== undefined) updateData.minStock = parseFloat(minStock);
        if (maxStock !== undefined) updateData.maxStock = parseFloat(maxStock);
        if (reorderPoint !== undefined) updateData.reorderPoint = parseFloat(reorderPoint);
        if (reorderQty !== undefined) updateData.reorderQty = parseFloat(reorderQty);
        if (location !== undefined) updateData.location = location;

        const updatedMaterial = await prisma.material.update({
            where: { id: materialId },
            data: updateData,
            include: {
                materialType: {
                    select: {
                        id: true,
                        name: true,
                        category: true
                    }
                }
            }
        });

        res.status(200).json(updatedMaterial);
    } catch (error) {
        console.error('Error updating material:', error);
        res.status(500).json({
            message: 'Failed to update material',
            error: error.message
        });
    }
});

// @desc    Delete material
// @route   DELETE /api/materials/:id
// @access  Private
const deleteMaterial = asyncHandler(async (req, res) => {
    try {
        const materialId = parseInt(req.params.id);
        const material = await prisma.material.findUnique({
            where: { id: materialId }
        });

        if (!material) {
            return res.status(404).json({ message: 'Material not found' });
        }

        await prisma.material.delete({
            where: { id: materialId }
        });

        res.status(200).json({ message: 'Material deleted successfully' });
    } catch (error) {
        console.error('Error deleting material:', error);
        res.status(500).json({ message: 'Failed to delete material' });
    }
});

// @desc    Update material stock
// @route   PATCH /api/materials/:id/stock
// @access  Private
const updateMaterialStock = asyncHandler(async (req, res) => {
    try {
        const { quantity, operation = 'add' } = req.body;

        if (quantity === undefined || quantity === null) {
            return res.status(400).json({ message: 'Quantity is required' });
        }

        const materialId = parseInt(req.params.id);
        const material = await prisma.material.findUnique({
            where: { id: materialId }
        });

        if (!material) {
            return res.status(404).json({ message: 'Material not found' });
        }

        const quantityNum = parseFloat(quantity);
        let newStock;

        if (operation === 'add') {
            newStock = (material.qtyOnHand || 0) + quantityNum;
        } else if (operation === 'subtract') {
            newStock = (material.qtyOnHand || 0) - quantityNum;
        } else {
            newStock = quantityNum; // Set operation
        }

        // Ensure stock doesn't go below 0
        newStock = Math.max(0, newStock);

        const updatedMaterial = await prisma.material.update({
            where: { id: materialId },
            data: { qtyOnHand: newStock }
        });

        res.status(200).json({
            message: 'Stock updated successfully',
            material: updatedMaterial,
            previousStock: material.qtyOnHand,
            newStock: newStock
        });
    } catch (error) {
        console.error('Error updating material stock:', error);
        res.status(500).json({ message: 'Failed to update stock' });
    }
});

// @desc    Get materials with low stock
// @route   GET /api/materials/low-stock
// @access  Private
const getLowStockMaterials = asyncHandler(async (req, res) => {
    try {
        const materials = await prisma.material.findMany({
            where: {
                qtyOnHand: {
                    lte: prisma.material.fields.minStock
                }
            },
            include: {
                materialType: {
                    select: {
                        id: true,
                        name: true,
                        category: true
                    }
                }
            },
            orderBy: { qtyOnHand: 'asc' }
        });

        res.status(200).json(materials);
    } catch (error) {
        console.error('Error fetching low stock materials:', error);
        // Fallback: get materials where qtyOnHand <= minStock using raw query approach
        try {
            const materials = await prisma.$queryRaw`
                SELECT * FROM "materials" 
                WHERE "qtyOnHand" <= "minStock" 
                ORDER BY "qtyOnHand" ASC
            `;
            res.status(200).json(materials);
        } catch (fallbackError) {
            console.error('Fallback query also failed:', fallbackError);
            res.status(500).json({ message: 'Failed to fetch low stock materials' });
        }
    }
});

// @desc    Regenerate material code
// @route   POST /api/materials/:id/regenerate-code
// @access  Private
const regenerateMaterialCode = asyncHandler(async (req, res) => {
    try {
        const materialId = parseInt(req.params.id);
        const material = await prisma.material.findUnique({
            where: { id: materialId }
        });

        if (!material) {
            return res.status(404).json({ message: 'Material not found' });
        }

        const oldCode = material.code;

        // Generate new code based on material properties
        const timestamp = Date.now().toString().slice(-6);
        const namePrefix = material.name ? material.name.substring(0, 3).toUpperCase() : 'MAT';
        const newCode = `${namePrefix}-${timestamp}`;

        const updatedMaterial = await prisma.material.update({
            where: { id: materialId },
            data: { code: newCode }
        });

        res.status(200).json({
            message: 'Code regenerated successfully',
            oldCode,
            newCode,
            material: updatedMaterial
        });
    } catch (error) {
        console.error('Error regenerating material code:', error);
        res.status(500).json({
            message: 'Failed to regenerate code',
            error: error.message
        });
    }
});

module.exports = {
    getMaterials,
    getMaterialById,
    createMaterial,
    updateMaterial,
    deleteMaterial,
    updateMaterialStock,
    getLowStockMaterials,
    regenerateMaterialCode
}; 
