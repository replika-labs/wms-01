const asyncHandler = require('express-async-handler');
const { Material, FabricType } = require('../models');
const { Op } = require('sequelize');

// @desc    Get all materials
// @route   GET /api/materials
// @access  Private
const getMaterials = asyncHandler(async (req, res) => {
    try {
        const materials = await Material.findAll({
            order: [['createdAt', 'DESC']]
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
        const material = await Material.findByPk(req.params.id);
        
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
            fabricTypeColor,
            purchaseDate,
            numberOfRolls,
            totalUnits,
            unit,
            store,
            image,
            price,
            qtyOnHand,
            safetyStock,
            description,
            code // Optional manual code override
        } = req.body;
        
        // Validation - only require new fields for new materials with enhanced structure
        if (!name) {
            return res.status(400).json({ 
                message: 'Name is required' 
            });
        }
        
        // If any of the new fields are provided, require all of them
        const hasNewFields = fabricTypeColor || purchaseDate || totalUnits || store;
        if (hasNewFields && (!fabricTypeColor || !purchaseDate || !totalUnits || !store)) {
            return res.status(400).json({ 
                message: 'For enhanced materials, all fields are required: fabricTypeColor, purchaseDate, totalUnits, store' 
            });
        }
        
        // Validate fabric type exists if provided
        if (fabricTypeColor) {
            const fabricCode = await FabricType.findByFabricName(fabricTypeColor);
            if (!fabricCode) {
                return res.status(400).json({ 
                    message: `Fabric type "${fabricTypeColor}" not found. Please add it to fabric types first.` 
                });
            }
        }
        
        // Check if manual code is unique
        if (code) {
            const existingMaterial = await Material.findOne({ where: { code } });
            if (existingMaterial) {
                return res.status(400).json({ 
                    message: 'Material code already exists' 
                });
            }
        }
        
        const materialData = {
            name,
            fabricTypeColor,
            purchaseDate,
            numberOfRolls: numberOfRolls || 1,
            totalUnits,
            unit: unit || 'pcs',
            store,
            image,
            price,
            qtyOnHand: qtyOnHand !== undefined ? qtyOnHand : totalUnits, // Default to totalUnits
            safetyStock: safetyStock || 0,
            description
        };
        
        // Add manual code if provided
        if (code) {
            materialData.code = code;
        }
        
        const material = await Material.create(materialData);
        
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
        const material = await Material.findByPk(req.params.id);
        if (!material) {
            return res.status(404).json({ message: 'Material not found' });
        }
        
        const {
            name,
            fabricTypeColor,
            purchaseDate,
            numberOfRolls,
            totalUnits,
            unit,
            store,
            image,
            price,
            qtyOnHand,
            safetyStock,
            description,
            code
        } = req.body;
        
        // Validate fabric type if changed
        if (fabricTypeColor && fabricTypeColor !== material.fabricTypeColor) {
            const fabricCode = await FabricType.findByFabricName(fabricTypeColor);
            if (!fabricCode) {
                return res.status(400).json({ 
                    message: `Fabric type "${fabricTypeColor}" not found. Please add it to fabric types first.` 
                });
            }
        }
        
        // Check if code is unique if being updated manually
        if (code && code !== material.code) {
            const existingMaterial = await Material.findOne({ 
                where: { 
                    code,
                    id: { [Op.ne]: req.params.id }
                } 
            });
            if (existingMaterial) {
                return res.status(400).json({ 
                    message: 'Material code already exists' 
                });
            }
        }
        
        await material.update({
            name: name !== undefined ? name : material.name,
            fabricTypeColor: fabricTypeColor !== undefined ? fabricTypeColor : material.fabricTypeColor,
            purchaseDate: purchaseDate !== undefined ? purchaseDate : material.purchaseDate,
            numberOfRolls: numberOfRolls !== undefined ? numberOfRolls : material.numberOfRolls,
            totalUnits: totalUnits !== undefined ? totalUnits : material.totalUnits,
            unit: unit !== undefined ? unit : material.unit,
            store: store !== undefined ? store : material.store,
            image: image !== undefined ? image : material.image,
            price: price !== undefined ? price : material.price,
            qtyOnHand: qtyOnHand !== undefined ? qtyOnHand : material.qtyOnHand,
            safetyStock: safetyStock !== undefined ? safetyStock : material.safetyStock,
            description: description !== undefined ? description : material.description,
            code: code !== undefined ? code : material.code
        });
        
        res.status(200).json(material);
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
        const material = await Material.findByPk(req.params.id);
        if (!material) {
            return res.status(404).json({ message: 'Material not found' });
        }
        
        await material.destroy();
        
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
        
        const material = await Material.findByPk(req.params.id);
        if (!material) {
            return res.status(404).json({ message: 'Material not found' });
        }
        
        const newStock = material.updateStock(quantity, operation);
        await material.save();
        
        res.status(200).json({
            message: 'Stock updated successfully',
            material,
            previousStock: operation === 'add' ? newStock - quantity : 
                          operation === 'subtract' ? newStock + quantity : material.qtyOnHand,
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
        const materials = await Material.findAll({
            where: {
                qtyOnHand: {
                    [Op.lte]: sequelize.col('safetyStock')
                }
            },
            order: [['qtyOnHand', 'ASC']]
        });
        
        res.status(200).json(materials);
    } catch (error) {
        console.error('Error fetching low stock materials:', error);
        res.status(500).json({ message: 'Failed to fetch low stock materials' });
    }
});

// @desc    Regenerate material code
// @route   POST /api/materials/:id/regenerate-code
// @access  Private
const regenerateMaterialCode = asyncHandler(async (req, res) => {
    try {
        const material = await Material.findByPk(req.params.id);
        if (!material) {
            return res.status(404).json({ message: 'Material not found' });
        }
        
        const oldCode = material.code;
        const newCode = await material.regenerateCode();
        await material.save();
        
        res.status(200).json({
            message: 'Code regenerated successfully',
            oldCode,
            newCode,
            material
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