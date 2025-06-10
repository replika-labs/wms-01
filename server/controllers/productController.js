const asyncHandler = require('express-async-handler');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Import function to clear materials cache when products are created/updated
let clearMaterialCaches = null;
try {
    const materialsController = require('./materialsManagementController');
    clearMaterialCaches = materialsController.clearMaterialCaches || (() => { });
} catch (error) {
    clearMaterialCaches = () => { }; // Fallback if not available
}

// Cache for products (5 minutes cache)
let productsCache = null;
let productsCacheExpiry = null;

/**
 * Clear products cache
 */
const clearProductsCache = () => {
    productsCache = null;
    productsCacheExpiry = null;
    console.log('Products cache cleared');
};

/**
 * Clear all related caches
 */
const clearAllCaches = () => {
    clearProductsCache();
    clearMaterialCaches();
    console.log('All related caches cleared');
};

/**
 * @desc    Get all products with filtering and pagination
 * @route   GET /api/products
 * @access  Private
 */
const getProducts = asyncHandler(async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            search,
            category,
            isActive = 'true',
            sortBy = 'name',
            sortOrder = 'asc'
        } = req.query;

        // Check cache first (5 minutes cache)
        const cacheKey = `products_${JSON.stringify(req.query)}`;
        const now = Date.now();

        if (productsCache && productsCacheExpiry && now < productsCacheExpiry) {
            const cachedData = productsCache[cacheKey];
            if (cachedData) {
                return res.json(cachedData);
            }
        }

        // Build where clause
        const where = {};

        if (isActive !== 'all') {
            where.isActive = isActive === 'true';
        }

        if (category && category !== 'all') {
            where.category = category;
        }

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { code: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } }
            ];
        }

        const offset = (parseInt(page) - 1) * parseInt(limit);

        // Get products with relationships
        const [products, totalCount] = await Promise.all([
            prisma.product.findMany({
                where,
                include: {
                    baseMaterial: {
                        select: {
                            id: true,
                            name: true,
                            code: true,
                            unit: true
                        }
                    },
                    colours: {
                        where: { isActive: true },
                        select: {
                            id: true,
                            colorName: true,
                            colorCode: true
                        }
                    },
                    variations: {
                        where: { isActive: true },
                        select: {
                            id: true,
                            variationType: true,
                            variationValue: true,
                            priceAdjustment: true
                        }
                    },
                    photos: {
                        where: { isActive: true },
                        select: {
                            id: true,
                            photoPath: true,
                            thumbnailPath: true,
                            isPrimary: true,
                            sortOrder: true
                        },
                        orderBy: { sortOrder: 'asc' }
                    }
                },
                orderBy: { [sortBy]: sortOrder.toLowerCase() },
                take: parseInt(limit),
                skip: offset
            }),
            prisma.product.count({ where })
        ]);

        const result = {
            success: true,
            products,
            pagination: {
                total: totalCount,
                pages: Math.ceil(totalCount / parseInt(limit)),
                current: parseInt(page),
                limit: parseInt(limit)
            }
        };

        // Cache the result
        if (!productsCache) productsCache = {};
        productsCache[cacheKey] = result;
        productsCacheExpiry = now + (5 * 60 * 1000); // 5 minutes

        res.json(result);
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching products',
            error: error.message
        });
    }
});

/**
 * @desc    Get single product by ID
 * @route   GET /api/products/:id
 * @access  Private
 */
const getProductById = asyncHandler(async (req, res) => {
    try {
        // Clear cache on read to ensure fresh data for individual product views
        const cacheKey = `product_${req.params.id}`;

        const product = await prisma.product.findFirst({
            where: {
                id: parseInt(req.params.id),
                isActive: true
            },
            include: {
                baseMaterial: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                        unit: true,
                        qtyOnHand: true
                    }
                },
                colours: {
                    where: { isActive: true },
                    orderBy: { id: 'asc' }
                },
                variations: {
                    where: { isActive: true },
                    orderBy: { id: 'asc' }
                },
                photos: {
                    where: { isActive: true },
                    orderBy: { sortOrder: 'asc' }
                },
                productMaterials: {
                    include: {
                        material: {
                            select: {
                                id: true,
                                name: true,
                                code: true,
                                unit: true,
                                qtyOnHand: true
                            }
                        }
                    }
                }
            }
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        res.json({
            success: true,
            product
        });
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching product',
            error: error.message
        });
    }
});

/**
 * @desc    Create new product
 * @route   POST /api/products
 * @access  Private (Admin only)
 */
const createProduct = asyncHandler(async (req, res) => {
    try {
        const {
            name,
            code,
            materialId,
            category,
            price,
            qtyOnHand = 0,
            unit = 'pcs',
            description,
            defaultTarget = 0,
            colours = [],
            variations = [],
            materials = []
        } = req.body;

        console.log('Create product request body:', req.body);
        console.log('Extracted qtyOnHand:', qtyOnHand, typeof qtyOnHand);

        // Validation
        if (!name || !code) {
            return res.status(400).json({
                success: false,
                message: 'Name and code are required'
            });
        }

        // Check for duplicate code
        const existingProduct = await prisma.product.findFirst({
            where: { code, isActive: true }
        });

        if (existingProduct) {
            return res.status(400).json({
                success: false,
                message: 'Product code already exists'
            });
        }

        // Validate base material if provided
        if (materialId) {
            const material = await prisma.material.findFirst({
                where: { id: parseInt(materialId), isActive: true }
            });

            if (!material) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid base material'
                });
            }
        }

        // Create product
        const product = await prisma.product.create({
            data: {
                name,
                code,
                materialId: materialId ? parseInt(materialId) : null,
                category,
                price: price ? parseFloat(price) : null,
                unit,
                description,
                defaultTarget: parseInt(defaultTarget) || 0,
                qtyOnHand: qtyOnHand ? parseInt(qtyOnHand) : 0,
                isActive: true
            }
        });

        // Create colours if provided
        if (colours.length > 0) {
            const colourData = colours.map(colour => ({
                productId: product.id,
                colorName: colour.colorName,
                colorCode: colour.colorCode || null,
                isActive: true
            }));

            await prisma.productColour.createMany({
                data: colourData
            });
        }

        // Create variations if provided
        if (variations.length > 0) {
            const variationData = variations.map(variation => ({
                productId: product.id,
                variationType: variation.variationType,
                variationValue: variation.variationValue,
                priceAdjustment: variation.priceAdjustment ? parseFloat(variation.priceAdjustment) : null,
                isActive: true
            }));

            await prisma.productVariation.createMany({
                data: variationData
            });
        }

        // Create product materials relationships if provided
        if (materials.length > 0) {
            const materialData = materials.map(material => ({
                productId: product.id,
                materialId: parseInt(material.materialId),
                quantity: parseFloat(material.quantity),
                unit: material.unit || 'pcs'
            }));

            await prisma.productMaterial.createMany({
                data: materialData
            });
        }

        // Clear all related caches
        clearAllCaches();

        // Get complete product with relationships
        const completeProduct = await prisma.product.findUnique({
            where: { id: product.id },
            include: {
                baseMaterial: true,
                colours: { where: { isActive: true } },
                variations: { where: { isActive: true } },
                productMaterials: {
                    include: {
                        material: true
                    }
                }
            }
        });

        res.status(201).json({
            success: true,
            message: 'Product created successfully',
            product: completeProduct
        });
    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating product',
            error: error.message
        });
    }
});

/**
 * @desc    Update product
 * @route   PUT /api/products/:id
 * @access  Private (Admin only)
 */
const updateProduct = asyncHandler(async (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        const {
            name,
            code,
            materialId,
            category,
            price,
            unit,
            description,
            defaultTarget,
            qtyOnHand
        } = req.body;

        console.log('Update product request body:', req.body);
        console.log('Extracted qtyOnHand:', qtyOnHand, typeof qtyOnHand);

        const product = await prisma.product.findFirst({
            where: { id: productId, isActive: true }
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Check for duplicate code if code is being changed
        if (code && code !== product.code) {
            const existingProduct = await prisma.product.findFirst({
                where: { code, isActive: true, id: { not: productId } }
            });

            if (existingProduct) {
                return res.status(400).json({
                    success: false,
                    message: 'Product code already exists'
                });
            }
        }

        // Validate base material if provided
        if (materialId) {
            const material = await prisma.material.findFirst({
                where: { id: parseInt(materialId), isActive: true }
            });

            if (!material) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid base material'
                });
            }
        }

        // Update product
        const updatedProduct = await prisma.product.update({
            where: { id: productId },
            data: {
                name: name || product.name,
                code: code || product.code,
                materialId: materialId !== undefined ? (materialId ? parseInt(materialId) : null) : product.materialId,
                category: category !== undefined ? category : product.category,
                price: price !== undefined ? (price ? parseFloat(price) : null) : product.price,
                unit: unit || product.unit,
                description: description !== undefined ? description : product.description,
                defaultTarget: defaultTarget !== undefined ? parseInt(defaultTarget) || 0 : product.defaultTarget,
                qtyOnHand: qtyOnHand !== undefined ? (parseInt(qtyOnHand) || 0) : product.qtyOnHand
            },
            include: {
                baseMaterial: true,
                colours: { where: { isActive: true } },
                variations: { where: { isActive: true } },
                productMaterials: {
                    include: {
                        material: true
                    }
                }
            }
        });

        // Clear all related caches
        clearAllCaches();

        res.json({
            success: true,
            message: 'Product updated successfully',
            product: updatedProduct
        });
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating product',
            error: error.message
        });
    }
});

/**
 * @desc    Delete product (soft delete)
 * @route   DELETE /api/products/:id
 * @access  Private (Admin only)
 */
const deleteProduct = asyncHandler(async (req, res) => {
    try {
        const productId = parseInt(req.params.id);

        const product = await prisma.product.findFirst({
            where: { id: productId, isActive: true }
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Check if product is used in any active orders
        const orderProducts = await prisma.orderProduct.findMany({
            where: { productId },
            include: {
                order: {
                    where: { isActive: true }
                }
            }
        });

        if (orderProducts.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete product as it is used in existing orders'
            });
        }

        // Soft delete product
        await prisma.product.update({
            where: { id: productId },
            data: { isActive: false }
        });

        // Clear all related caches
        clearAllCaches();

        res.json({
            success: true,
            message: `Product ${product.name} deleted successfully`
        });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting product',
            error: error.message
        });
    }
});

/**
 * @desc    Get product categories
 * @route   GET /api/products/categories
 * @access  Private
 */
const getProductCategories = asyncHandler(async (req, res) => {
    try {
        const categories = await prisma.product.findMany({
            where: {
                isActive: true,
                category: { not: null }
            },
            select: { category: true },
            distinct: ['category']
        });

        const categoryList = categories
            .map(p => p.category)
            .filter(category => category && category.trim() !== '')
            .sort();

        res.json({
            success: true,
            categories: categoryList
        });
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching categories',
            error: error.message
        });
    }
});

module.exports = {
    getProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
    getProductCategories,
    clearProductsCache,
    clearAllCaches
}; 