/**
 * ✨ INDIVIDUAL PROGRESS REPORTS TESTING SCRIPT
 * Tests the new individual progress reports per product implementation
 * Verifies database records, individual tracking, and MaterialMovement creation
 */

const axios = require('axios')
const { sequelize } = require('./server/config/database')
const { ProgressReport, ProductProgressReport, MaterialMovement, Order, OrderProduct, Product, Material } = require('./server/models')

const BASE_URL = 'http://localhost:8080'

async function testIndividualProgressReports() {
  console.log('🧪 =============================================')
  console.log('🧪 TESTING INDIVIDUAL PROGRESS REPORTS')
  console.log('🧪 =============================================')

  try {
    // **STEP 1**: Get test OrderLink data
    console.log('📋 STEP 1: Fetching OrderLink data...')
    
    const orderLinkResponse = await axios.get(`${BASE_URL}/api/order-links/054e1fd345e5b1ca6c70d17b9efc333cf12d3f5829013d735475b413f3b1759e`)
    const { orderLink } = orderLinkResponse.data
    const order = orderLink.Order
    
    console.log('✅ Order:', order.orderNumber, '(ID:', order.id, ')')
    console.log('✅ Products:', order.OrderProducts?.length || 0)
    
    if (!order.OrderProducts || order.OrderProducts.length === 0) {
      throw new Error('No products found in order')
    }

    // Display products with materials
    order.OrderProducts.forEach((orderProduct, index) => {
      console.log(`   ${index + 1}. OrderProduct ID: ${orderProduct.id}`)
      console.log(`      Product: ${orderProduct.Product.name} (ID: ${orderProduct.Product.id})`)
      console.log(`      Material: ${orderProduct.Product.Material?.name || 'No material'} (ID: ${orderProduct.Product.Material?.id || 'N/A'})`)
      console.log(`      Quantity: ${orderProduct.qty} pcs`)
    })

    // **STEP 2**: Check current progress before submission
    console.log('\n📊 STEP 2: Checking current progress...')
    
    // Check individual progress reports
    const existingIndividualReports = await ProgressReport.findAll({
      where: { 
        orderId: order.id,
        reportType: 'individual'
      },
      include: [
        { model: Product, attributes: ['id', 'name'] },
        { model: OrderProduct, attributes: ['id', 'qty'] }
      ]
    })
    
    console.log('✅ Existing individual progress reports:', existingIndividualReports.length)
    
    // Calculate current progress
    const totalExistingProgress = await ProgressReport.sum('pcsFinished', {
      where: { orderId: order.id }
    }) || 0
    
    const targetPcs = order.OrderProducts.reduce((sum, op) => sum + op.qty, 0)
    const remainingPcs = targetPcs - totalExistingProgress
    
    console.log('✅ Total target pieces:', targetPcs)
    console.log('✅ Current progress:', totalExistingProgress + '/' + targetPcs, '(' + remainingPcs, 'remaining)')

    if (remainingPcs <= 0) {
      console.log('⚠️ Order is already completed. Testing with fabric-only submission...')
    }

    // **STEP 3**: Prepare individual product progress data
    console.log('\n📤 STEP 3: Preparing individual product progress submission...')
    
    const productProgressData = order.OrderProducts.map((orderProduct, index) => {
      const hasRemaining = remainingPcs > 0
      const pcsToSubmit = 0 // Force fabric-only submission for individual tracking test
      const fabricToUse = (index + 1) * 1.5 // Different fabric amounts per product: 1.5, 3.0, 4.5
      
      return {
        orderProductId: orderProduct.id,
        productId: orderProduct.Product.id,
        pcsFinished: pcsToSubmit,
        fabricUsed: fabricToUse,
        qualityScore: 95 + index,
        qualityNotes: `Individual fabric tracking for ${orderProduct.Product.name}`,
        workHours: 2.5 + (index * 0.5)
      }
    })

    console.log('🧪 TEST SCENARIO: Individual FABRIC-ONLY progress per product')
    console.log('🧪 Prepared progress data:')
    productProgressData.forEach((product, index) => {
      console.log(`   Product ${index + 1}: ${product.pcsFinished} pcs, ${product.fabricUsed} fabric units, quality: ${product.qualityScore}%`)
    })

    const totalPieces = productProgressData.reduce((sum, p) => sum + p.pcsFinished, 0)
    const totalFabric = productProgressData.reduce((sum, p) => sum + p.fabricUsed, 0)
    console.log(`🧪 Total pieces in submission: ${totalPieces}`)
    console.log(`🧪 Total fabric usage: ${totalFabric}`)
    console.log('🧪 NOTE: Fabric-only submission to test individual MaterialMovement creation')

    // **STEP 4**: Submit individual progress
    console.log('\n📤 STEP 4: Submitting individual progress...')
    
    const progressData = {
      progressType: 'per-product',
      productProgressData: productProgressData,
      tailorName: 'Test Individual Tailor',
      overallNote: 'Individual fabric tracking test - per product MaterialMovement creation',
      overallPhoto: 'https://example.com/test-fabric-photo.jpg'
    }

    const progressResponse = await axios.post(
      `${BASE_URL}/api/order-links/054e1fd345e5b1ca6c70d17b9efc333cf12d3f5829013d735475b413f3b1759e/progress`,
      progressData
    )

    console.log('✅ STEP 4: Individual progress submission successful!')
    
    const response = progressResponse.data
    console.log('📋 Response analysis:')
    console.log('   Message:', response.message)
    console.log('   Individual Progress Reports:', response.individualProgressReports?.length || 0)
    console.log('   Product Reports Created:', response.productReports?.length || 0)
    console.log('   Fabric Movements Created:', response.fabricMovements?.length || 0)
    console.log('   Total Fabric Used:', response.totalFabricUsed || 0)
    console.log('   Individual Tracking Enabled:', response.individualTrackingEnabled)
    console.log('   Total Individual Reports:', response.totalIndividualReports)

    // **STEP 5**: Verify individual progress reports in database
    console.log('\n🔍 STEP 5: Verifying individual progress reports...')
    
    const newIndividualReports = await ProgressReport.findAll({
      where: { 
        orderId: order.id,
        reportType: 'individual'
      },
      include: [
        { model: Product, attributes: ['id', 'name'] },
        { model: OrderProduct, attributes: ['id', 'qty'] }
      ],
      order: [['reportedAt', 'DESC']]
    })
    
    console.log('✅ Individual progress reports found:', newIndividualReports.length)
    
    const latestReports = newIndividualReports.slice(0, productProgressData.length)
    latestReports.forEach((report, index) => {
      console.log(`   Report ${index + 1}:`)
      console.log(`     ID: ${report.id}`)
      console.log(`     Product: ${report.Product?.name || 'Unknown'} (ID: ${report.productId})`)
      console.log(`     OrderProduct ID: ${report.orderProductId}`)
      console.log(`     Pieces Finished: ${report.pcsFinished}`)
      console.log(`     Report Type: ${report.reportType}`)
      console.log(`     Reported At: ${report.reportedAt}`)
    })

    // **STEP 6**: Verify MaterialMovement records
    console.log('\n🔍 STEP 6: Verifying MaterialMovement records...')
    
    const latestMovements = await MaterialMovement.findAll({
      where: {
        orderId: order.id,
        movementType: 'KELUAR',
        movementSource: 'order'
      },
      include: [
        { model: Material, attributes: ['id', 'name', 'code'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: productProgressData.length
    })
    
    console.log('✅ MaterialMovement records found:', latestMovements.length)
    
    latestMovements.forEach((movement, index) => {
      console.log(`   Movement ${index + 1}:`)
      console.log(`     ID: ${movement.id}`)
      console.log(`     Material: ${movement.Material?.name || 'Unknown'} (ID: ${movement.materialId})`)
      console.log(`     Quantity: ${movement.qty}`)
      console.log(`     Type: ${movement.movementType}`)
      console.log(`     Reference: ${movement.referenceNumber}`)
      console.log(`     Description: ${movement.description}`)
      console.log(`     Notes: ${movement.notes}`)
    })

    // **STEP 7**: Verify individual progress report references in movements
    console.log('\n🔍 STEP 7: Verifying individual progress report references...')
    
    let referencesValid = 0
    const individualReportIds = latestReports.map(r => r.id)
    
    latestMovements.forEach(movement => {
      const refNumber = movement.referenceNumber
      if (refNumber && refNumber.startsWith('PROG-')) {
        const reportId = parseInt(refNumber.replace('PROG-', ''))
        if (individualReportIds.includes(reportId)) {
          referencesValid++
          console.log(`✅ Movement ${movement.id} correctly references individual progress report ${reportId}`)
        }
      }
    })
    
    console.log(`✅ Valid references: ${referencesValid}/${latestMovements.length}`)

    // **STEP 8**: Verify ProductProgressReport records
    console.log('\n🔍 STEP 8: Verifying ProductProgressReport records...')
    
    // Get ProductProgressReports for the latest individual reports
    const productProgressReports = []
    for (const reportId of individualReportIds) {
      const reports = await ProductProgressReport.findAll({
        where: { progressReportId: reportId },
        include: [{ model: Product, attributes: ['id', 'name'] }]
      })
      productProgressReports.push(...reports)
    }
    
    console.log('✅ ProductProgressReport records found:', productProgressReports.length)
    
    productProgressReports.forEach((ppr, index) => {
      console.log(`   ProductProgressReport ${index + 1}:`)
      console.log(`     ID: ${ppr.id}`)
      console.log(`     Progress Report ID: ${ppr.progressReportId}`)
      console.log(`     Product: ${ppr.Product?.name || 'Unknown'} (ID: ${ppr.productId})`)
      console.log(`     Pieces Finished: ${ppr.pcsFinished}`)
      console.log(`     Fabric Used: ${ppr.fabricUsed}`)
      console.log(`     Quality Score: ${ppr.qualityScore}%`)
    })

    // **STEP 9**: Database verification summary
    console.log('\n🔍 STEP 9: Database verification summary')
    console.log('📋 What was verified:')
    console.log(`   1. Individual progress_reports: ${latestReports.length} records with reportType='individual'`)
    console.log(`   2. ProductProgressReport linking: ${productProgressReports.length} records linked to individual reports`)
    console.log(`   3. MaterialMovement creation: ${latestMovements.length} records with proper individual references`)
    console.log(`   4. Individual report references: ${referencesValid} valid PROG-{individualReportId} references`)
    console.log(`   5. Per-product data: Each product has individual orderId, productId, orderProductId`)

    // **STEP 10**: Test criteria evaluation
    console.log('\n🎯 STEP 10: Test criteria evaluation')
    
    const testCriteria = {
      individualProgressSubmission: response.success === true,
      individualReportsCreated: latestReports.length === productProgressData.length,
      materialMovementsCreated: latestMovements.length > 0,
      totalFabricCorrect: Math.abs(response.totalFabricUsed - totalFabric) < 0.01,
      individualTrackingEnabled: response.individualTrackingEnabled === true,
      individualReferences: referencesValid === latestMovements.length,
      perProductData: latestReports.every(r => r.productId && r.orderProductId && r.orderId),
      reportTypeCorrect: latestReports.every(r => r.reportType === 'individual')
    }
    
    console.log('📊 Test Results:')
    Object.entries(testCriteria).forEach(([criterion, passed]) => {
      console.log(`   ${passed ? '✅' : '❌'} ${criterion}: ${passed ? 'PASSED' : 'FAILED'}`)
    })
    
    const allPassed = Object.values(testCriteria).every(Boolean)
    
    console.log('\n🎯 INDIVIDUAL PROGRESS REPORTS TEST SUMMARY:')
    console.log(`   Individual Progress Reports Created: ${latestReports.length}`)
    console.log(`   MaterialMovement Records: ${latestMovements.length}`)
    console.log(`   Total Fabric Tracked: ${response.totalFabricUsed} units`)
    console.log(`   Individual Tracking: ${response.individualTrackingEnabled ? 'ENABLED' : 'DISABLED'}`)
    console.log(`   Per-Product orderId: ${latestReports.every(r => r.orderId === order.id) ? 'CONFIRMED' : 'MISSING'}`)
    
    console.log('\n🏆 OVERALL RESULT:', allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED')
    
    if (allPassed) {
      console.log('🎉 Individual progress reports per product working correctly!')
      console.log('🎉 Every product creates individual progress_reports record with orderId!')
      console.log('🎉 Every product creates individual MaterialMovement records!')
      console.log('🎉 Complete audit trail maintained with individual tracking!')
    } else {
      console.log('❌ Individual progress reports implementation needs attention.')
    }

  } catch (error) {
    if (error.response) {
      console.log('\n❌ Individual progress submission failed:')
      console.log('Error:', error.response.data?.message || error.response.statusText)
      console.log('Response:', JSON.stringify(error.response.data, null, 2))
    } else {
      console.log('\n❌ TEST FAILED WITH ERROR:')
      console.log('Error:', error.message)
      console.log('Stack:', error.stack)
    }
  } finally {
    console.log('\n🧪 Individual progress reports test completed')
  }
}

// Execute test if run directly
if (require.main === module) {
  testIndividualProgressReports()
    .catch(console.error)
    .finally(() => process.exit())
}

module.exports = { testIndividualProgressReports } 