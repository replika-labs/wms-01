const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const NodeCache = require('node-cache')

// Initialize cache with 5 minute TTL
const cache = new NodeCache({ stdTTL: 300 })

// Helper function to generate material code
const generateMaterialCode = (totalUnits, supplier) => {
    // Generate 3 random alphabets
    const randomAlphabets = Array.from({ length: 3 }, () =>
        String.fromCharCode(65 + Math.floor(Math.random() * 26))
    ).join('')

    // Get current date in YYYYMMDD format
    const currentDate = new Date().toISOString().slice(0, 10).replace(/-/g, '')

    // Clean supplier name (remove spaces, special characters, limit to 6 chars)
    const cleanSupplier = (supplier || 'UNKNOWN')
        .replace(/[^A-Z0-9]/gi, '')
        .toUpperCase()
        .slice(0, 6) || 'UNKNWN'

    // Format: [3 RANDOM ALPHABET]-[TOTAL_UNITS]-[SUPPLIER]-[DATE_YYYYMMDD]
    return `${randomAlphabets}-${totalUnits}-${cleanSupplier}-${currentDate}`
}

// Cache keys
const CACHE_KEYS = {
    ALL_MATERIALS: 'all_materials',
    MATERIALS_BY_ATTRIBUTE: 'materials_by_attribute_',
    CRITICAL_STOCK: 'critical_stock_materials',
    INVENTORY_ANALYTICS: 'inventory_analytics'
}

// Helper function to clear related caches
const clearMaterialCaches = () => {
    const keys = cache.keys()
    keys.forEach(key => {
        if (key.startsWith('materials_') || key.startsWith('inventory_') || key === CACHE_KEYS.ALL_MATERIALS || key === CACHE_KEYS.CRITICAL_STOCK) {
            cache.del(key)
        }
    })
}

// @desc    Get all materials
// @route   GET /api/materials-management
// @access  Private
const getAllMaterials = async (req, res) => {
    try {
        const { page = 1, limit = 10, search, category, sortBy = 'name', sortOrder = 'asc' } = req.query
        const cacheKey = `materials_page_${page}_limit_${limit}_search_${search || 'none'}_category_${category || 'all'}_sort_${sortBy}_${sortOrder}`

        // Check cache first
        const cachedData = cache.get(cacheKey)
        if (cachedData) {
            return res.json(cachedData)
        }

        const skip = (parseInt(page) - 1) * parseInt(limit)
        const take = parseInt(limit)

        // Build where clause
        const where = {}
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { code: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { supplier: { contains: search, mode: 'insensitive' } },
                { attributeType: { contains: search, mode: 'insensitive' } },
                { attributeValue: { contains: search, mode: 'insensitive' } }
            ]
        }
        if (category) {
            where.attributeType = { contains: category, mode: 'insensitive' }
        }

        // Build orderBy - convert sortOrder to lowercase for Prisma
        const orderBy = {}
        orderBy[sortBy] = sortOrder.toLowerCase()

        const materials = await prisma.material.findMany({
            where,
            orderBy,
            skip,
            take
        })

        const total = await prisma.material.count({ where })

        // Transform the data to match frontend expectations
        const transformedMaterials = materials.map(material => ({
            id: material.id,
            name: material.name,
            description: material.description,
            code: material.code,
            sku: material.code, // Use code as SKU
            fabricTypeColor: material.attributeType || '', // Map attributeType to fabricTypeColor for frontend compatibility
            attributeType: material.attributeType || '',
            attributeValue: material.attributeValue || '',
            unit: material.unit,
            qtyOnHand: parseFloat(material.qtyOnHand),
            safetyStock: parseFloat(material.minStock),
            price: parseFloat(material.pricePerUnit),
            supplier: material.supplier || '',
            store: material.location || '',
            location: material.location || '',
            image: '', // No image field in schema
            createdAt: material.createdAt,
            updatedAt: material.updatedAt,
            // Add some calculated fields that frontend expects
            calculatedStock: {
                totalCalculated: parseFloat(material.qtyOnHand),
                movementStock: parseFloat(material.qtyOnHand),
                purchaseStock: 0
            },
            stockStatus: material.qtyOnHand <= material.minStock ? 'low' : 'adequate',
            needsRestock: material.qtyOnHand <= material.minStock,
            purchaseHistory: {
                purchaseCount: 0,
                totalPurchased: 0,
                lastPurchaseDate: null
            }
        }))

        const result = {
            success: true,
            data: {
                materials: transformedMaterials,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / parseInt(limit))
                }
            }
        }

        // Cache the result
        cache.set(cacheKey, result)

        res.json(result)
    } catch (error) {
        console.error('Error fetching materials:', error)
        res.status(500).json({
            success: false,
            message: 'Error fetching materials',
            error: error.message
        })
    }
}

// @desc    Get material by ID
// @route   GET /api/materials-management/:id
// @access  Private
const getMaterialById = async (req, res) => {
    try {
        const { id } = req.params
        const cacheKey = `material_${id}`

        // Check cache first
        const cachedData = cache.get(cacheKey)
        if (cachedData) {
            return res.json(cachedData)
        }

        const material = await prisma.material.findUnique({
            where: { id: parseInt(id) },
            include: {
                materialMovements: {
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                    include: {
                        user: {
                            select: { name: true, email: true }
                        }
                    }
                }
            }
        })

        if (!material) {
            return res.status(404).json({
                success: false,
                message: 'Material not found'
            })
        }

        // Cache the result
        cache.set(cacheKey, material)

        res.json({
            success: true,
            data: material
        })
    } catch (error) {
        console.error('Error fetching material:', error)
        res.status(500).json({
            success: false,
            message: 'Error fetching material',
            error: error.message
        })
    }
}

// @desc    Create new material
// @route   POST /api/materials-management
// @access  Private
const createMaterial = async (req, res) => {
    try {
        const {
            name,
            description,
            unit = 'pcs',
            quantity = 0,
            qtyOnHand = quantity, // frontend sends qtyOnHand
            minQuantity = 0,
            safetyStock = minQuantity, // frontend sends safetyStock
            price = 0,
            supplier,
            location,
            store = location, // frontend sends store
            attributeType,
            attributeValue,
            fabricTypeColor // Map to attributeType for backward compatibility
        } = req.body

        // Use the frontend field values
        const actualQuantity = qtyOnHand !== undefined ? qtyOnHand : quantity
        const actualMinQuantity = safetyStock !== undefined ? safetyStock : minQuantity
        const actualLocation = store !== undefined ? store : location
        const actualAttributeType = attributeType || fabricTypeColor || ''

        // Validate required fields
        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Name is required'
            })
        }

        // Get total materials count for code generation
        const totalMaterials = await prisma.material.count()
        const totalUnits = totalMaterials + 1

        // Generate unique code
        let generatedCode
        let isCodeUnique = false
        let attempts = 0

        while (!isCodeUnique && attempts < 10) {
            generatedCode = generateMaterialCode(totalUnits, supplier)
            const existingMaterial = await prisma.material.findUnique({
                where: { code: generatedCode }
            })
            isCodeUnique = !existingMaterial
            attempts++
        }

        if (!isCodeUnique) {
            return res.status(500).json({
                success: false,
                message: 'Failed to generate unique code after multiple attempts'
            })
        }

        const material = await prisma.material.create({
            data: {
                name,
                description,
                code: generatedCode,
                unit,
                qtyOnHand: parseFloat(actualQuantity),
                minStock: parseFloat(actualMinQuantity),
                pricePerUnit: parseFloat(price),
                supplier,
                location: actualLocation,
                attributeType: actualAttributeType,
                attributeValue: attributeValue || null
            }
        })

        // Clear caches
        clearMaterialCaches()

        res.status(201).json({
            success: true,
            message: 'Material created successfully',
            data: material
        })
    } catch (error) {
        console.error('Error creating material:', error)
        res.status(500).json({
            success: false,
            message: 'Error creating material',
            error: error.message
        })
    }
}

// @desc    Update material
// @route   PUT /api/materials-management/:id
// @access  Private
const updateMaterial = async (req, res) => {
    try {
        const { id } = req.params
        const updateData = req.body

        // Check if material exists
        const existingMaterial = await prisma.material.findUnique({
            where: { id: parseInt(id) }
        })

        if (!existingMaterial) {
            return res.status(404).json({ message: 'Material not found' })
        }

        // If SKU is being updated, check for duplicates
        if (updateData.sku && updateData.sku !== existingMaterial.sku) {
            const existingSku = await prisma.material.findUnique({
                where: { sku: updateData.sku }
            })

            if (existingSku) {
                return res.status(400).json({
                    message: 'SKU already exists'
                })
            }
        }

        // Handle backward compatibility for fabricTypeColor
        if (updateData.fabricTypeColor && !updateData.attributeType) {
            updateData.attributeType = updateData.fabricTypeColor
            delete updateData.fabricTypeColor
        }

        // Convert numeric fields
        if (updateData.quantity !== undefined) updateData.quantity = parseFloat(updateData.quantity)
        if (updateData.minQuantity !== undefined) updateData.minQuantity = parseFloat(updateData.minQuantity)
        if (updateData.price !== undefined) updateData.price = parseFloat(updateData.price)

        const material = await prisma.material.update({
            where: { id: parseInt(id) },
            data: updateData
        })

        // Clear caches
        clearMaterialCaches()
        cache.del(`material_${id}`)

        res.json({
            success: true,
            message: 'Material updated successfully',
            data: material
        })
    } catch (error) {
        console.error('Error updating material:', error)
        res.status(500).json({
            success: false,
            message: 'Error updating material',
            error: error.message
        })
    }
}

// @desc    Delete material
// @route   DELETE /api/materials-management/:id
// @access  Private
const deleteMaterial = async (req, res) => {
    try {
        const { id } = req.params

        // Check if material exists
        const material = await prisma.material.findUnique({
            where: { id: parseInt(id) }
        })

        if (!material) {
            return res.status(404).json({ message: 'Material not found' })
        }

        // Check if material has related records (material movements, remaining materials)
        const hasMovements = await prisma.materialMovement.count({
            where: { materialId: parseInt(id) }
        })

        const hasRemainingMaterials = await prisma.remainingMaterial.count({
            where: { materialId: parseInt(id) }
        })

        if (hasMovements > 0 || hasRemainingMaterials > 0) {
            return res.status(400).json({
                message: 'Cannot delete material with existing movements or remaining material records'
            })
        }

        await prisma.material.delete({
            where: { id: parseInt(id) }
        })

        // Clear caches
        clearMaterialCaches()
        cache.del(`material_${id}`)

        res.json({ message: 'Material deleted successfully' })
    } catch (error) {
        console.error('Error deleting material:', error)
        res.status(500).json({
            message: 'Error deleting material',
            error: error.message
        })
    }
}

// @desc    Get materials by attribute type
// @route   GET /api/materials-management/category/:category
// @access  Private
const getMaterialsByCategory = async (req, res) => {
    try {
        const { category } = req.params
        const cacheKey = `${CACHE_KEYS.MATERIALS_BY_ATTRIBUTE}${category}`

        // Check cache first
        const cachedData = cache.get(cacheKey)
        if (cachedData) {
            return res.json(cachedData)
        }

        const materials = await prisma.material.findMany({
            where: {
                attributeType: { contains: category, mode: 'insensitive' }
            },
            orderBy: { name: 'asc' }
        })

        // Cache the result
        cache.set(cacheKey, materials)

        res.json({
            success: true,
            data: materials
        })
    } catch (error) {
        console.error('Error fetching materials by attribute type:', error)
        res.status(500).json({
            success: false,
            message: 'Error fetching materials by attribute type',
            error: error.message
        })
    }
}

// @desc    Get materials with critical stock levels
// @route   GET /api/materials-management/critical-stock
// @access  Private
const getMaterialsWithCriticalStock = async (req, res) => {
    try {
        // Check cache first
        const cachedData = cache.get(CACHE_KEYS.CRITICAL_STOCK)
        if (cachedData) {
            return res.json(cachedData)
        }

        const materials = await prisma.$queryRaw`
            SELECT * FROM "materials" m
            WHERE m."qtyOnHand" <= m."minStock"
            ORDER BY (m."qtyOnHand" - m."minStock") ASC
        `

        // Cache the result
        cache.set(CACHE_KEYS.CRITICAL_STOCK, materials)

        res.json({
            success: true,
            data: materials
        })
    } catch (error) {
        console.error('Error fetching critical stock materials:', error)
        res.status(500).json({
            success: false,
            message: 'Error fetching critical stock materials',
            error: error.message
        })
    }
}

// @desc    Bulk update materials
// @route   PUT /api/materials-management/bulk/update
// @access  Private
const bulkUpdateMaterials = async (req, res) => {
    try {
        const { materials } = req.body

        if (!Array.isArray(materials) || materials.length === 0) {
            return res.status(400).json({
                message: 'Materials array is required'
            })
        }

        const results = []
        const errors = []

        for (const materialData of materials) {
            try {
                const { id, ...updateData } = materialData

                if (!id) {
                    errors.push({ material: materialData, error: 'ID is required' })
                    continue
                }

                // Convert numeric fields and map field names
                if (updateData.quantity !== undefined) {
                    updateData.qtyOnHand = parseFloat(updateData.quantity)
                    delete updateData.quantity
                }
                if (updateData.qtyOnHand !== undefined) updateData.qtyOnHand = parseFloat(updateData.qtyOnHand)
                if (updateData.minQuantity !== undefined) {
                    updateData.minStock = parseFloat(updateData.minQuantity)
                    delete updateData.minQuantity
                }
                if (updateData.safetyStock !== undefined) {
                    updateData.minStock = parseFloat(updateData.safetyStock)
                    delete updateData.safetyStock
                }
                if (updateData.price !== undefined) {
                    updateData.pricePerUnit = parseFloat(updateData.price)
                    delete updateData.price
                }
                if (updateData.store !== undefined) {
                    updateData.location = updateData.store
                    delete updateData.store
                }

                const updatedMaterial = await prisma.material.update({
                    where: { id: parseInt(id) },
                    data: updateData,
                    include: {
                        materialType: true
                    }
                })

                results.push(updatedMaterial)
            } catch (error) {
                errors.push({ material: materialData, error: error.message })
            }
        }

        // Clear caches
        clearMaterialCaches()

        res.json({
            message: `Bulk update completed. ${results.length} successful, ${errors.length} failed.`,
            results,
            errors
        })
    } catch (error) {
        console.error('Error in bulk update:', error)
        res.status(500).json({
            message: 'Error in bulk update',
            error: error.message
        })
    }
}

// @desc    Export materials to CSV
// @route   GET /api/materials-management/export
// @access  Private
const exportMaterials = async (req, res) => {
    try {
        const materials = await prisma.material.findMany({
            include: {
                materialType: true
            },
            orderBy: { name: 'asc' }
        })

        // Create CSV content
        const csvHeader = 'ID,Name,Description,SKU,Material Type,Unit,Quantity,Min Quantity,Price,Supplier,Location,Created At\n'
        const csvRows = materials.map(material => {
            return [
                material.id,
                `"${material.name}"`,
                `"${material.description || ''}"`,
                material.sku,
                `"${material.materialType.name}"`,
                material.unit,
                material.quantity,
                material.minQuantity,
                material.price,
                `"${material.supplier || ''}"`,
                `"${material.location || ''}"`,
                material.createdAt.toISOString()
            ].join(',')
        }).join('\n')

        const csvContent = csvHeader + csvRows

        res.setHeader('Content-Type', 'text/csv')
        res.setHeader('Content-Disposition', 'attachment; filename=materials-export.csv')
        res.send(csvContent)
    } catch (error) {
        console.error('Error exporting materials:', error)
        res.status(500).json({
            message: 'Error exporting materials',
            error: error.message
        })
    }
}

// @desc    Import materials from CSV
// @route   POST /api/materials-management/import
// @access  Private
const importMaterials = async (req, res) => {
    try {
        const { materials } = req.body

        if (!Array.isArray(materials) || materials.length === 0) {
            return res.status(400).json({
                message: 'Materials array is required'
            })
        }

        const results = []
        const errors = []

        for (const materialData of materials) {
            try {
                const {
                    name,
                    description,
                    sku,
                    materialTypeName,
                    unit = 'pcs',
                    quantity = 0,
                    minQuantity = 0,
                    price = 0,
                    supplier,
                    location
                } = materialData

                // Validate required fields
                if (!name || !sku || !materialTypeName) {
                    errors.push({ material: materialData, error: 'Name, SKU, and Material Type are required' })
                    continue
                }

                // Find or create material type
                let materialType = await prisma.materialType.findFirst({
                    where: { name: materialTypeName }
                })

                if (!materialType) {
                    materialType = await prisma.materialType.create({
                        data: { name: materialTypeName, color: '#808080' }
                    })
                }

                // Check if SKU already exists
                const existingSku = await prisma.material.findUnique({
                    where: { sku }
                })

                if (existingSku) {
                    errors.push({ material: materialData, error: 'SKU already exists' })
                    continue
                }

                const material = await prisma.material.create({
                    data: {
                        name,
                        description,
                        sku,
                        materialTypeId: materialType.id,
                        unit,
                        quantity: parseFloat(quantity),
                        minQuantity: parseFloat(minQuantity),
                        price: parseFloat(price),
                        supplier,
                        location
                    },
                    include: {
                        materialType: true
                    }
                })

                results.push(material)
            } catch (error) {
                errors.push({ material: materialData, error: error.message })
            }
        }

        // Clear caches
        clearMaterialCaches()

        res.json({
            message: `Import completed. ${results.length} successful, ${errors.length} failed.`,
            results,
            errors
        })
    } catch (error) {
        console.error('Error importing materials:', error)
        res.status(500).json({
            message: 'Error importing materials',
            error: error.message
        })
    }
}

// @desc    Get inventory analytics
// @route   GET /api/materials-management/analytics/inventory
// @access  Private
const getInventoryAnalytics = async (req, res) => {
    try {
        // Check cache first
        const cachedData = cache.get(CACHE_KEYS.INVENTORY_ANALYTICS)
        if (cachedData) {
            return res.json(cachedData)
        }

        const [
            totalMaterials,
            totalValue,
            criticalStockCount,
            materialsByAttribute,
            topValueMaterials,
            recentMovements
        ] = await Promise.all([
            // Total materials count
            prisma.material.count(),

            // Total inventory value
            prisma.material.aggregate({
                _sum: {
                    pricePerUnit: true
                }
            }),

            // Critical stock count
            prisma.$queryRaw`
        SELECT COUNT(*) as count
        FROM "materials"
        WHERE "qtyOnHand" <= "minStock"
      `,

            // Materials by attribute type
            prisma.material.groupBy({
                by: ['attributeType'],
                _count: {
                    _all: true
                },
                where: {
                    attributeType: {
                        not: null
                    }
                }
            }),

            // Top 10 most valuable materials
            prisma.material.findMany({
                orderBy: { pricePerUnit: 'desc' },
                take: 10
            }),

            // Recent movements (last 10)
            prisma.materialMovement.findMany({
                orderBy: { createdAt: 'desc' },
                take: 10,
                include: {
                    material: {
                        select: { name: true, sku: true }
                    },
                    user: {
                        select: { name: true }
                    }
                }
            })
        ])

        const analytics = {
            overview: {
                totalMaterials,
                totalValue: totalValue._sum.pricePerUnit || 0,
                criticalStockCount: parseInt(criticalStockCount[0].count),
                attributeTypes: materialsByAttribute.length
            },
            materialsByAttribute: materialsByAttribute.map(group => ({
                name: group.attributeType || 'No Type',
                count: group._count._all
            })),
            topValueMaterials,
            recentMovements
        }

        // Cache the result
        cache.set(CACHE_KEYS.INVENTORY_ANALYTICS, analytics)

        res.json(analytics)
    } catch (error) {
        console.error('Error fetching inventory analytics:', error)
        res.status(500).json({
            message: 'Error fetching inventory analytics',
            error: error.message
        })
    }
}

// @desc    Get stock movements for a material
// @route   GET /api/materials-management/:id/movements
// @access  Private
const getStockMovements = async (req, res) => {
    try {
        const { id } = req.params
        const { page = 1, limit = 10 } = req.query

        const skip = (parseInt(page) - 1) * parseInt(limit)
        const take = parseInt(limit)

        const movements = await prisma.materialMovement.findMany({
            where: { materialId: parseInt(id) },
            include: {
                user: {
                    select: { name: true, email: true }
                }
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take
        })

        const total = await prisma.materialMovement.count({
            where: { materialId: parseInt(id) }
        })

        res.json({
            movements,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        })
    } catch (error) {
        console.error('Error fetching stock movements:', error)
        res.status(500).json({
            message: 'Error fetching stock movements',
            error: error.message
        })
    }
}

// @desc    Update stock level
// @route   PUT /api/materials-management/:id/stock
// @access  Private
const updateStockLevel = async (req, res) => {
    try {
        const { id } = req.params
        const { quantity, reason, userId } = req.body

        if (quantity === undefined || !reason || !userId) {
            return res.status(400).json({
                message: 'Quantity, reason, and userId are required'
            })
        }

        // Get current material
        const material = await prisma.material.findUnique({
            where: { id: parseInt(id) }
        })

        if (!material) {
            return res.status(404).json({ message: 'Material not found' })
        }

        const oldQuantity = material.qtyOnHand
        const newQuantity = parseFloat(quantity)
        const quantityDifference = newQuantity - oldQuantity

        // Update material quantity
        const updatedMaterial = await prisma.material.update({
            where: { id: parseInt(id) },
            data: { qtyOnHand: newQuantity }
        })

        // Create movement record
        await prisma.materialMovement.create({
            data: {
                materialId: parseInt(id),
                movementType: quantityDifference > 0 ? 'IN' : 'OUT',
                quantity: Math.abs(quantityDifference),
                notes: reason,
                userId: parseInt(userId),
                qtyAfter: newQuantity
            }
        })

        // Clear caches
        clearMaterialCaches()
        cache.del(`material_${id}`)

        res.json({
            message: 'Stock level updated successfully',
            material: updatedMaterial,
            previousQuantity: oldQuantity,
            newQuantity,
            quantityDifference
        })
    } catch (error) {
        console.error('Error updating stock level:', error)
        res.status(500).json({
            message: 'Error updating stock level',
            error: error.message
        })
    }
}

// @desc    Adjust stock (add or subtract)
// @route   POST /api/materials-management/:id/adjust
// @access  Private
const adjustStock = async (req, res) => {
    try {
        const { id } = req.params
        const { type, quantity, reason, userId } = req.body

        if (!type || quantity === undefined || !reason || !userId) {
            return res.status(400).json({
                message: 'Type (IN/OUT), quantity, reason, and userId are required'
            })
        }

        if (!['IN', 'OUT'].includes(type)) {
            return res.status(400).json({
                message: 'Type must be either IN or OUT'
            })
        }

        // Get current material
        const material = await prisma.material.findUnique({
            where: { id: parseInt(id) }
        })

        if (!material) {
            return res.status(404).json({ message: 'Material not found' })
        }

        const adjustmentQuantity = parseFloat(quantity)
        const oldQuantity = material.qtyOnHand
        let newQuantity

        if (type === 'IN') {
            newQuantity = oldQuantity + adjustmentQuantity
        } else {
            newQuantity = oldQuantity - adjustmentQuantity
            if (newQuantity < 0) {
                return res.status(400).json({
                    message: 'Insufficient stock for this adjustment'
                })
            }
        }

        // Update material quantity
        const updatedMaterial = await prisma.material.update({
            where: { id: parseInt(id) },
            data: { qtyOnHand: newQuantity }
        })

        // Create movement record
        await prisma.materialMovement.create({
            data: {
                materialId: parseInt(id),
                movementType: type,
                quantity: adjustmentQuantity,
                notes: reason,
                userId: parseInt(userId),
                qtyAfter: newQuantity
            }
        })

        // Clear caches
        clearMaterialCaches()
        cache.del(`material_${id}`)

        res.json({
            message: 'Stock adjusted successfully',
            material: updatedMaterial,
            previousQuantity: oldQuantity,
            newQuantity,
            adjustment: {
                type,
                quantity: adjustmentQuantity
            }
        })
    } catch (error) {
        console.error('Error adjusting stock:', error)
        res.status(500).json({
            message: 'Error adjusting stock',
            error: error.message
        })
    }
}

// @desc    Validate material type
// @route   POST /api/materials-management/validate/material-type
// @access  Private
const validateMaterialType = async (req, res) => {
    try {
        const { materialTypeId } = req.body

        if (!materialTypeId) {
            return res.status(400).json({
                message: 'Material type ID is required'
            })
        }

        const materialType = await prisma.materialType.findUnique({
            where: { id: parseInt(materialTypeId) }
        })

        if (!materialType) {
            return res.status(404).json({
                message: 'Material type not found',
                valid: false
            })
        }

        res.json({
            message: 'Material type is valid',
            valid: true,
            materialType
        })
    } catch (error) {
        console.error('Error validating material type:', error)
        res.status(500).json({
            message: 'Error validating material type',
            error: error.message
        })
    }
}

module.exports = {
    getAllMaterials,
    getMaterialById,
    createMaterial,
    updateMaterial,
    deleteMaterial,
    getMaterialsByCategory,
    getMaterialsWithCriticalStock,
    bulkUpdateMaterials,
    exportMaterials,
    importMaterials,
    getInventoryAnalytics,
    getStockMovements,
    updateStockLevel,
    adjustStock,
    validateMaterialType
} 