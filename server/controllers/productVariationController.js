const asyncHandler = require('express-async-handler');
const { ProductVariation, Product } = require('../models');
const { Op } = require('sequelize');

// @desc    Get all product variations for a product
// @route   GET /api/products/:productId/variations
// @access  Private
const getProductVariations = asyncHandler(async (req, res) => {
    try {
        const { productId } = req.params;
        
        // Verify product exists
        const product = await Product.findByPk(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        
        const variations = await ProductVariation.findAll({
            where: { productId },
            order: [['size', 'ASC']]
        });
        
        res.status(200).json(variations);
    } catch (error) {
        console.error('Error fetching product variations:', error);
        res.status(500).json({ message: 'Failed to fetch product variations' });
    }
});

// @desc    Get single product variation
// @route   GET /api/products/:productId/variations/:id
// @access  Private
const getProductVariationById = asyncHandler(async (req, res) => {
    try {
        const { productId, id } = req.params;
        
        const variation = await ProductVariation.findOne({
            where: { id, productId },
            include: [{ model: Product }]
        });
        
        if (!variation) {
            return res.status(404).json({ message: 'Product variation not found' });
        }
        
        res.status(200).json(variation);
    } catch (error) {
        console.error('Error fetching product variation:', error);
        res.status(500).json({ message: 'Failed to fetch product variation' });
    }
});

// @desc    Create new product variation
// @route   POST /api/products/:productId/variations
// @access  Private
const createProductVariation = asyncHandler(async (req, res) => {
    try {
        const { productId } = req.params;
        const { code, size, additionalPrice } = req.body;
        
        // Verify product exists
        const product = await Product.findByPk(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        
        // Validation
        if (!code || !size) {
            return res.status(400).json({ message: 'Code and size are required' });
        }
        
        // Check for duplicate code within the same product
        const existingVariation = await ProductVariation.findOne({
            where: { productId, code }
        });
        if (existingVariation) {
            return res.status(400).json({ message: 'Variation code already exists for this product' });
        }
        
        const variation = await ProductVariation.create({
            productId,
            code,
            size,
            additionalPrice: additionalPrice || 0
        });
        
        res.status(201).json(variation);
    } catch (error) {
        console.error('Error creating product variation:', error);
        res.status(500).json({ 
            message: 'Failed to create product variation',
            error: error.message 
        });
    }
});

// @desc    Update product variation
// @route   PUT /api/products/:productId/variations/:id
// @access  Private
const updateProductVariation = asyncHandler(async (req, res) => {
    try {
        const { productId, id } = req.params;
        const { code, size, additionalPrice, isActive } = req.body;
        
        const variation = await ProductVariation.findOne({
            where: { id, productId }
        });
        
        if (!variation) {
            return res.status(404).json({ message: 'Product variation not found' });
        }
        
        // Check for duplicate code if being updated
        if (code && code !== variation.code) {
            const existingVariation = await ProductVariation.findOne({
                where: { 
                    productId, 
                    code,
                    id: { [Op.ne]: id }
                }
            });
            if (existingVariation) {
                return res.status(400).json({ message: 'Variation code already exists for this product' });
            }
        }
        
        await variation.update({
            code: code !== undefined ? code : variation.code,
            size: size !== undefined ? size : variation.size,
            additionalPrice: additionalPrice !== undefined ? additionalPrice : variation.additionalPrice,
            isActive: isActive !== undefined ? isActive : variation.isActive
        });
        
        res.status(200).json(variation);
    } catch (error) {
        console.error('Error updating product variation:', error);
        res.status(500).json({ 
            message: 'Failed to update product variation',
            error: error.message 
        });
    }
});

// @desc    Delete product variation
// @route   DELETE /api/products/:productId/variations/:id
// @access  Private
const deleteProductVariation = asyncHandler(async (req, res) => {
    try {
        const { productId, id } = req.params;
        
        const variation = await ProductVariation.findOne({
            where: { id, productId }
        });
        
        if (!variation) {
            return res.status(404).json({ message: 'Product variation not found' });
        }
        
        await variation.destroy();
        
        res.status(200).json({ message: 'Product variation deleted successfully' });
    } catch (error) {
        console.error('Error deleting product variation:', error);
        res.status(500).json({ message: 'Failed to delete product variation' });
    }
});

module.exports = {
    getProductVariations,
    getProductVariationById,
    createProductVariation,
    updateProductVariation,
    deleteProductVariation
}; 