const asyncHandler = require('express-async-handler');
const { FabricType } = require('../models');
const { Op } = require('sequelize');

// @desc    Get all fabric types
// @route   GET /api/fabric-types
// @access  Private
const getFabricTypes = asyncHandler(async (req, res) => {
    try {
        const fabricTypes = await FabricType.findAll({
            where: { isActive: true },
            order: [['fabricName', 'ASC']]
        });
        
        res.status(200).json(fabricTypes);
    } catch (error) {
        console.error('Error fetching fabric types:', error);
        res.status(500).json({ message: 'Failed to fetch fabric types' });
    }
});

// @desc    Get fabric type by ID
// @route   GET /api/fabric-types/:id
// @access  Private
const getFabricTypeById = asyncHandler(async (req, res) => {
    try {
        const fabricType = await FabricType.findByPk(req.params.id);
        
        if (!fabricType) {
            return res.status(404).json({ message: 'Fabric type not found' });
        }
        
        res.status(200).json(fabricType);
    } catch (error) {
        console.error('Error fetching fabric type:', error);
        res.status(500).json({ message: 'Failed to fetch fabric type' });
    }
});

// @desc    Search fabric types by name
// @route   GET /api/fabric-types/search/:fabricName
// @access  Private
const searchFabricTypes = asyncHandler(async (req, res) => {
    try {
        const { fabricName } = req.params;
        const fabricTypes = await FabricType.searchByName(fabricName);
        
        res.status(200).json(fabricTypes);
    } catch (error) {
        console.error('Error searching fabric types:', error);
        res.status(500).json({ message: 'Failed to search fabric types' });
    }
});

// @desc    Get fabric code by fabric name
// @route   GET /api/fabric-types/lookup/:fabricName
// @access  Private
const getFabricCodeByName = asyncHandler(async (req, res) => {
    try {
        const { fabricName } = req.params;
        const fabricCode = await FabricType.findByFabricName(fabricName);
        
        if (!fabricCode) {
            return res.status(404).json({ message: 'Fabric type not found' });
        }
        
        res.status(200).json({ fabricName, fabricCode });
    } catch (error) {
        console.error('Error looking up fabric code:', error);
        res.status(500).json({ message: 'Failed to lookup fabric code' });
    }
});

// @desc    Create new fabric type
// @route   POST /api/fabric-types
// @access  Private/Admin
const createFabricType = asyncHandler(async (req, res) => {
    try {
        const { fabricName, fabricCode, description } = req.body;
        
        // Validation
        if (!fabricName || !fabricCode) {
            return res.status(400).json({ message: 'Fabric name and code are required' });
        }
        
        // Check for duplicates
        const existingName = await FabricType.findOne({ where: { fabricName } });
        if (existingName) {
            return res.status(400).json({ message: 'Fabric name already exists' });
        }
        
        const existingCode = await FabricType.findOne({ where: { fabricCode } });
        if (existingCode) {
            return res.status(400).json({ message: 'Fabric code already exists' });
        }
        
        const fabricType = await FabricType.create({
            fabricName,
            fabricCode,
            description
        });
        
        res.status(201).json(fabricType);
    } catch (error) {
        console.error('Error creating fabric type:', error);
        res.status(500).json({ message: 'Failed to create fabric type' });
    }
});

// @desc    Update fabric type
// @route   PUT /api/fabric-types/:id
// @access  Private/Admin
const updateFabricType = asyncHandler(async (req, res) => {
    try {
        const { fabricName, fabricCode, description, isActive } = req.body;
        
        const fabricType = await FabricType.findByPk(req.params.id);
        if (!fabricType) {
            return res.status(404).json({ message: 'Fabric type not found' });
        }
        
        // Check for duplicates (excluding current record)
        if (fabricName && fabricName !== fabricType.fabricName) {
            const existingName = await FabricType.findOne({ 
                where: { 
                    fabricName,
                    id: { [Op.ne]: req.params.id }
                } 
            });
            if (existingName) {
                return res.status(400).json({ message: 'Fabric name already exists' });
            }
        }
        
        if (fabricCode && fabricCode !== fabricType.fabricCode) {
            const existingCode = await FabricType.findOne({ 
                where: { 
                    fabricCode,
                    id: { [Op.ne]: req.params.id }
                } 
            });
            if (existingCode) {
                return res.status(400).json({ message: 'Fabric code already exists' });
            }
        }
        
        await fabricType.update({
            fabricName: fabricName || fabricType.fabricName,
            fabricCode: fabricCode || fabricType.fabricCode,
            description: description !== undefined ? description : fabricType.description,
            isActive: isActive !== undefined ? isActive : fabricType.isActive
        });
        
        res.status(200).json(fabricType);
    } catch (error) {
        console.error('Error updating fabric type:', error);
        res.status(500).json({ message: 'Failed to update fabric type' });
    }
});

// @desc    Delete fabric type (soft delete)
// @route   DELETE /api/fabric-types/:id
// @access  Private/Admin
const deleteFabricType = asyncHandler(async (req, res) => {
    try {
        const fabricType = await FabricType.findByPk(req.params.id);
        if (!fabricType) {
            return res.status(404).json({ message: 'Fabric type not found' });
        }
        
        // Soft delete by setting isActive to false
        await fabricType.update({ isActive: false });
        
        res.status(200).json({ message: 'Fabric type deleted successfully' });
    } catch (error) {
        console.error('Error deleting fabric type:', error);
        res.status(500).json({ message: 'Failed to delete fabric type' });
    }
});

module.exports = {
    getFabricTypes,
    getFabricTypeById,
    searchFabricTypes,
    getFabricCodeByName,
    createFabricType,
    updateFabricType,
    deleteFabricType
}; 