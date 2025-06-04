const express = require('express');
const asyncHandler = require('express-async-handler');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { OrderLink, Order, User, ProgressReport, Contact, MaterialMovement, Product, Material, OrderProduct, ProductProgressReport, ProductProgressPhoto } = require('../models');
const MaterialMovementController = require('../controllers/materialMovementController');
const OrderProductCompletionService = require('../services/OrderProductCompletionService');
const crypto = require('crypto');
const { sequelize } = require('../config/database');
const { Op, Transaction } = require('sequelize');

const router = express.Router();

// Helper function to generate a secure token
const generateToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// POST /api/order-links - Create new order link (protected by middleware protect and adminOnly)
router.post('/', protect, adminOnly, asyncHandler(async (req, res) => {
  const { orderId, userId, expireAt } = req.body;

  // Validate required fields - userId is now optional
  if (!orderId || !expireAt) {
    res.status(400).json({ 
      success: false, 
      message: 'Order ID dan tanggal kadaluarsa harus diisi' 
    });
    return;
  }

  // Check if order exists
  const order = await Order.findByPk(orderId);
  if (!order) {
    res.status(404).json({ message: 'Order tidak ditemukan' });
    return;
  }

  // Check if user (penjahit) exists - only if userId is provided
  if (userId) {
    const user = await User.findByPk(userId);
    if (!user || user.role !== 'penjahit') {
      res.status(404).json({ message: 'User (Penjahit) tidak ditemukan atau bukan penjahit' });
      return;
    }
  }

  // Generate unique token
  const token = generateToken();

  // Create order link - userId can be null for public links
  const newOrderLink = await OrderLink.create({
    orderId,
    userId: userId || null, // Allow null for public links
    token,
    expireAt,
    isActive: true
  });

  // Fetch the complete link with related data (excluding sensitive user data)
  const completeLink = await OrderLink.findByPk(newOrderLink.id, {
    include: [
        { model: Order, attributes: ['id', 'orderNumber', 'targetPcs', 'dueDate', 'description'] },
        { model: User, attributes: ['id', 'name'], required: false } // Make User join optional
    ]
  });

  res.status(201).json(completeLink);
}));

// GET /api/order-links/:token - Get order details by token (Public Access - no user token needed)
router.get('/:token', asyncHandler(async (req, res) => {
  try {
    const { token } = req.params;

    const orderLink = await OrderLink.findOne({
      where: { token, isActive: true },
      include: [
        {
          model: Order,
          include: [
            {
              model: OrderProduct,
              as: 'OrderProducts',
              include: [{
                model: Product,
                include: [{ model: Material, attributes: ['id', 'name', 'code', 'unit'] }]
              }]
            },
            {
              model: ProgressReport,
              include: [{ model: User, attributes: ['name', 'email'] }],
              order: [['reportedAt', 'DESC']]
            },
            {
              model: User,
              as: 'Tailor',
              attributes: ['id', 'name', 'whatsappPhone']
            },
            {
              model: Contact,
              as: 'TailorContact',
              attributes: ['id', 'name', 'whatsappPhone', 'email', 'company', 'position'],
              required: false
            }
          ]
        },
        {
          model: User,
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!orderLink) {
      return res.status(404).json({ message: 'Order link not found or inactive' });
    }

    // Check if link has expired (older than 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    if (orderLink.createdAt < thirtyDaysAgo) {
      return res.status(400).json({ message: 'Order link has expired' });
    }

    // NEW: Get per-product completion summary
    const completionSummary = await OrderProductCompletionService.getOrderCompletionSummary(orderLink.Order.id);
    
    // NEW: Get incomplete products for conditional rendering
    const incompleteProducts = await OrderProductCompletionService.getIncompleteOrderProducts(orderLink.Order.id);

    // Enhanced response with completion data
    res.json({ 
      orderLink,
      completionSummary,
      incompleteProducts
    });
  } catch (error) {
    console.error('Error fetching order link:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}));

// POST /api/order-links/:token/progress - Enhanced for per-product progress tracking
router.post('/:token/progress', asyncHandler(async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { token } = req.params;
    const { 
      // Legacy fields (for backward compatibility)
      pcsFinished, 
      note, 
      photoUrl, 
      resiPengiriman, 
      tailorName, 
      fabricUsage,
      productMaterials,
      remainingFabric,
      isCompletingOrder,
      // NEW: Per-product progress fields
      productProgressData, // Array of per-product progress
      overallNote,
      overallPhoto,
      progressType = 'legacy' // 'legacy' or 'per-product'
    } = req.body;

    // Find the order link with full product details
    const orderLink = await OrderLink.findOne({
      where: { token, isActive: true },
      include: [{
        model: Order,
        include: [{
          model: OrderProduct,
          as: 'OrderProducts',
          include: [{
            model: Product,
            include: [{ model: Material, attributes: ['id', 'name', 'code', 'unit'] }]
          }]
        }]
      }],
      transaction
    });

    if (!orderLink) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Order link not found or inactive' });
    }

    const order = orderLink.Order;

    // Handle per-product progress tracking
    if (progressType === 'per-product' && productProgressData && productProgressData.length > 0) {
      return await handlePerProductProgress(req, res, transaction, orderLink, order, {
        productProgressData,
        overallNote,
        overallPhoto,
        tailorName,
        remainingFabric,
        isCompletingOrder
      });
    }

    // Legacy progress handling (existing code)
    return await handleLegacyProgress(req, res, transaction, orderLink, order, {
      pcsFinished, 
      note, 
      photoUrl, 
      resiPengiriman, 
      tailorName, 
      fabricUsage,
      productMaterials,
      remainingFabric,
      isCompletingOrder
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Error submitting progress:', error);
    res.status(500).json({ 
      message: 'Failed to submit progress report',
      error: error.message 
    });
  }
}));

// NEW: Handle per-product progress submission - ENHANCED for individual progress reports
async function handlePerProductProgress(req, res, transaction, orderLink, order, data) {
  const { productProgressData, overallNote, overallPhoto, tailorName, remainingFabric, isCompletingOrder } = data

  // 🔍 ENHANCED DEBUG: Backend processing analysis
  console.log('🔍 =============================================')
  console.log('🔍 INDIVIDUAL PROGRESS REPORTS IMPLEMENTATION')
  console.log('🔍 =============================================')
  console.log('🔍 Order ID:', order.id)
  console.log('🔍 Order Number:', order.orderNumber)
  console.log('🔍 Products received:', productProgressData?.length || 0)
  console.log('🔍 Tailor name:', tailorName)
  
  if (productProgressData && Array.isArray(productProgressData)) {
    console.log('🔍 Product details analysis:')
    productProgressData.forEach((product, index) => {
      console.log(`🔍   Product ${index + 1}:`, {
        productId: product.productId,
        orderProductId: product.orderProductId,
        pcsFinished: product.pcsFinished,
        fabricUsed: product.fabricUsed,
        hasFabric: parseFloat(product.fabricUsed || 0) > 0
      })
    })
  }

  // Validate required fields
  if (!tailorName || tailorName.trim() === '') {
    await transaction.rollback()
    return res.status(400).json({ message: 'Please enter tailor name' })
  }

  // Validate product progress data exists
  if (!productProgressData || !Array.isArray(productProgressData) || productProgressData.length === 0) {
    await transaction.rollback()
    return res.status(400).json({ 
      message: 'Please enter progress for at least one product' 
    })
  }

  // 🔍 ENHANCED DEBUG: Order structure analysis
  console.log('🔍 Order.OrderProducts analysis:')
  if (order.OrderProducts && Array.isArray(order.OrderProducts)) {
    order.OrderProducts.forEach((orderProduct, index) => {
      console.log(`🔍   OrderProduct ${index + 1}:`, {
        orderProductId: orderProduct.id,
        productId: orderProduct.Product?.id,
        productName: orderProduct.Product?.name,
        materialId: orderProduct.Product?.Material?.id,
        materialName: orderProduct.Product?.Material?.name,
        hasValidMaterial: !!(orderProduct.Product?.Material?.id)
      })
    })
  }

  // Validate each product progress data
  for (let i = 0; i < productProgressData.length; i++) {
    const productProgress = productProgressData[i]
    
    console.log(`🔍 Validating product ${i + 1}:`, {
      orderProductId: productProgress.orderProductId,
      productId: productProgress.productId,
      pcsFinished: productProgress.pcsFinished,
      fabricUsed: productProgress.fabricUsed
    })
    
    // Check required fields
    if (!productProgress.orderProductId) {
      await transaction.rollback()
      return res.status(400).json({ 
        message: `Product ${i + 1}: Missing order product ID` 
      })
    }

    if (!productProgress.productId) {
      await transaction.rollback()
      return res.status(400).json({ 
        message: `Product ${i + 1}: Missing product ID` 
      })
    }

    // 🔧 ENHANCED VALIDATION: Allow fabric-only tracking
    const pcsFinished = parseInt(productProgress.pcsFinished || 0)
    const fabricUsed = parseFloat(productProgress.fabricUsed || 0)
    
    // Validate that at least pieces OR fabric is provided
    if (pcsFinished <= 0 && fabricUsed <= 0) {
      await transaction.rollback()
      return res.status(400).json({ 
        message: `Product ${i + 1}: Must have either pieces completed or fabric used (received pieces: ${productProgress.pcsFinished}, fabric: ${productProgress.fabricUsed})` 
      })
    }

    // If pieces provided, validate they are positive
    if (productProgress.pcsFinished && (isNaN(pcsFinished) || pcsFinished < 0)) {
      await transaction.rollback()
      return res.status(400).json({ 
        message: `Product ${i + 1}: Invalid pieces completed (received: ${productProgress.pcsFinished})` 
      })
    }

    // Update the values to be parsed numbers
    productProgress.pcsFinished = pcsFinished
    productProgress.fabricUsed = fabricUsed
    
    console.log(`🔍 Product ${i + 1} validation passed:`, {
      pcsFinished: productProgress.pcsFinished,
      fabricUsed: productProgress.fabricUsed,
      validationType: pcsFinished > 0 ? (fabricUsed > 0 ? 'pieces+fabric' : 'pieces-only') : 'fabric-only'
    })
  }

  // Calculate total pieces from per-product data
  const totalPcsFinished = productProgressData.reduce((sum, pp) => sum + parseInt(pp.pcsFinished), 0)
  console.log('🔍 Total pieces finished:', totalPcsFinished)

  // Calculate current progress
  const existingProgress = await ProgressReport.sum('pcsFinished', {
    where: { orderId: order.id },
    transaction
  }) || 0

  const newTotal = existingProgress + totalPcsFinished
  console.log('🔍 Progress calculation:', {
    existingProgress,
    newPieces: totalPcsFinished,
    newTotal,
    orderTarget: order.targetPcs,
    isFabricOnlySubmission: totalPcsFinished === 0
  })

  // Validate progress doesn't exceed target (only if pieces are being submitted)
  if (totalPcsFinished > 0 && newTotal > order.targetPcs) {
    await transaction.rollback()
    return res.status(400).json({ 
      message: `Cannot complete ${totalPcsFinished} pieces. Only ${order.targetPcs - existingProgress} pieces remaining.` 
    })
  }

  // Allow fabric-only submissions even for completed orders
  if (totalPcsFinished === 0) {
    console.log('🔍 Fabric-only submission detected - allowing even for completed orders')
  }

  // 🔥 NEW IMPLEMENTATION: Create individual progress reports per product
  console.log('🔍 =============================================')
  console.log('🔍 CREATING INDIVIDUAL PROGRESS REPORTS')
  console.log('🔍 =============================================')
  
  const individualProgressReports = []
  const productProgressReports = []
  let fabricMovements = []
  
  for (const productProgress of productProgressData) {
    console.log(`🔍 Creating individual progress report for product ${productProgress.productId}...`)
    
    // Create individual progress report for this product
    const individualProgressReport = await ProgressReport.create({
      orderId: order.id,
      productId: productProgress.productId,
      orderProductId: productProgress.orderProductId,
      reportType: 'individual',
      pcsFinished: parseInt(productProgress.pcsFinished),
      note: overallNote || `Individual progress for product ${productProgress.productId}`,
      photoUrl: overallPhoto || null,
      tailorName: tailorName,
      reportedAt: new Date()
    }, { transaction })
    
    individualProgressReports.push(individualProgressReport)
    console.log(`🔍 Individual progress report created:`, {
      id: individualProgressReport.id,
      productId: individualProgressReport.productId,
      orderProductId: individualProgressReport.orderProductId,
      pcsFinished: individualProgressReport.pcsFinished,
      reportType: individualProgressReport.reportType
    })

    // Create corresponding product progress report (for backward compatibility)
    const productProgressReport = await ProductProgressReport.create({
      progressReportId: individualProgressReport.id,
      productId: productProgress.productId,
      orderProductId: productProgress.orderProductId,
      pcsFinished: parseInt(productProgress.pcsFinished),
      pcsTargetForThisReport: parseInt(productProgress.pcsTargetForThisReport || productProgress.pcsFinished),
      fabricUsed: parseFloat(productProgress.fabricUsed || 0),
      qualityNotes: productProgress.qualityNotes || null,
      challenges: productProgress.challenges || null,
      estimatedCompletion: productProgress.estimatedCompletion ? new Date(productProgress.estimatedCompletion) : null,
      workHours: parseFloat(productProgress.workHours || 0),
      qualityScore: parseInt(productProgress.qualityScore || 100)
    }, { transaction })

    productProgressReports.push(productProgressReport)
    console.log(`🔍 ProductProgressReport created:`, {
      id: productProgressReport.id,
      productId: productProgressReport.productId,
      pcsFinished: productProgressReport.pcsFinished,
      fabricUsed: productProgressReport.fabricUsed
    })

    // Handle per-product photos if provided
    if (productProgress.photos && productProgress.photos.length > 0) {
      const photoRecords = productProgress.photos.map((photo, index) => ({
        productProgressReportId: productProgressReport.id,
        photoUrl: photo.url,
        thumbnailUrl: photo.thumbnailUrl || null,
        photoCaption: photo.caption || null,
        photoType: photo.type || 'progress',
        sortOrder: index,
        originalFileName: photo.originalFileName || null,
        fileSize: photo.fileSize || null,
        mimeType: photo.mimeType || null,
        uploadedAt: new Date()
      }))

      await ProductProgressPhoto.bulkCreate(photoRecords, { transaction })
      console.log(`🔍 Created ${photoRecords.length} photos for product ${productProgress.productId}`)
    }

    // 🔍 ENHANCED DEBUG: Material movement creation analysis per product
    console.log(`🔍 Processing MaterialMovement for product ${productProgress.productId}...`)
    
    const fabricUsed = parseFloat(productProgress.fabricUsed || 0)
    if (fabricUsed > 0) {
      // Find the product's material using the OrderProducts structure
      const orderProduct = order.OrderProducts.find(op => op.id === productProgress.orderProductId)
      console.log(`🔍 OrderProduct lookup for ${productProgress.orderProductId}:`, {
        found: !!orderProduct,
        productName: orderProduct?.Product?.name,
        materialId: orderProduct?.Product?.Material?.id,
        materialName: orderProduct?.Product?.Material?.name
      })
      
      if (orderProduct && orderProduct.Product.Material) {
        console.log(`🔍 Creating MaterialMovement for ${orderProduct.Product.name}...`)
        
        const movement = await MaterialMovement.create({
          materialId: orderProduct.Product.Material.id,
          orderId: order.id,
          qty: fabricUsed,
          movementType: 'KELUAR',
          movementSource: 'order',
          description: `Individual: Fabric used for ${orderProduct.Product.name} - ${productProgress.pcsFinished} pieces`,
          referenceNumber: `PROG-${individualProgressReport.id}`, // Link to individual progress report
          notes: `Individual Progress Report: Product: ${orderProduct.Product.name}, Quality: ${productProgress.qualityScore || 100}%, Individual Report ID: ${individualProgressReport.id}`
        }, { transaction })

        fabricMovements.push(movement)
        console.log('🔍 MaterialMovement created successfully:', {
          id: movement.id,
          materialId: movement.materialId,
          materialName: orderProduct.Product.Material.name,
          qty: movement.qty,
          movementType: movement.movementType,
          referenceNumber: movement.referenceNumber,
          description: movement.description
        })

        // Update material stock
        console.log(`🔍 Updating material stock for ${orderProduct.Product.Material.name}...`)
        await Material.decrement('qtyOnHand', {
          by: fabricUsed,
          where: { id: orderProduct.Product.Material.id },
          transaction
        })
        console.log(`🔍 Material stock updated: -${fabricUsed} units`)
      } else {
        console.log(`🔍 ⚠️ Skipping MaterialMovement - no valid material found for product ${productProgress.productId}`)
      }
    } else {
      console.log(`🔍 Skipping MaterialMovement - no fabric usage for product ${productProgress.productId}`)
    }
  }

  const totalFabricUsed = productProgressData.reduce((sum, pp) => sum + parseFloat(pp.fabricUsed || 0), 0)
  console.log('🔍 Individual progress reports summary:', {
    totalProgressReports: individualProgressReports.length,
    totalProductProgressReports: productProgressReports.length,
    totalMaterialMovements: fabricMovements.length,
    totalFabricUsed,
    movementIds: fabricMovements.map(m => m.id)
  })

  // Handle remaining fabric (same as legacy)
  let remainingFabricMovements = []
  if (isCompletingOrder && remainingFabric && remainingFabric.length > 0) {
    console.log('🔍 Processing remaining fabric movements...')
    remainingFabricMovements = await createRemainingFabricMovements(
      order.id,
      remainingFabric,
      individualProgressReports[0]?.id || 'BATCH', // Use first individual report ID or batch ID
      transaction,
      tailorName
    )
    console.log('🔍 Remaining fabric movements created:', remainingFabricMovements.length)
  }

  // NEW: Update per-product completion status using OrderProductCompletionService
  console.log('🔄 Updating per-product completion status...')
  const completionResults = await OrderProductCompletionService.processProgressSubmission(productProgressData)
  console.log('✅ Per-product completion updated:', completionResults)

  // Update order status if completed
  let orderStatus = order.status
  if (newTotal >= order.targetPcs) {
    orderStatus = 'completed'
    await order.update({ 
      status: 'completed',
      completedPcs: newTotal 
    }, { transaction })
    console.log('🔍 Order marked as completed')
  } else {
    await order.update({ 
      completedPcs: newTotal 
    }, { transaction })
    console.log('🔍 Order progress updated:', `${newTotal}/${order.targetPcs}`)
  }

  // Update OrderLink usage
  await orderLink.update({
    lastUsedAt: new Date(),
    usageCount: (orderLink.usageCount || 0) + 1
  }, { transaction })

  await transaction.commit()
  console.log('🔍 Transaction committed successfully')

  // 🔍 ENHANCED DEBUG: Format response with individual progress details
  console.log('🔍 =============================================')
  console.log('🔍 INDIVIDUAL RESPONSE FORMATTING')
  console.log('🔍 =============================================')
  
  // Format material movements as tickets for frontend display
  let materialMovementTickets = []
  if (fabricMovements.length > 0 || remainingFabricMovements.length > 0) {
    const allMovements = [...fabricMovements, ...remainingFabricMovements]
    console.log('🔍 Formatting movement tickets:', allMovements.length)
    
    // Fetch movements with full relationships for proper formatting
    const movementsWithRelations = await MaterialMovement.findAll({
      where: { 
        id: { [Op.in]: allMovements.map(m => m.id) }
      },
      include: [
        {
          model: Material,
          attributes: ['id', 'name', 'code', 'unit']
        },
        {
          model: Order,
          attributes: ['id', 'orderNumber', 'status']
        }
      ]
    })

    // Format as tickets using controller method
    materialMovementTickets = movementsWithRelations.map(movement => {
      const ticket = MaterialMovementController.formatMovementAsTicket(movement)
      console.log('🔍 Formatted movement ticket:', {
        id: ticket.id,
        materialName: ticket.materialName,
        qty: ticket.qty,
        movementType: ticket.movementType
      })
      return ticket
    })
  }

  // Prepare enhanced response with individual progress data
  const response = {
    success: true,
    message: orderStatus === 'completed' 
      ? `Order completed with individual progress tracking! Total: ${newTotal}/${order.targetPcs} pieces across ${individualProgressReports.length} products.`
      : `Individual progress recorded successfully! Progress: ${newTotal}/${order.targetPcs} pieces across ${individualProgressReports.length} products.`,
    // NEW: Individual progress reports data
    individualProgressReports: individualProgressReports.map(ipr => ({
      id: ipr.id,
      productId: ipr.productId,
      orderProductId: ipr.orderProductId,
      pcsFinished: ipr.pcsFinished,
      reportType: ipr.reportType,
      reportedAt: ipr.reportedAt
    })),
    progressReport: {
      // Legacy compatibility - use first individual report data
      id: individualProgressReports[0]?.id,
      pcsFinished: totalPcsFinished,
      totalPcsCompleted: newTotal,
      orderTarget: order.targetPcs,
      isOrderCompleted: orderStatus === 'completed',
      type: 'individual'
    },
    productReports: productProgressReports.map(ppr => ({
      id: ppr.id,
      productId: ppr.productId,
      orderProductId: ppr.orderProductId,
      pcsFinished: ppr.pcsFinished,
      fabricUsed: ppr.fabricUsed,
      qualityScore: ppr.qualityScore
    })),
    fabricMovements: materialMovementTickets,
    totalFabricUsed: totalFabricUsed,
    movementsCreated: fabricMovements.length,
    orderStatus: orderStatus,
    // NEW: Individual tracking metadata
    individualTrackingEnabled: true,
    totalIndividualReports: individualProgressReports.length
  }

  console.log('🔍 Final individual response summary:', {
    individualProgressReports: response.individualProgressReports.length,
    productReportsCount: response.productReports.length,
    fabricMovementsCount: response.fabricMovements.length,
    totalFabricUsed: response.totalFabricUsed,
    orderCompleted: response.progressReport.isOrderCompleted,
    individualTrackingEnabled: response.individualTrackingEnabled
  })

  res.json(response)
}

// Legacy progress handling (existing functionality)
async function handleLegacyProgress(req, res, transaction, orderLink, order, data) {
  const { 
    pcsFinished, 
    note, 
    photoUrl, 
    resiPengiriman, 
    tailorName, 
    fabricUsage,
    productMaterials,
    remainingFabric,
    isCompletingOrder
  } = data;

  // Validate required fields
  if (!pcsFinished || pcsFinished <= 0) {
    await transaction.rollback();
    return res.status(400).json({ message: 'Please enter a valid number of pieces completed' });
  }

  if (!tailorName || tailorName.trim() === '') {
    await transaction.rollback();
    return res.status(400).json({ message: 'Please enter tailor name' });
  }

  // Calculate current progress
  const existingProgress = await ProgressReport.sum('pcsFinished', {
    where: { orderId: order.id },
    transaction
  }) || 0;

  const newTotal = existingProgress + parseInt(pcsFinished);

  // Validate progress doesn't exceed target
  if (newTotal > order.targetPcs) {
    await transaction.rollback();
    return res.status(400).json({ 
      message: `Cannot complete ${pcsFinished} pieces. Only ${order.targetPcs - existingProgress} pieces remaining.` 
    });
  }

  // Create progress report
  const progressReport = await ProgressReport.create({
    orderId: order.id,
    pcsFinished: parseInt(pcsFinished),
    note: note || null,
    photoUrl: photoUrl || null,
    resiPengiriman: resiPengiriman || null,
    tailorName: tailorName || null,
    reportedAt: new Date()
  }, { transaction });

  // Handle fabric usage - create MaterialMovement for fabric consumption
  let fabricMovements = [];
  if (fabricUsage && fabricUsage > 0 && productMaterials && productMaterials.length > 0) {
    fabricMovements = await createFabricMovements(
      order.id, 
      fabricUsage, 
      productMaterials, 
      progressReport.id, 
      transaction,
      tailorName
    );
  }

  // Handle remaining fabric - create MaterialMovement for remaining fabric inventory
  let remainingFabricMovements = [];
  if (isCompletingOrder && remainingFabric && remainingFabric.length > 0) {
    remainingFabricMovements = await createRemainingFabricMovements(
      order.id,
      remainingFabric,
      progressReport.id,
      transaction,
      tailorName
    );
  }

  // Update order status if completed
  let orderStatus = order.status;
  if (newTotal >= order.targetPcs) {
    orderStatus = 'completed';
    await order.update({ 
      status: 'completed',
      completedPcs: newTotal 
    }, { transaction });
  } else {
    await order.update({ 
      completedPcs: newTotal 
    }, { transaction });
  }

  // Update OrderLink usage
  await orderLink.update({
    lastUsedAt: new Date(),
    usageCount: (orderLink.usageCount || 0) + 1
  }, { transaction });

  await transaction.commit();

  // Format material movements as tickets for frontend display
  let materialMovementTickets = [];
  if (fabricMovements.length > 0 || remainingFabricMovements.length > 0) {
    const allMovements = [...fabricMovements, ...remainingFabricMovements];
    
    // Fetch movements with full relationships for proper formatting
    const movementsWithRelations = await MaterialMovement.findAll({
      where: { 
        id: { [Op.in]: allMovements.map(m => m.id) }
      },
      include: [
        {
          model: Material,
          attributes: ['id', 'name', 'code', 'unit']
        },
        {
          model: Order,
          attributes: ['id', 'orderNumber', 'status']
        }
      ]
    });

    // Format as tickets using controller method
    materialMovementTickets = movementsWithRelations.map(movement => 
      MaterialMovementController.formatMovementAsTicket(movement)
    );
  }

  // Prepare response with movement information
  const response = {
    success: true,
    message: orderStatus === 'completed' 
      ? `Order completed successfully! Total: ${newTotal}/${order.targetPcs} pieces.`
      : `Progress recorded successfully! Progress: ${newTotal}/${order.targetPcs} pieces.`,
    progressReport: {
      id: progressReport.id,
      pcsFinished: progressReport.pcsFinished,
      totalCompleted: newTotal,
      targetPcs: order.targetPcs,
      isCompleted: orderStatus === 'completed',
      type: 'legacy'
    },
    // Include formatted material movement tickets
    materialMovementTickets: materialMovementTickets,
    fabricUsageTracked: fabricMovements.length > 0,
    remainingFabricTracked: remainingFabricMovements.length > 0
  };

  // Add legacy fabric movement info for backward compatibility (deprecated)
  if (fabricMovements.length > 0) {
    response.fabricMovements = fabricMovements.map(fm => ({
      materialId: fm.materialId,
      materialName: fm.description,
      qty: fm.qty,
      unit: fm.notes || 'units'
    }));
  }

  // Add legacy remaining fabric movement info for backward compatibility (deprecated)
  if (remainingFabricMovements.length > 0) {
    response.remainingFabricMovements = remainingFabricMovements.map(rfm => ({
      materialId: rfm.materialId,
      qty: rfm.qty,
      condition: rfm.notes || 'good'
    }));
  }

  res.json(response);
}

// NEW: Helper function to create fabric consumption movements
async function createFabricMovements(orderId, fabricUsage, productMaterials, progressReportId, transaction, tailorName) {
  const movements = [];
  
  try {
    // Group materials by materialId to avoid duplicates
    const materialGroups = {};
    productMaterials.forEach(pm => {
      if (!materialGroups[pm.materialId]) {
        materialGroups[pm.materialId] = {
          materialId: pm.materialId,
          materialName: pm.materialName,
          materialUnit: pm.materialUnit,
          totalQuantity: 0
        };
      }
      materialGroups[pm.materialId].totalQuantity += pm.quantity || 1;
    });

    // Create movements for each unique material
    for (const [materialId, materialInfo] of Object.entries(materialGroups)) {
      // Calculate proportional usage if multiple materials
      const materialCount = Object.keys(materialGroups).length;
      const usagePerMaterial = materialCount > 1 ? fabricUsage / materialCount : fabricUsage;
      
      const movement = await MaterialMovement.create({
        materialId: parseInt(materialId),
        orderId: orderId,
        userId: null, // Anonymous progress report
        qty: usagePerMaterial,
        movementType: 'KELUAR',
        description: `Fabric consumption - Progress by ${tailorName}`,
        purchaseLogId: null,
        movementSource: 'order',
        referenceNumber: `PROG-${progressReportId}`,
        unitPrice: null,
        totalValue: null,
        notes: `Unit: ${materialInfo.materialUnit} | Progress Report ID: ${progressReportId}`
      }, { transaction });

      movements.push(movement);
    }

    console.log(`Created ${movements.length} fabric consumption movements for order ${orderId}`);
    return movements;
    
  } catch (error) {
    console.error('Error creating fabric movements:', error);
    throw error;
  }
}

// NEW: Helper function to create remaining fabric movements
async function createRemainingFabricMovements(orderId, remainingFabric, progressReportId, transaction, tailorName) {
  const movements = [];
  
  try {
    for (const fabric of remainingFabric) {
      // Only create movement if there's remaining quantity
      if (fabric.remainingQty && fabric.remainingQty > 0) {
        const movement = await MaterialMovement.create({
          materialId: fabric.materialId,
          orderId: orderId,
          userId: null,
          qty: fabric.remainingQty,
          movementType: 'MASUK', // Returning to inventory
          description: `Remaining fabric return - Order completion by ${tailorName}`,
          purchaseLogId: null,
          movementSource: 'order',
          referenceNumber: `REMAIN-${progressReportId}`,
          unitPrice: null,
          totalValue: null,
          notes: `Condition: ${fabric.condition} | Notes: ${fabric.notes || 'No notes'} | Progress Report ID: ${progressReportId}`
        }, { transaction });

        movements.push(movement);
      }
    }

    console.log(`Created ${movements.length} remaining fabric movements for order ${orderId}`);
    return movements;
    
  } catch (error) {
    console.error('Error creating remaining fabric movements:', error);
    throw error;
  }
}

// Note: DELETE and PUT for OrderLink itself might be needed later, but for now, only creation and access/update via token are implemented.

module.exports = router; 