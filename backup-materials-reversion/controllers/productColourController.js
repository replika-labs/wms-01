const asyncHandler = require('express-async-handler');
const { ProductColour, Product } = require('../models');
const { Op } = require('sequelize');

// @desc    Get all product colours for a product
// @route   GET /api/products/:productId/colours
// @access  Private
const getProductColours = asyncHandler(async (req, res) => {
    try {
        const { productId } = req.params;
        
        // Verify product exists
        const product = await Product.findByPk(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        
        const colours = await ProductColour.findAll({
            where: { productId },
            order: [['colourName', 'ASC']]
        });
        
        res.status(200).json(colours);
    } catch (error) {
        console.error('Error fetching product colours:', error);
        res.status(500).json({ message: 'Failed to fetch product colours' });
    }
});

// @desc    Get single product colour
// @route   GET /api/products/:productId/colours/:id
// @access  Private
const getProductColourById = asyncHandler(async (req, res) => {
    try {
        const { productId, id } = req.params;
        
        const colour = await ProductColour.findOne({
            where: { id, productId },
            include: [{ model: Product }]
        });
        
        if (!colour) {
            return res.status(404).json({ message: 'Product colour not found' });
        }
        
        res.status(200).json(colour);
    } catch (error) {
        console.error('Error fetching product colour:', error);
        res.status(500).json({ message: 'Failed to fetch product colour' });
    }
});

// @desc    Create new product colour
// @route   POST /api/products/:productId/colours
// @access  Private
const createProductColour = asyncHandler(async (req, res) => {
    try {
        const { productId } = req.params;
        const { code, colourName, notes } = req.body;
        
        // Verify product exists
        const product = await Product.findByPk(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        
        // Validation
        if (!code || !colourName) {
            return res.status(400).json({ message: 'Code and colour name are required' });
        }
        
        // Check for duplicate code within the same product
        const existingColour = await ProductColour.findOne({
            where: { productId, code }
        });
        if (existingColour) {
            return res.status(400).json({ message: 'Colour code already exists for this product' });
        }
        
        const colour = await ProductColour.create({
            productId,
            code,
            colourName,
            notes
        });
        
        res.status(201).json(colour);
    } catch (error) {
        console.error('Error creating product colour:', error);
        res.status(500).json({ 
            message: 'Failed to create product colour',
            error: error.message 
        });
    }
});

// @desc    Update product colour
// @route   PUT /api/products/:productId/colours/:id
// @access  Private
const updateProductColour = asyncHandler(async (req, res) => {
    try {
        const { productId, id } = req.params;
        const { code, colourName, notes, isActive } = req.body;
        
        const colour = await ProductColour.findOne({
            where: { id, productId }
        });
        
        if (!colour) {
            return res.status(404).json({ message: 'Product colour not found' });
        }
        
        // Check for duplicate code if being updated
        if (code && code !== colour.code) {
            const existingColour = await ProductColour.findOne({
                where: { 
                    productId, 
                    code,
                    id: { [Op.ne]: id }
                }
            });
            if (existingColour) {
                return res.status(400).json({ message: 'Colour code already exists for this product' });
            }
        }
        
        await colour.update({
            code: code !== undefined ? code : colour.code,
            colourName: colourName !== undefined ? colourName : colour.colourName,
            notes: notes !== undefined ? notes : colour.notes,
            isActive: isActive !== undefined ? isActive : colour.isActive
        });
        
        res.status(200).json(colour);
    } catch (error) {
        console.error('Error updating product colour:', error);
        res.status(500).json({ 
            message: 'Failed to update product colour',
            error: error.message 
        });
    }
});

// @desc    Delete product colour
// @route   DELETE /api/products/:productId/colours/:id
// @access  Private
const deleteProductColour = asyncHandler(async (req, res) => {
    try {
        const { productId, id } = req.params;
        
        const colour = await ProductColour.findOne({
            where: { id, productId }
        });
        
        if (!colour) {
            return res.status(404).json({ message: 'Product colour not found' });
        }
        
        await colour.destroy();
        
        res.status(200).json({ message: 'Product colour deleted successfully' });
    } catch (error) {
        console.error('Error deleting product colour:', error);
        res.status(500).json({ message: 'Failed to delete product colour' });
    }
});

module.exports = {
    getProductColours,
    getProductColourById,
    createProductColour,
    updateProductColour,
    deleteProductColour
}; 