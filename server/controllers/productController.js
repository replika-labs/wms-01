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
 * Helper function to calculate final price with variation adjustment
 */
const calculateFinalPrice = (basePrice, priceAdjustment) => {
    if (!basePrice) return null;
    if (!priceAdjustment) return parseFloat(basePrice);
    return parseFloat(basePrice) + parseFloat(priceAdjustment);
};

/**
 * Helper function to add final price to product
 */
const addFinalPriceToProduct = (product) => {
    const finalPrice = calculateFinalPrice(
        product.price,
        product.productVariation?.priceAdjustment
    );
    return {
        ...product,
        finalPrice: finalPrice
    };
};

/**
 * Helper function to add final price to multiple products
 */
const addFinalPriceToProducts = (products) => {
    return products.map(addFinalPriceToProduct);
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
            isActive = 'all',
            status,
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

        // Handle status filter (from frontend) or isActive filter (legacy)
        let activeFilter = isActive;
        if (status) {
            // Map frontend status values to isActive values
            switch (status) {
                case 'active':
                    activeFilter = 'true';
                    break;
                case 'inactive':
                    activeFilter = 'false';
                    break;
                case 'all':
                default:
                    activeFilter = 'all';
                    break;
            }
        }

        if (activeFilter !== 'all') {
            where.isActive = activeFilter === 'true';
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
                    productColor: {
                        select: {
                            id: true,
                            colorName: true,
                            colorCode: true
                        }
                    },
                    productVariation: {
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

        const productsWithFinalPrice = addFinalPriceToProducts(products);

        const result = {
            success: true,
            products: productsWithFinalPrice,
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

        const productId = parseInt(req.params.id);

        if (isNaN(productId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid product ID'
            });
        }

        const product = await prisma.product.findFirst({
            where: {
                id: productId
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
                productColor: {
                    select: {
                        id: true,
                        colorName: true,
                        colorCode: true
                    }
                },
                productVariation: {
                    select: {
                        id: true,
                        variationType: true,
                        variationValue: true,
                        priceAdjustment: true
                    }
                },
                photos: {
                    where: { isActive: true },
                    orderBy: { sortOrder: 'asc' }
                }
            }
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Calculate final price including variation adjustment
        let finalPrice = product.price;
        if (product.productVariation && product.productVariation.priceAdjustment && product.price) {
            finalPrice = parseFloat(product.price) + parseFloat(product.productVariation.priceAdjustment);
        }

        // Add calculated final price to the response
        const productWithFinalPrice = {
            ...product,
            finalPrice: finalPrice
        };

        res.json({
            success: true,
            product: productWithFinalPrice
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
            materialId,
            category,
            price,
            qtyOnHand = 0,
            unit = 'pcs',
            description,
            defaultTarget = 0,
            productColorId,
            productVariationId
        } = req.body;

        console.log('Create product request body:', req.body);
        console.log('Extracted qtyOnHand:', qtyOnHand, typeof qtyOnHand);

        // Validation
        if (!name || !category) {
            return res.status(400).json({
                success: false,
                message: 'Name and category are required'
            });
        }

        // Validate category
        const validCategories = ['Hijab', 'Scrunchie'];
        if (!validCategories.includes(category)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid category. Must be Hijab or Scrunchie'
            });
        }

        // Generate product code
        const generateProductCode = async (category) => {
            const categoryPrefix = category.substring(0, 4).toUpperCase();
            const today = new Date();
            const dateStr = today.toISOString().slice(2, 10).replace(/-/g, ''); // YYMMDD format

            // Find the latest sequence for today
            const latestProduct = await prisma.product.findFirst({
                where: {
                    code: {
                        startsWith: `${categoryPrefix}-${dateStr}-`
                    }
                },
                orderBy: {
                    code: 'desc'
                }
            });

            let sequence = 1;
            if (latestProduct) {
                const lastSequence = parseInt(latestProduct.code.split('-')[2]);
                sequence = lastSequence + 1;
            }

            return `${categoryPrefix}-${dateStr}-${sequence.toString().padStart(3, '0')}`;
        };

        const code = await generateProductCode(category);

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
                productColorId: productColorId ? parseInt(productColorId) : null,
                productVariationId: productVariationId ? parseInt(productVariationId) : null,
                category,
                price: price ? parseFloat(price) : null,
                unit,
                description,
                defaultTarget: parseInt(defaultTarget) || 0,
                qtyOnHand: qtyOnHand ? parseInt(qtyOnHand) : 0,
                isActive: true
            }
        });

        // Create photos if processed images are available
        if (req.processedImages && req.processedImages.length > 0) {
            const photoData = req.processedImages.map((image, index) => ({
                productId: product.id,
                photoPath: image.photoUrl,
                thumbnailPath: image.thumbnailUrl,
                description: `Product photo ${index + 1}`,
                isPrimary: image.isMainPhoto || index === 0,
                sortOrder: image.sortOrder || index,
                fileSize: image.fileSize,
                mimeType: image.mimeType,
                isActive: true
            }));

            await prisma.productPhoto.createMany({
                data: photoData
            });
        }

        // Clear all related caches
        clearAllCaches();

        // Get complete product with relationships
        const completeProduct = await prisma.product.findUnique({
            where: { id: product.id },
            include: {
                baseMaterial: true,
                productColor: true,
                productVariation: true,
                photos: { where: { isActive: true } }
            }
        });

        // Add final price calculation to response
        const productWithFinalPrice = addFinalPriceToProduct(completeProduct);

        res.status(201).json({
            success: true,
            message: 'Product created successfully',
            product: productWithFinalPrice
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
            materialId,
            category,
            price,
            unit,
            description,
            defaultTarget,
            qtyOnHand,
            productColorId,
            productVariationId,
            isActive
        } = req.body;

        console.log('Update product request body:', req.body);
        console.log('Extracted qtyOnHand:', qtyOnHand, typeof qtyOnHand);

        const product = await prisma.product.findFirst({
            where: { id: productId }
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Validate category if provided
        if (category) {
            const validCategories = ['Hijab', 'Scrunchie'];
            if (!validCategories.includes(category)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid category. Must be Hijab or Scrunchie'
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
                materialId: materialId !== undefined ? (materialId ? parseInt(materialId) : null) : product.materialId,
                productColorId: productColorId !== undefined ? (productColorId ? parseInt(productColorId) : null) : product.productColorId,
                productVariationId: productVariationId !== undefined ? (productVariationId ? parseInt(productVariationId) : null) : product.productVariationId,
                category: category !== undefined ? category : product.category,
                price: price !== undefined ? (price ? parseFloat(price) : null) : product.price,
                unit: unit || product.unit,
                description: description !== undefined ? description : product.description,
                defaultTarget: defaultTarget !== undefined ? parseInt(defaultTarget) || 0 : product.defaultTarget,
                qtyOnHand: qtyOnHand !== undefined ? (parseInt(qtyOnHand) || 0) : product.qtyOnHand,
                isActive: isActive !== undefined ? isActive === 'true' || isActive === true : product.isActive
            },
            include: {
                baseMaterial: true,
                productColor: true,
                productVariation: true,
                photos: { where: { isActive: true } }
            }
        });

        // Clear all related caches
        clearAllCaches();

        // Add final price calculation to response
        const productWithFinalPrice = addFinalPriceToProduct(updatedProduct);

        res.json({
            success: true,
            message: 'Product updated successfully',
            product: productWithFinalPrice
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
            where: { id: productId }
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Check if product is used in any active orders
        const orderProducts = await prisma.orderProduct.findMany({
            where: {
                productId: productId,
                order: {
                    isActive: true
                }
            }
        });

        if (orderProducts.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete product as it is used in existing orders'
            });
        }

        // Use transaction to ensure data consistency
        await prisma.$transaction(async (tx) => {
            // Get all photos before deletion for file cleanup
            const photos = await tx.productPhoto.findMany({
                where: { productId: productId },
                select: { photoPath: true, thumbnailPath: true }
            });

            // Delete related records in correct order (due to foreign key constraints)

            // 1. Delete product progress photos (child of product progress reports)
            await tx.productProgressPhoto.deleteMany({
                where: {
                    productProgressReport: {
                        productId: productId
                    }
                }
            });

            // 2. Delete product progress reports
            await tx.productProgressReport.deleteMany({
                where: { productId: productId }
            });

            // 3. Delete progress reports
            await tx.progressReport.deleteMany({
                where: { productId: productId }
            });

            // 4. Delete the product (this will cascade delete ProductPhoto and RecurringPlan due to onDelete: Cascade)
            await tx.product.delete({
                where: { id: productId }
            });

            // Note: File system cleanup would happen here if needed
            // photos.forEach(photo => {
            //     // Delete photo files from file system
            //     if (photo.photoPath) fs.unlinkSync(photo.photoPath);
            //     if (photo.thumbnailPath) fs.unlinkSync(photo.thumbnailPath);
            // });
        });

        // Clear all related caches
        clearAllCaches();

        res.json({
            success: true,
            message: `Product "${product.name}" deleted permanently from database`
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

/**
 * @desc    Get all available product colors
 * @route   GET /api/products/colors
 * @access  Private
 */
const getProductColors = asyncHandler(async (req, res) => {
    try {
        const colors = await prisma.productColour.findMany({
            where: { isActive: true },
            select: {
                id: true,
                colorName: true,
                colorCode: true
            },
            orderBy: { colorName: 'asc' }
        });

        res.json({
            success: true,
            colors: colors
        });
    } catch (error) {
        console.error('Error fetching colors:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching colors',
            error: error.message
        });
    }
});

/**
 * @desc    Get all available product variations
 * @route   GET /api/products/variations
 * @access  Private
 */
const getProductVariations = asyncHandler(async (req, res) => {
    try {
        const variations = await prisma.productVariation.findMany({
            where: { isActive: true },
            select: {
                id: true,
                variationType: true,
                variationValue: true,
                priceAdjustment: true
            },
            orderBy: [
                { variationType: 'asc' },
                { variationValue: 'asc' }
            ]
        });

        // Group by variation type
        const groupedVariations = variations.reduce((acc, variation) => {
            if (!acc[variation.variationType]) {
                acc[variation.variationType] = [];
            }
            acc[variation.variationType].push(variation);
            return acc;
        }, {});

        res.json({
            success: true,
            variations: groupedVariations,
            variationTypes: Object.keys(groupedVariations)
        });
    } catch (error) {
        console.error('Error fetching variations:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching variations',
            error: error.message
        });
    }
});

/**
 * @desc    Bulk actions for products
 * @route   POST /api/products/bulk/:action
 * @access  Private (Admin only)
 */
const bulkDeleteProducts = asyncHandler(async (req, res) => {
    try {
        const { productIds } = req.body;

        if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Product IDs array is required'
            });
        }

        // Check if any products are used in active orders
        const orderProducts = await prisma.orderProduct.findMany({
            where: {
                productId: { in: productIds.map(id => parseInt(id)) },
                order: {
                    isActive: true
                }
            }
        });

        if (orderProducts.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete products that are used in existing orders'
            });
        }

        const productIdsInt = productIds.map(id => parseInt(id));

        // Use transaction to ensure data consistency
        await prisma.$transaction(async (tx) => {
            // Get all photos before deletion for file cleanup
            const photos = await tx.productPhoto.findMany({
                where: {
                    productId: { in: productIdsInt }
                },
                select: { photoPath: true, thumbnailPath: true }
            });

            // Delete related records in correct order (due to foreign key constraints)

            // 1. Delete product progress photos (child of product progress reports)
            await tx.productProgressPhoto.deleteMany({
                where: {
                    productProgressReport: {
                        productId: { in: productIdsInt }
                    }
                }
            });

            // 2. Delete product progress reports
            await tx.productProgressReport.deleteMany({
                where: { productId: { in: productIdsInt } }
            });

            // 3. Delete progress reports
            await tx.progressReport.deleteMany({
                where: { productId: { in: productIdsInt } }
            });

            // 4. Delete the products (this will cascade delete ProductPhoto and RecurringPlan due to onDelete: Cascade)
            await tx.product.deleteMany({
                where: {
                    id: { in: productIdsInt }
                }
            });

            // Note: File system cleanup would happen here if needed
            // photos.forEach(photo => {
            //     // Delete photo files from file system
            //     if (photo.photoPath) fs.unlinkSync(photo.photoPath);
            //     if (photo.thumbnailPath) fs.unlinkSync(photo.thumbnailPath);
            // });
        });

        // Clear all related caches
        clearAllCaches();

        res.json({
            success: true,
            message: `${productIds.length} products deleted permanently from database`
        });
    } catch (error) {
        console.error('Error in bulk delete:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting products',
            error: error.message
        });
    }
});

const bulkActivateProducts = asyncHandler(async (req, res) => {
    try {
        const { productIds } = req.body;

        if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Product IDs array is required'
            });
        }

        // Activate products
        await prisma.product.updateMany({
            where: {
                id: { in: productIds.map(id => parseInt(id)) }
            },
            data: { isActive: true }
        });

        // Clear all related caches
        clearAllCaches();

        res.json({
            success: true,
            message: `${productIds.length} products activated successfully`
        });
    } catch (error) {
        console.error('Error in bulk activate:', error);
        res.status(500).json({
            success: false,
            message: 'Error activating products',
            error: error.message
        });
    }
});

const bulkDeactivateProducts = asyncHandler(async (req, res) => {
    try {
        const { productIds } = req.body;

        if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Product IDs array is required'
            });
        }

        // Deactivate products
        await prisma.product.updateMany({
            where: {
                id: { in: productIds.map(id => parseInt(id)) }
            },
            data: { isActive: false }
        });

        // Clear all related caches
        clearAllCaches();

        res.json({
            success: true,
            message: `${productIds.length} products deactivated successfully`
        });
    } catch (error) {
        console.error('Error in bulk deactivate:', error);
        res.status(500).json({
            success: false,
            message: 'Error deactivating products',
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
    getProductColors,
    getProductVariations,
    clearProductsCache,
    clearAllCaches,
    bulkDeleteProducts,
    bulkActivateProducts,
    bulkDeactivateProducts
}; 