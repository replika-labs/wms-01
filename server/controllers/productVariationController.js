const asyncHandler = require('express-async-handler');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// @desc    Get all product variations
// @route   GET /api/products/:productId/variations
// @access  Private
const getProductVariations = asyncHandler(async (req, res) => {
    try {
        const productId = parseInt(req.params.productId);

        const variations = await prisma.productVariation.findMany({
            where: { productId },
            orderBy: { size: 'asc' }
        });

        res.status(200).json(variations);
    } catch (error) {
        console.error('Error fetching product variations:', error);
        res.status(500).json({ message: 'Failed to fetch product variations' });
    }
});

// @desc    Get product variation by ID
// @route   GET /api/products/:productId/variations/:id
// @access  Private
const getProductVariationById = asyncHandler(async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const productId = parseInt(req.params.productId);

        const variation = await prisma.productVariation.findFirst({
            where: {
                id,
                productId
            }
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

// @desc    Search product variations by size
// @route   GET /api/products/:productId/variations/search/:size
// @access  Private
const searchProductVariations = asyncHandler(async (req, res) => {
    try {
        const productId = parseInt(req.params.productId);
        const { size } = req.params;

        const variations = await prisma.productVariation.findMany({
            where: {
                productId,
                size: {
                    contains: size,
                    mode: 'insensitive'
                }
            },
            orderBy: { size: 'asc' }
        });

        res.status(200).json(variations);
    } catch (error) {
        console.error('Error searching product variations:', error);
        res.status(500).json({ message: 'Failed to search product variations' });
    }
});

// @desc    Create new product variation
// @route   POST /api/products/:productId/variations
// @access  Private/Admin
const createProductVariation = asyncHandler(async (req, res) => {
    try {
        const productId = parseInt(req.params.productId);
        const { size, priceModifier, isActive } = req.body;

        // Validation
        if (!size) {
            return res.status(400).json({ message: 'Size is required' });
        }

        // Check if product exists
        const product = await prisma.product.findUnique({
            where: { id: productId }
        });
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Check for duplicate size for this product
        const existingVariation = await prisma.productVariation.findFirst({
            where: {
                productId,
                size
            }
        });
        if (existingVariation) {
            return res.status(400).json({ message: 'Size already exists for this product' });
        }

        const variation = await prisma.productVariation.create({
            data: {
                productId,
                size,
                priceModifier: priceModifier || 0,
                isActive: isActive !== undefined ? isActive : true
            }
        });

        res.status(201).json(variation);
    } catch (error) {
        console.error('Error creating product variation:', error);
        res.status(500).json({ message: 'Failed to create product variation' });
    }
});

// @desc    Update product variation
// @route   PUT /api/products/:productId/variations/:id
// @access  Private/Admin
const updateProductVariation = asyncHandler(async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const productId = parseInt(req.params.productId);
        const { size, priceModifier, isActive } = req.body;

        const variation = await prisma.productVariation.findFirst({
            where: {
                id,
                productId
            }
        });
        if (!variation) {
            return res.status(404).json({ message: 'Product variation not found' });
        }

        // Check for duplicate size (excluding current record)
        if (size && size !== variation.size) {
            const existingVariation = await prisma.productVariation.findFirst({
                where: {
                    productId,
                    size,
                    id: { not: id }
                }
            });
            if (existingVariation) {
                return res.status(400).json({ message: 'Size already exists for this product' });
            }
        }

        const updatedVariation = await prisma.productVariation.update({
            where: { id },
            data: {
                size: size || variation.size,
                priceModifier: priceModifier !== undefined ? priceModifier : variation.priceModifier,
                isActive: isActive !== undefined ? isActive : variation.isActive
            }
        });

        res.status(200).json(updatedVariation);
    } catch (error) {
        console.error('Error updating product variation:', error);
        res.status(500).json({ message: 'Failed to update product variation' });
    }
});

// @desc    Delete product variation
// @route   DELETE /api/products/:productId/variations/:id
// @access  Private/Admin
const deleteProductVariation = asyncHandler(async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const productId = parseInt(req.params.productId);

        const variation = await prisma.productVariation.findFirst({
            where: {
                id,
                productId
            }
        });
        if (!variation) {
            return res.status(404).json({ message: 'Product variation not found' });
        }

        await prisma.productVariation.delete({
            where: { id }
        });

        res.status(200).json({ message: 'Product variation deleted successfully' });
    } catch (error) {
        console.error('Error deleting product variation:', error);
        res.status(500).json({ message: 'Failed to delete product variation' });
    }
});

module.exports = {
    getProductVariations,
    getProductVariationById,
    searchProductVariations,
    createProductVariation,
    updateProductVariation,
    deleteProductVariation
}; 