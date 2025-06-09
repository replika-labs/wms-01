const asyncHandler = require('express-async-handler');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Import cache clearing functions
let clearProductsCache = null;
let clearMaterialCaches = null;
try {
    clearProductsCache = require('./productController').clearProductsCache || (() => { });
    clearMaterialCaches = require('./materialsManagementController').clearMaterialCaches || (() => { });
} catch (error) {
    clearProductsCache = () => { };
    clearMaterialCaches = () => { };
}

/**
 * @desc    Get materials required for a product
 * @route   GET /api/products/:id/materials
 * @access  Private
 */
const getProductMaterials = asyncHandler(async (req, res) => {
    try {
        const productId = parseInt(req.params.id);

        const productMaterials = await prisma.productMaterial.findMany({
            where: { productId },
            include: {
                material: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                        unit: true,
                        qtyOnHand: true,
                        minStock: true
                    }
                },
                product: {
                    select: {
                        id: true,
                        name: true,
                        code: true
                    }
                }
            }
        });

        // Calculate if there's enough material for production
        const materialsWithAvailability = productMaterials.map(pm => ({
            ...pm,
            isAvailable: pm.material.qtyOnHand >= pm.quantity,
            shortfall: Math.max(0, pm.quantity - pm.material.qtyOnHand)
        }));

        res.json({
            success: true,
            data: materialsWithAvailability
        });
    } catch (error) {
        console.error('Error fetching product materials:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching product materials',
            error: error.message
        });
    }
});

/**
 * @desc    Add material requirement to product
 * @route   POST /api/products/:id/materials
 * @access  Private (Admin only)
 */
const addProductMaterial = asyncHandler(async (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        const { materialId, quantity, unit = 'pcs' } = req.body;

        if (!materialId || !quantity) {
            return res.status(400).json({
                success: false,
                message: 'Material ID and quantity are required'
            });
        }

        // Verify product exists
        const product = await prisma.product.findFirst({
            where: { id: productId, isActive: true }
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Verify material exists
        const material = await prisma.material.findFirst({
            where: { id: parseInt(materialId), isActive: true }
        });

        if (!material) {
            return res.status(404).json({
                success: false,
                message: 'Material not found'
            });
        }

        // Check if relationship already exists
        const existingRelation = await prisma.productMaterial.findFirst({
            where: {
                productId,
                materialId: parseInt(materialId)
            }
        });

        if (existingRelation) {
            return res.status(400).json({
                success: false,
                message: 'Material is already associated with this product'
            });
        }

        // Create the relationship
        const productMaterial = await prisma.productMaterial.create({
            data: {
                productId,
                materialId: parseInt(materialId),
                quantity: parseFloat(quantity),
                unit
            },
            include: {
                material: true,
                product: true
            }
        });

        // Clear caches
        clearProductsCache();
        clearMaterialCaches();

        res.status(201).json({
            success: true,
            message: 'Material requirement added successfully',
            data: productMaterial
        });
    } catch (error) {
        console.error('Error adding product material:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding product material',
            error: error.message
        });
    }
});

/**
 * @desc    Update material requirement for product
 * @route   PUT /api/products/:id/materials/:materialId
 * @access  Private (Admin only)
 */
const updateProductMaterial = asyncHandler(async (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        const materialId = parseInt(req.params.materialId);
        const { quantity, unit } = req.body;

        const productMaterial = await prisma.productMaterial.findFirst({
            where: {
                productId,
                materialId
            }
        });

        if (!productMaterial) {
            return res.status(404).json({
                success: false,
                message: 'Product material relationship not found'
            });
        }

        const updatedProductMaterial = await prisma.productMaterial.update({
            where: { id: productMaterial.id },
            data: {
                quantity: quantity !== undefined ? parseFloat(quantity) : productMaterial.quantity,
                unit: unit || productMaterial.unit
            },
            include: {
                material: true,
                product: true
            }
        });

        // Clear caches
        clearProductsCache();
        clearMaterialCaches();

        res.json({
            success: true,
            message: 'Material requirement updated successfully',
            data: updatedProductMaterial
        });
    } catch (error) {
        console.error('Error updating product material:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating product material',
            error: error.message
        });
    }
});

/**
 * @desc    Remove material requirement from product
 * @route   DELETE /api/products/:id/materials/:materialId
 * @access  Private (Admin only)
 */
const removeProductMaterial = asyncHandler(async (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        const materialId = parseInt(req.params.materialId);

        const productMaterial = await prisma.productMaterial.findFirst({
            where: {
                productId,
                materialId
            }
        });

        if (!productMaterial) {
            return res.status(404).json({
                success: false,
                message: 'Product material relationship not found'
            });
        }

        await prisma.productMaterial.delete({
            where: { id: productMaterial.id }
        });

        // Clear caches
        clearProductsCache();
        clearMaterialCaches();

        res.json({
            success: true,
            message: 'Material requirement removed successfully'
        });
    } catch (error) {
        console.error('Error removing product material:', error);
        res.status(500).json({
            success: false,
            message: 'Error removing product material',
            error: error.message
        });
    }
});

/**
 * @desc    Check material availability for product production
 * @route   GET /api/products/:id/materials/availability
 * @access  Private
 */
const checkMaterialAvailability = asyncHandler(async (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        const { quantity = 1 } = req.query; // How many units of the product to produce

        const product = await prisma.product.findFirst({
            where: { id: productId, isActive: true },
            include: {
                productMaterials: {
                    include: {
                        material: true
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

        const productionQuantity = parseInt(quantity);
        let canProduce = true;
        const materialRequirements = [];

        for (const pm of product.productMaterials) {
            const requiredQuantity = pm.quantity * productionQuantity;
            const availableQuantity = pm.material.qtyOnHand;
            const isAvailable = availableQuantity >= requiredQuantity;
            const shortfall = Math.max(0, requiredQuantity - availableQuantity);

            if (!isAvailable) {
                canProduce = false;
            }

            materialRequirements.push({
                material: {
                    id: pm.material.id,
                    name: pm.material.name,
                    code: pm.material.code,
                    unit: pm.material.unit
                },
                requiredQuantity,
                availableQuantity,
                isAvailable,
                shortfall,
                unitRequirement: pm.quantity
            });
        }

        // Calculate max producible quantity
        let maxProducible = Infinity;
        if (product.productMaterials.length > 0) {
            maxProducible = Math.min(
                ...product.productMaterials.map(pm =>
                    Math.floor(pm.material.qtyOnHand / pm.quantity)
                )
            );
        }

        res.json({
            success: true,
            data: {
                product: {
                    id: product.id,
                    name: product.name,
                    code: product.code
                },
                requestedQuantity: productionQuantity,
                canProduce,
                maxProducible: maxProducible === Infinity ? 0 : maxProducible,
                materialRequirements
            }
        });
    } catch (error) {
        console.error('Error checking material availability:', error);
        res.status(500).json({
            success: false,
            message: 'Error checking material availability',
            error: error.message
        });
    }
});

/**
 * @desc    Get all products that use a specific material
 * @route   GET /api/materials/:id/products
 * @access  Private
 */
const getProductsUsingMaterial = asyncHandler(async (req, res) => {
    try {
        const materialId = parseInt(req.params.id);

        const material = await prisma.material.findFirst({
            where: { id: materialId, isActive: true }
        });

        if (!material) {
            return res.status(404).json({
                success: false,
                message: 'Material not found'
            });
        }

        const productMaterials = await prisma.productMaterial.findMany({
            where: { materialId },
            include: {
                product: {
                    where: { isActive: true },
                    select: {
                        id: true,
                        name: true,
                        code: true,
                        category: true,
                        qtyOnHand: true,
                        unit: true,
                        isActive: true
                    }
                }
            }
        });

        const productsUsingMaterial = productMaterials
            .filter(pm => pm.product) // Only include active products
            .map(pm => ({
                ...pm.product,
                materialRequirement: {
                    quantity: pm.quantity,
                    unit: pm.unit,
                    canProduce: material.qtyOnHand >= pm.quantity,
                    maxProducible: Math.floor(material.qtyOnHand / pm.quantity)
                }
            }));

        res.json({
            success: true,
            data: {
                material: {
                    id: material.id,
                    name: material.name,
                    code: material.code,
                    qtyOnHand: material.qtyOnHand,
                    unit: material.unit
                },
                products: productsUsingMaterial,
                totalProducts: productsUsingMaterial.length
            }
        });
    } catch (error) {
        console.error('Error fetching products using material:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching products using material',
            error: error.message
        });
    }
});

module.exports = {
    getProductMaterials,
    addProductMaterial,
    updateProductMaterial,
    removeProductMaterial,
    checkMaterialAvailability,
    getProductsUsingMaterial
}; 