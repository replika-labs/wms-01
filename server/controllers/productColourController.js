const asyncHandler = require('express-async-handler');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// @desc    Get all product colours
// @route   GET /api/products/:productId/colours
// @access  Private
const getProductColours = asyncHandler(async (req, res) => {
    try {
        const productId = parseInt(req.params.productId);

        const colours = await prisma.productColour.findMany({
            where: { productId },
            orderBy: { colourName: 'asc' }
        });

        res.status(200).json(colours);
    } catch (error) {
        console.error('Error fetching product colours:', error);
        res.status(500).json({ message: 'Failed to fetch product colours' });
    }
});

// @desc    Get product colour by ID
// @route   GET /api/products/:productId/colours/:id
// @access  Private
const getProductColourById = asyncHandler(async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const productId = parseInt(req.params.productId);

        const colour = await prisma.productColour.findFirst({
            where: {
                id,
                productId
            }
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

// @desc    Search product colours by name
// @route   GET /api/products/:productId/colours/search/:colourName
// @access  Private
const searchProductColours = asyncHandler(async (req, res) => {
    try {
        const productId = parseInt(req.params.productId);
        const { colourName } = req.params;

        const colours = await prisma.productColour.findMany({
            where: {
                productId,
                colourName: {
                    contains: colourName,
                    mode: 'insensitive'
                }
            },
            orderBy: { colourName: 'asc' }
        });

        res.status(200).json(colours);
    } catch (error) {
        console.error('Error searching product colours:', error);
        res.status(500).json({ message: 'Failed to search product colours' });
    }
});

// @desc    Create new product colour
// @route   POST /api/products/:productId/colours
// @access  Private/Admin
const createProductColour = asyncHandler(async (req, res) => {
    try {
        const productId = parseInt(req.params.productId);
        const { colourName, colourCode, hexCode } = req.body;

        // Validation
        if (!colourName) {
            return res.status(400).json({ message: 'Colour name is required' });
        }

        // Check if product exists
        const product = await prisma.product.findUnique({
            where: { id: productId }
        });
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Check for duplicate colour name for this product
        const existingColour = await prisma.productColour.findFirst({
            where: {
                productId,
                colourName
            }
        });
        if (existingColour) {
            return res.status(400).json({ message: 'Colour name already exists for this product' });
        }

        const colour = await prisma.productColour.create({
            data: {
                productId,
                colourName,
                colourCode,
                hexCode
            }
        });

        res.status(201).json(colour);
    } catch (error) {
        console.error('Error creating product colour:', error);
        res.status(500).json({ message: 'Failed to create product colour' });
    }
});

// @desc    Update product colour
// @route   PUT /api/products/:productId/colours/:id
// @access  Private/Admin
const updateProductColour = asyncHandler(async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const productId = parseInt(req.params.productId);
        const { colourName, colourCode, hexCode } = req.body;

        const colour = await prisma.productColour.findFirst({
            where: {
                id,
                productId
            }
        });
        if (!colour) {
            return res.status(404).json({ message: 'Product colour not found' });
        }

        // Check for duplicate colour name (excluding current record)
        if (colourName && colourName !== colour.colourName) {
            const existingColour = await prisma.productColour.findFirst({
                where: {
                    productId,
                    colourName,
                    id: { not: id }
                }
            });
            if (existingColour) {
                return res.status(400).json({ message: 'Colour name already exists for this product' });
            }
        }

        const updatedColour = await prisma.productColour.update({
            where: { id },
            data: {
                colourName: colourName || colour.colourName,
                colourCode: colourCode !== undefined ? colourCode : colour.colourCode,
                hexCode: hexCode !== undefined ? hexCode : colour.hexCode
            }
        });

        res.status(200).json(updatedColour);
    } catch (error) {
        console.error('Error updating product colour:', error);
        res.status(500).json({ message: 'Failed to update product colour' });
    }
});

// @desc    Delete product colour
// @route   DELETE /api/products/:productId/colours/:id
// @access  Private/Admin
const deleteProductColour = asyncHandler(async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const productId = parseInt(req.params.productId);

        const colour = await prisma.productColour.findFirst({
            where: {
                id,
                productId
            }
        });
        if (!colour) {
            return res.status(404).json({ message: 'Product colour not found' });
        }

        await prisma.productColour.delete({
            where: { id }
        });

        res.status(200).json({ message: 'Product colour deleted successfully' });
    } catch (error) {
        console.error('Error deleting product colour:', error);
        res.status(500).json({ message: 'Failed to delete product colour' });
    }
});

module.exports = {
    getProductColours,
    getProductColourById,
    searchProductColours,
    createProductColour,
    updateProductColour,
    deleteProductColour
}; 