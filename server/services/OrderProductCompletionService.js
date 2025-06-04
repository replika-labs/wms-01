const { ProductProgressReport, OrderProduct, sequelize, Product, ProgressReport } = require('../models');

/**
 * Service for managing per-product completion status
 * Tracks completion progress for individual products within orders
 */
class OrderProductCompletionService {
  
  /**
   * Calculate and update completion status for a specific OrderProduct
   * @param {number} orderProductId - The OrderProduct ID to update
   * @returns {Promise<Object>} Updated completion data
   */
  static async updateOrderProductCompletion(orderProductId) {
    try {
      // Get the OrderProduct
      const orderProduct = await OrderProduct.findByPk(orderProductId);
      if (!orderProduct) {
        throw new Error(`OrderProduct with ID ${orderProductId} not found`);
      }

      // Calculate total completed pieces from ProductProgressReports
      const totalCompleted = await ProductProgressReport.sum('pcsFinished', {
        where: { orderProductId: orderProductId }
      }) || 0;

      // Update OrderProduct with new completion data
      const wasCompleted = orderProduct.isCompleted;
      const isNowCompleted = totalCompleted >= orderProduct.qty;
      
      await orderProduct.update({
        completedQty: totalCompleted,
        isCompleted: isNowCompleted,
        completionDate: isNowCompleted && !wasCompleted ? new Date() : orderProduct.completionDate
      });

      // Reload to get updated data
      await orderProduct.reload();

      return {
        orderProductId: orderProduct.id,
        productId: orderProduct.productId,
        orderId: orderProduct.orderId,
        qty: orderProduct.qty,
        completedQty: orderProduct.completedQty,
        isCompleted: orderProduct.isCompleted,
        completionDate: orderProduct.completionDate,
        completionPercentage: orderProduct.getCompletionPercentage(),
        remainingQty: orderProduct.getRemainingQty(),
        justCompleted: isNowCompleted && !wasCompleted
      };
    } catch (error) {
      console.error('Error updating OrderProduct completion:', error);
      throw error;
    }
  }

  /**
   * Update completion status for all OrderProducts in an order
   * @param {number} orderId - The Order ID to update
   * @returns {Promise<Array>} Array of updated completion data
   */
  static async updateOrderCompletions(orderId) {
    try {
      const orderProducts = await OrderProduct.findAll({
        where: { orderId: orderId }
      });

      const completionUpdates = [];
      for (const orderProduct of orderProducts) {
        const update = await this.updateOrderProductCompletion(orderProduct.id);
        completionUpdates.push(update);
      }

      return completionUpdates;
    } catch (error) {
      console.error('Error updating order completions:', error);
      throw error;
    }
  }

  /**
   * Get completion summary for an order
   * @param {number} orderId - The Order ID
   * @returns {Promise<Object>} Order completion summary
   */
  static async getOrderCompletionSummary(orderId) {
    try {
      const orderProducts = await OrderProduct.findAll({
        where: { orderId: orderId },
        include: [{
          model: ProductProgressReport,
          as: 'ProgressReports',
          attributes: ['id', 'pcsFinished', 'createdAt']
        }]
      });

      const summary = {
        orderId: orderId,
        totalProducts: orderProducts.length,
        completedProducts: 0,
        totalPieces: 0,
        completedPieces: 0,
        products: []
      };

      for (const orderProduct of orderProducts) {
        const productData = {
          orderProductId: orderProduct.id,
          productId: orderProduct.productId,
          qty: orderProduct.qty,
          completedQty: orderProduct.completedQty,
          isCompleted: orderProduct.isCompleted,
          completionDate: orderProduct.completionDate,
          completionPercentage: orderProduct.getCompletionPercentage(),
          remainingQty: orderProduct.getRemainingQty()
        };

        summary.products.push(productData);
        summary.totalPieces += orderProduct.qty;
        summary.completedPieces += orderProduct.completedQty;
        
        if (orderProduct.isCompleted) {
          summary.completedProducts++;
        }
      }

      summary.orderCompletionPercentage = summary.totalPieces > 0 
        ? Math.round((summary.completedPieces / summary.totalPieces) * 100) 
        : 0;
      
      summary.isOrderComplete = summary.completedProducts === summary.totalProducts;

      return summary;
    } catch (error) {
      console.error('Error getting order completion summary:', error);
      throw error;
    }
  }

  /**
   * Get incomplete OrderProducts for an order (for conditional rendering)
   * @param {number} orderId - The Order ID
   * @returns {Promise<Array>} Array of incomplete OrderProduct IDs
   */
  static async getIncompleteOrderProducts(orderId) {
    try {
      const incompleteProducts = await OrderProduct.findAll({
        where: { 
          orderId: orderId,
          isCompleted: false 
        },
        attributes: ['id', 'productId', 'qty', 'completedQty']
      });

      return incompleteProducts.map(op => ({
        orderProductId: op.id,
        productId: op.productId,
        qty: op.qty,
        completedQty: op.completedQty,
        remainingQty: op.getRemainingQty(),
        completionPercentage: op.getCompletionPercentage()
      }));
    } catch (error) {
      console.error('Error getting incomplete order products:', error);
      throw error;
    }
  }

  /**
   * Process progress submission and update per-product completion status
   * @param {Array} productProgressData - Array of product progress objects
   * @returns {Object} - Completion status results
   */
  static async processProgressSubmission(productProgressData) {
    const results = {
      processed: 0,
      updated: 0,
      completed: 0,
      details: []
    }

    if (!Array.isArray(productProgressData)) {
      return results
    }

    for (const productProgress of productProgressData) {
      try {
        // Find OrderProduct record
        const orderProduct = await OrderProduct.findByPk(productProgress.orderProductId, {
          include: [{
            model: Product,
            attributes: ['id', 'name']
          }]
        })

        if (!orderProduct) {
          console.log(`⚠️ OrderProduct not found: ${productProgress.orderProductId}`)
          continue
        }

        // Calculate total completed pieces for this product
        const totalCompleted = await ProgressReport.sum('pcsFinished', {
          where: {
            orderProductId: productProgress.orderProductId,
            reportType: 'individual'
          }
        }) || 0

        // Add current submission
        const newTotal = totalCompleted + parseInt(productProgress.pcsFinished || 0)
        const targetQuantity = orderProduct.quantity || 1
        const completionPercentage = Math.min((newTotal / targetQuantity) * 100, 100)
        const isCompleted = newTotal >= targetQuantity

        // Update OrderProduct completion status (if we have such fields)
        const updateData = {
          completedPcs: newTotal
        }

        // Check if OrderProduct has completion fields
        if ('completionPercentage' in orderProduct) {
          updateData.completionPercentage = completionPercentage
        }
        if ('isCompleted' in orderProduct) {
          updateData.isCompleted = isCompleted
        }
        if ('completedAt' in orderProduct && isCompleted && !orderProduct.completedAt) {
          updateData.completedAt = new Date()
        }

        await orderProduct.update(updateData)

        const productResult = {
          orderProductId: productProgress.orderProductId,
          productId: productProgress.productId,
          productName: orderProduct.Product?.name,
          previousTotal: totalCompleted,
          newTotal,
          targetQuantity,
          completionPercentage,
          isCompleted,
          status: isCompleted ? 'completed' : 'in_progress'
        }

        results.details.push(productResult)
        results.processed++

        if (newTotal !== totalCompleted) {
          results.updated++
        }

        if (isCompleted) {
          results.completed++
        }

        console.log(`✅ OrderProduct ${productProgress.orderProductId} completion updated:`, {
          product: orderProduct.Product?.name,
          progress: `${newTotal}/${targetQuantity}`,
          percentage: `${completionPercentage.toFixed(1)}%`,
          completed: isCompleted
        })

      } catch (error) {
        console.error(`❌ Error processing OrderProduct ${productProgress.orderProductId}:`, error)
        results.details.push({
          orderProductId: productProgress.orderProductId,
          error: error.message
        })
      }
    }

    console.log('📊 OrderProduct completion service results:', {
      processed: results.processed,
      updated: results.updated,
      completed: results.completed
    })

    return results
  }

  /**
   * Get completion status for all products in an order
   * @param {number} orderId - Order ID
   * @returns {Array} - Array of product completion status
   */
  static async getOrderProductsCompletionStatus(orderId) {
    const orderProducts = await OrderProduct.findAll({
      where: { orderId },
      include: [{
        model: Product,
        attributes: ['id', 'name']
      }]
    })

    const completionStatus = []

    for (const orderProduct of orderProducts) {
      // Calculate total completed from individual progress reports
      const totalCompleted = await ProgressReport.sum('pcsFinished', {
        where: {
          orderProductId: orderProduct.id,
          reportType: 'individual'
        }
      }) || 0

      const targetQuantity = orderProduct.quantity || 1
      const completionPercentage = Math.min((totalCompleted / targetQuantity) * 100, 100)
      const isCompleted = totalCompleted >= targetQuantity

      completionStatus.push({
        orderProductId: orderProduct.id,
        productId: orderProduct.Product.id,
        productName: orderProduct.Product.name,
        quantity: targetQuantity,
        completed: totalCompleted,
        remaining: Math.max(targetQuantity - totalCompleted, 0),
        completionPercentage,
        isCompleted,
        status: isCompleted ? 'completed' : 'in_progress'
      })
    }

    return completionStatus
  }

  /**
   * Calculate overall order completion based on individual product progress
   * @param {number} orderId - Order ID
   * @returns {Object} - Overall completion data
   */
  static async calculateOrderCompletion(orderId) {
    const productCompletions = await this.getOrderProductsCompletionStatus(orderId)
    
    const totalProducts = productCompletions.length
    const completedProducts = productCompletions.filter(p => p.isCompleted).length
    const totalTargetPieces = productCompletions.reduce((sum, p) => sum + p.quantity, 0)
    const totalCompletedPieces = productCompletions.reduce((sum, p) => sum + p.completed, 0)
    
    const overallPercentage = totalTargetPieces > 0 
      ? (totalCompletedPieces / totalTargetPieces) * 100 
      : 0
    
    const isOrderCompleted = totalCompletedPieces >= totalTargetPieces

    return {
      orderId,
      totalProducts,
      completedProducts,
      totalTargetPieces,
      totalCompletedPieces,
      remainingPieces: totalTargetPieces - totalCompletedPieces,
      overallPercentage,
      isOrderCompleted,
      productCompletions
    }
  }

  /**
   * Get individual progress reports for a specific product
   * @param {number} orderProductId - OrderProduct ID
   * @returns {Array} - Array of individual progress reports
   */
  static async getProductProgressHistory(orderProductId) {
    return await ProgressReport.findAll({
      where: {
        orderProductId,
        reportType: 'individual'
      },
      include: [{
        model: ProductProgressReport,
        as: 'ProductReports'
      }],
      order: [['reportedAt', 'DESC']]
    })
  }

  /**
   * Validate if new progress submission is allowed
   * @param {number} orderProductId - OrderProduct ID
   * @param {number} newPieces - New pieces to add
   * @returns {Object} - Validation result
   */
  static async validateProgressSubmission(orderProductId, newPieces) {
    const orderProduct = await OrderProduct.findByPk(orderProductId)
    
    if (!orderProduct) {
      return {
        valid: false,
        message: 'OrderProduct not found'
      }
    }

    const currentCompleted = await ProgressReport.sum('pcsFinished', {
      where: {
        orderProductId,
        reportType: 'individual'
      }
    }) || 0

    const newTotal = currentCompleted + newPieces
    const targetQuantity = orderProduct.quantity || 1

    if (newTotal > targetQuantity) {
      return {
        valid: false,
        message: `Cannot complete ${newPieces} pieces. Only ${targetQuantity - currentCompleted} pieces remaining for this product.`,
        current: currentCompleted,
        target: targetQuantity,
        remaining: targetQuantity - currentCompleted
      }
    }

    return {
      valid: true,
      current: currentCompleted,
      newTotal,
      target: targetQuantity,
      remaining: targetQuantity - newTotal
    }
  }

  /**
   * Get order completion summary (used by frontend)
   * @param {number} orderId - Order ID
   * @returns {Object} - Summary data for frontend
   */
  static async getOrderCompletionSummary(orderId) {
    const completion = await this.calculateOrderCompletion(orderId)
    
    return {
      orderId,
      totalProducts: completion.totalProducts,
      completedProducts: completion.completedProducts,
      inProgressProducts: completion.totalProducts - completion.completedProducts,
      totalTargetPieces: completion.totalTargetPieces,
      totalCompletedPieces: completion.totalCompletedPieces,
      remainingPieces: completion.remainingPieces,
      overallPercentage: completion.overallPercentage,
      isOrderCompleted: completion.isOrderCompleted,
      status: completion.isOrderCompleted ? 'completed' : 'in_progress'
    }
  }

  /**
   * Get incomplete order products (used by frontend for rendering)
   * @param {number} orderId - Order ID
   * @returns {Array} - Array of incomplete products
   */
  static async getIncompleteOrderProducts(orderId) {
    const productCompletions = await this.getOrderProductsCompletionStatus(orderId)
    
    return productCompletions
      .filter(p => !p.isCompleted)
      .map(p => ({
        orderProductId: p.orderProductId,
        productId: p.productId,
        productName: p.productName,
        quantity: p.quantity,
        completed: p.completed,
        remaining: p.remaining,
        completionPercentage: p.completionPercentage
      }))
  }
}

module.exports = OrderProductCompletionService; 