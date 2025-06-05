'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import ProductProgressCard from '@/app/components/ProductProgressCard';

export default function TailorProgressForm({ params }) {
  const router = useRouter();
  const resolvedParams = use(params); // Unwrap params Promise for Next.js 15+
  const { id } = resolvedParams; // This is the token
  const [orderLink, setOrderLink] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // NEW: Per-product progress state
  const [productProgressData, setProductProgressData] = useState({});
  const [overallNote, setOverallNote] = useState('');
  const [overallPhoto, setOverallPhoto] = useState('');
  const [tailorName, setTailorName] = useState('');
  const [progressType, setProgressType] = useState('per-product'); // Changed from 'legacy'
  const [validationErrors, setValidationErrors] = useState({});

  // NEW: Per-product completion state
  const [completionSummary, setCompletionSummary] = useState(null);
  const [incompleteProducts, setIncompleteProducts] = useState([]);
  const [showCompletedProducts, setShowCompletedProducts] = useState(false);

  // Material tracking state (enhanced for per-product)
  const [productMaterials, setProductMaterials] = useState([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [materialMovementTickets, setMaterialMovementTickets] = useState([]);
  const [showMovementTickets, setShowMovementTickets] = useState(false);
  const [materialInventory, setMaterialInventory] = useState({});

  // Tailor assignment state
  const [isTailorFieldEditable, setIsTailorFieldEditable] = useState(true);
  const [tailorAssignmentSource, setTailorAssignmentSource] = useState('manual');

  // Simple form reset function
  const resetFormCompletely = async () => {
    setError('');
    setSuccess('');
    setValidationErrors({});
    setSubmitting(false);
    await fetchOrderDetails();
  };

  // Fetch order details using token
  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/order-links/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });

      if (!response.ok) {
        // Enhanced error handling for non-JSON responses
        let errorMessage;
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
          errorMessage = data.message || 'Failed to fetch order details';
        } else {
          // Handle HTML error responses (like 500 Internal Server Error)
          const textResponse = await response.text();
          console.error('Non-JSON response received:', textResponse);
          errorMessage = `Server error (${response.status}): Please try again`;
        }
        
        if (response.status === 404) {
          throw new Error('Order link not found or inactive');
        }
        if (response.status === 400) {
          throw new Error('Order link has expired');
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setOrderLink(data.orderLink);
      
      // NEW: Set completion data from enhanced API response
      if (data.completionSummary) {
        setCompletionSummary(data.completionSummary);
      }
      
      if (data.incompleteProducts) {
        setIncompleteProducts(data.incompleteProducts);
      }
      
      // Initialize per-product progress data
      if (data.orderLink?.Order?.OrderProducts) {
        const initialProgressData = {};
        data.orderLink.Order.OrderProducts.forEach(orderProduct => {
          const product = orderProduct.Product;
          if (product) {
            initialProgressData[product.id] = {
              productId: product.id,
              orderProductId: orderProduct.id, // Now we have the correct OrderProduct ID
              pcsFinished: 0,
              fabricUsed: 0,
              workHours: 0,
              qualityScore: 100,
              qualityNotes: '',
              challenges: '',
              estimatedCompletion: '',
              photos: []
            };
          }
        });
        setProductProgressData(initialProgressData);
      }
    } catch (err) {
      setError(err.message);
      console.error('Error fetching order details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderDetails();
  }, [id]);

  // Fetch product materials when order is loaded
  useEffect(() => {
    if (orderLink?.Order?.OrderProducts) {
      fetchProductMaterials();
    }
  }, [orderLink]);

  // Enhanced tailor name synchronization with three-tier priority
  useEffect(() => {
    let tailorName = '';
    let isEditable = true;
    let source = 'manual';
    
    // Priority 1: Order assigned tailor contact (from orders-management with tailorContactId)
    if (orderLink?.Order?.TailorContact?.name) {
      tailorName = orderLink.Order.TailorContact.name;
      isEditable = false;
      source = 'order';
    }
    // Priority 2: Order assigned tailor (legacy User relationship)
    else if (orderLink?.Order?.Tailor?.name) {
      tailorName = orderLink.Order.Tailor.name;
      isEditable = false;
      source = 'order';
    }
    // Priority 3: OrderLink assigned user
    else if (orderLink?.User?.name) {
      tailorName = orderLink.User.name;
      isEditable = false;
      source = 'orderlink';
    }
    // Priority 4: No assignment - allow manual input
    else {
      tailorName = '';
      isEditable = true;
      source = 'manual';
    }
    
    setTailorName(tailorName);
    setIsTailorFieldEditable(isEditable);
    setTailorAssignmentSource(source);
  }, [orderLink]);

  // Fetch product material relationships
  const fetchProductMaterials = async () => {
    if (!orderLink?.Order?.OrderProducts || orderLink.Order.OrderProducts.length === 0) {
      setProductMaterials([]);
      return;
    }

    try {
      setLoadingMaterials(true);
      const orderProducts = orderLink.Order.OrderProducts;
      
      // Use material data already included in orderLink response
      const materialData = orderProducts.map((orderProduct) => {
        const product = orderProduct.Product;
        if (product?.Material) {
          const quantity = orderProduct.qty || 1;
          
          return {
            productId: product.id,
            productName: product.name,
            materialId: product.materialId,
            materialName: product.Material.name,
            materialCode: product.Material.code,
            materialUnit: product.Material.unit,
            quantity: quantity
          };
        } else {
          console.log(`Product ${product?.name || 'Unknown'} has no material linked`);
          return null;
        }
      }).filter(Boolean);
      
      setProductMaterials(materialData);
      console.log('Product materials loaded from orderLink:', materialData);
    } catch (error) {
      console.error('Error loading product materials:', error);
      setProductMaterials([]);
    } finally {
      setLoadingMaterials(false);
    }
  };

  // Handle product progress changes from ProductProgressCard
  const handleProductProgressChange = (productId, orderProductId, progressData) => {
    setProductProgressData(prev => ({
      ...prev,
      [productId]: {
        ...progressData,
        productId,
        orderProductId
      }
    }));
    
    // Clear validation errors for this product
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      Object.keys(newErrors).forEach(key => {
        if (key.startsWith(`product_${productId}_`)) {
          delete newErrors[key];
        }
      });
      return newErrors;
    });
  };

  // Handle photo upload from ProductProgressCard
  const handleProductPhotoUpload = (productId, photos) => {
    console.log(`Photos uploaded for product ${productId}:`, photos);
    // Photos are already handled in the ProductProgressCard state
  };

  // Calculate total completed pieces from per-product data
  const getTotalCompleted = () => {
    if (!orderLink?.Order?.ProgressReports) return 0;
    return orderLink.Order.ProgressReports.reduce((total, report) => total + report.pcsFinished, 0);
  };

  // Calculate total pieces from current per-product progress
  const getCurrentTotalPieces = () => {
    return Object.values(productProgressData).reduce((total, progress) => total + (progress.pcsFinished || 0), 0);
  };

  // Validate per-product progress data
  const validateProgressData = () => {
    const errors = {};
    let hasProgress = false;
    
    // Check if tailor name is provided
    if (!tailorName || tailorName.trim() === '') {
      errors.tailorName = 'Please enter your name';
      return { isValid: false, errors };
    }

    // Validate each product's progress
    Object.values(productProgressData).forEach(progress => {
      if (progress.pcsFinished > 0) {
        hasProgress = true;
        
        // Validate pieces finished doesn't exceed target
        const orderProduct = orderLink.Order.OrderProducts.find(op => op.Product.id === progress.productId);
        const targetQty = orderProduct?.qty || 0;
        
        if (progress.pcsFinished > targetQty) {
          errors[`product_${progress.productId}_pcs`] = `Cannot exceed ${targetQty} pieces`;
        }
      }
    });

    if (!hasProgress) {
      errors.general = 'Please enter progress for at least one product';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  };

  // Submit per-product progress report
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');
    setValidationErrors({});

    try {
      // Validate progress data
      const validation = validateProgressData();
      if (!validation.isValid) {
        setValidationErrors(validation.errors);
        throw new Error(validation.errors.general || 'Please fix the validation errors');
      }

      // 🔍 ENHANCED DEBUG: Multi-product submission analysis
      console.log('🔍 =============================================');
      console.log('🔍 FRONTEND MULTI-PRODUCT SUBMISSION DEBUG');
      console.log('🔍 =============================================');
      console.log('🔍 Total products in order:', Object.keys(productProgressData).length);
      console.log('🔍 Products with progress data:');
      
      let productsWithFabric = 0;
      let totalFabricPlanned = 0;
      
      Object.values(productProgressData).forEach((progress, index) => {
        const hasProgress = progress.pcsFinished > 0;
        const hasFabric = progress.fabricUsed > 0;
        
        if (hasFabric) {
          productsWithFabric++;
          totalFabricPlanned += parseFloat(progress.fabricUsed || 0);
        }
        
        console.log(`🔍   Product ${index + 1}:`, {
          productId: progress.productId,
          orderProductId: progress.orderProductId,
          pcsFinished: progress.pcsFinished,
          fabricUsed: progress.fabricUsed,
          hasProgress: hasProgress,
          hasFabric: hasFabric,
          willCreateMovement: hasProgress && hasFabric
        });
      });
      
      console.log('🔍 Summary:');
      console.log(`🔍   Products with fabric usage: ${productsWithFabric}`);
      console.log(`🔍   Total fabric planned: ${totalFabricPlanned}`);
      console.log(`🔍   Expected MaterialMovement records: ${productsWithFabric}`);

      // Prepare per-product progress data for API
      const apiProductProgressData = Object.values(productProgressData)
        .filter(progress => progress.pcsFinished > 0)
        .map(progress => {
          const mappedProgress = {
            productId: progress.productId,
            orderProductId: progress.orderProductId,
            pcsFinished: parseInt(progress.pcsFinished),
            pcsTargetForThisReport: parseInt(progress.pcsFinished),
            fabricUsed: parseFloat(progress.fabricUsed || 0),
            workHours: parseFloat(progress.workHours || 0),
            qualityScore: parseInt(progress.qualityScore || 100),
            qualityNotes: progress.qualityNotes || null,
            challenges: progress.challenges || null,
            estimatedCompletion: progress.estimatedCompletion ? new Date(progress.estimatedCompletion).toISOString() : null,
            photos: progress.photos.map(photo => ({
              url: photo.url,
              thumbnailUrl: photo.thumbnailUrl || null,
              caption: photo.caption || null,
              type: photo.type || 'progress',
              originalFileName: photo.file?.name || null,
              fileSize: photo.file?.size || null,
              mimeType: photo.file?.type || null
            }))
          };

          // Debug: Validate each product data
          console.log('🔍 Frontend mapping product:', progress.productId, {
            originalPcsFinished: progress.pcsFinished,
            parsedPcsFinished: parseInt(progress.pcsFinished),
            originalFabricUsed: progress.fabricUsed,
            parsedFabricUsed: parseFloat(progress.fabricUsed || 0),
            isValid: !isNaN(parseInt(progress.pcsFinished)) && parseInt(progress.pcsFinished) > 0,
            willCreateMovement: parseFloat(progress.fabricUsed || 0) > 0,
            mappedProgress
          });

          return mappedProgress;
        });

      console.log('🔍 Frontend prepared API data:', {
        totalProducts: Object.keys(productProgressData).length,
        productsWithProgress: apiProductProgressData.length,
        productsWithFabric: apiProductProgressData.filter(p => p.fabricUsed > 0).length,
        apiProductProgressData
      });

      if (apiProductProgressData.length === 0) {
        throw new Error('Please enter progress for at least one product');
      }

      // Calculate if this will complete the order
      const currentProgress = getTotalCompleted();
      const newProgress = getCurrentTotalPieces();
      const totalProgress = currentProgress + newProgress;
      const isCompletingOrder = totalProgress >= orderLink.Order.targetPcs;

      console.log('🔍 Submitting per-product progress:', {
        progressType: 'per-product',
        productCount: apiProductProgressData.length,
        fabricUsageCount: apiProductProgressData.filter(p => p.fabricUsed > 0).length,
        totalFabricUsage: apiProductProgressData.reduce((sum, p) => sum + p.fabricUsed, 0),
        overallNote,
        tailorName,
        isCompletingOrder
      });

      const response = await fetch(`/api/order-links/${id}/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        body: JSON.stringify({
          progressType: 'per-product',
          productProgressData: apiProductProgressData,
          overallNote: overallNote || 'Per-product progress update',
          overallPhoto: overallPhoto || null,
          tailorName: tailorName,
          isCompletingOrder: isCompletingOrder
        })
      });

      // Enhanced error handling for non-JSON responses
      if (!response.ok) {
        let errorMessage;
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || `Server error (${response.status})`;
          } catch (jsonError) {
            console.error('Failed to parse error response as JSON:', jsonError);
            errorMessage = `Server error (${response.status}): Unable to parse error response`;
          }
        } else {
          // Handle HTML error responses (like 500 Internal Server Error)
          const textResponse = await response.text();
          console.error('Non-JSON error response received:', textResponse);
          errorMessage = `Server error (${response.status}): Please refresh the page and try again`;
        }
        
        throw new Error(errorMessage);
      }

      // Parse JSON response with error handling
      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error('Failed to parse success response as JSON:', jsonError);
        throw new Error('Server returned invalid response format. Please try again.');
      }

      // 🔍 ENHANCED DEBUG: Backend response analysis
      console.log('🔍 =============================================');
      console.log('🔍 BACKEND RESPONSE ANALYSIS');
      console.log('🔍 =============================================');
      console.log('🔍 Success response received:', data);
      console.log('🔍 Material movements created:', data.fabricMovements?.length || 0);
      console.log('🔍 Total fabric processed:', data.totalFabricUsed || 0);
      
      if (data.fabricMovements && data.fabricMovements.length > 0) {
        console.log('🔍 MaterialMovement details:');
        data.fabricMovements.forEach((movement, index) => {
          console.log(`🔍   Movement ${index + 1}:`, {
            id: movement.id,
            materialId: movement.materialId,
            materialName: movement.materialName,
            qty: movement.qty,
            description: movement.description,
            movementType: movement.movementType
          });
        });
      }

      setSuccess(data.message || 'Per-product progress report submitted successfully!');
      
      // Handle material movement tickets if created
      if (data.fabricMovements && data.fabricMovements.length > 0) {
        setMaterialMovementTickets(data.fabricMovements);
        setShowMovementTickets(true);
        
        const totalFabricUsed = data.totalFabricUsed || 0;
        if (totalFabricUsed > 0) {
          setSuccess(prev => `${prev}\n✅ Fabric usage recorded: ${totalFabricUsed} total units`);
          setSuccess(prev => `${prev}\n✅ MaterialMovement records created: ${data.fabricMovements.length}`);
        }
      }

      // Reset form but preserve assigned tailor name
      const resetProgressData = {};
      Object.keys(productProgressData).forEach(productId => {
        resetProgressData[productId] = {
          ...productProgressData[productId],
          pcsFinished: 0,
          fabricUsed: 0,
          workHours: 0,
          qualityScore: 100,
          qualityNotes: '',
          challenges: '',
          estimatedCompletion: '',
          photos: []
        };
      });
      
      setProductProgressData(resetProgressData);
      setOverallNote('');
      setOverallPhoto('');

      // Refresh order details to show updated progress
      setTimeout(() => {
        fetchOrderDetails();
        setSuccess('');
        setShowMovementTickets(false);
        setMaterialMovementTickets([]);
      }, 5000);

    } catch (err) {
      console.error('🔍 FRONTEND ERROR:', err);
      setError(err.message);
      console.error('Error submitting per-product progress:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate progress percentage based on actual progress reports
  const calculateProgress = (order) => {
    if (!order || !order.targetPcs || order.targetPcs === 0) return 0;
    const totalCompleted = getTotalCompleted();
    return Math.round((totalCompleted / order.targetPcs) * 100);
  };

  // Get progress color
  const getProgressColor = (percentage) => {
    if (percentage < 30) return 'bg-red-500';
    if (percentage < 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  // NEW: Per-product completion helper functions
  const getProductCompletion = (orderProduct) => {
    if (!completionSummary?.products) return null;
    
    const productCompletion = completionSummary.products.find(
      p => p.orderProductId === orderProduct.id
    );
    
    if (productCompletion) {
      return {
        completed: productCompletion.completedQty,
        target: productCompletion.qty,
        percentage: productCompletion.completionPercentage,
        isComplete: productCompletion.isCompleted,
        completionDate: productCompletion.completionDate,
        remaining: productCompletion.remainingQty
      };
    }
    
    return {
      completed: 0,
      target: orderProduct.qty,
      percentage: 0,
      isComplete: false,
      completionDate: null,
      remaining: orderProduct.qty
    };
  };

  const isProductComplete = (orderProduct) => {
    const completion = getProductCompletion(orderProduct);
    return completion?.isComplete || false;
  };

  const getCompletedProducts = () => {
    if (!orderLink?.Order?.OrderProducts) return [];
    return orderLink.Order.OrderProducts.filter(op => isProductComplete(op));
  };

  const getIncompleteProducts = () => {
    if (!orderLink?.Order?.OrderProducts) return [];
    return orderLink.Order.OrderProducts.filter(op => !isProductComplete(op));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error && !orderLink) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-6">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Link Invalid</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">Please check the link and try again</p>
        </div>
      </div>
    );
  }

  const order = orderLink?.Order;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-xl font-bold text-gray-900 text-center">Per-Product Progress Update</h1>
          <p className="text-sm text-gray-600 text-center mt-2">
            Submit progress for each product in Order #{order?.orderNumber}
          </p>
          {orderLink?.Order?.TailorContact?.name && (
            <p className="text-xs text-blue-600 text-center mt-1">
              Order assigned to: {orderLink.Order.TailorContact.name}
              {orderLink.Order.TailorContact.company && ` (${orderLink.Order.TailorContact.company})`}
            </p>
          )}
          {!orderLink?.Order?.TailorContact?.name && orderLink?.Order?.Tailor?.name && (
            <p className="text-xs text-blue-600 text-center mt-1">
              Order assigned to: {orderLink.Order.Tailor.name}
            </p>
          )}
          {!orderLink?.Order?.TailorContact?.name && !orderLink?.Order?.Tailor?.name && orderLink?.User?.name && (
            <p className="text-xs text-green-600 text-center mt-1">
              OrderLink assigned to: {orderLink.User.name}
            </p>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Order Summary Card */}
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Order Number:</span>
              <span className="text-sm font-medium text-gray-900">{order?.orderNumber}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Status:</span>
              <span className={`text-sm font-medium px-2 py-1 rounded-full ${
                order?.status === 'completed' ? 'bg-green-100 text-green-800' :
                order?.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                order?.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {order?.status}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Due Date:</span>
              <span className="text-sm font-medium text-gray-900">
                {order?.dueDate ? new Date(order.dueDate).toLocaleDateString() : 'Not set'}
              </span>
            </div>
          </div>

          {order?.description && (
            <div className="mt-4">
              <span className="text-sm text-gray-600">Description:</span>
              <p className="text-sm text-gray-900 mt-1">{order.description}</p>
            </div>
          )}
        </div>

        {/* Overall Progress Overview */}
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Overall Progress</h3>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Completed:</span>
              <span className="text-lg font-bold text-gray-900">{getTotalCompleted()} / {order?.targetPcs} pcs</span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className={`h-3 rounded-full transition-all duration-500 ${getProgressColor(calculateProgress(order))}`}
                style={{ width: `${calculateProgress(order)}%` }}
              ></div>
            </div>
            
            <div className="text-center">
              <span className={`text-sm font-medium ${
                calculateProgress(order) === 100 
                  ? 'text-green-700 font-bold' 
                  : 'text-gray-700'
              }`}>
                {calculateProgress(order)}% Complete
                {calculateProgress(order) === 100 && (
                  <span className="ml-2">🎉</span>
                )}
              </span>
            </div>
            
            <div className="text-center">
              <span className="text-sm text-gray-600">
                Remaining: {Math.max(0, order?.targetPcs - getTotalCompleted())} pieces
              </span>
            </div>
          </div>
        </div>

        {/* Previous Progress Reports */}
        {orderLink?.Order?.ProgressReports && orderLink.Order.ProgressReports.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Previous Progress Reports</h3>
            
            <div className="space-y-3">
              {orderLink.Order.ProgressReports.slice(-3).reverse().map((report, index) => (
                <div key={report.id} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-medium text-gray-900">
                      {report.pcsFinished} pieces completed
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(report.reportedAt).toLocaleDateString()}
                    </span>
                  </div>
                  {report.note && (
                    <p className="text-sm text-gray-600 mb-1">{report.note}</p>
                  )}
                  <p className="text-xs text-blue-600">
                    By: {report.User?.name || report.tailorName || 'Anonymous'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Per-Product Progress Forms */}
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Per-Product Progress Update
            {order?.OrderProducts && (
              <span className="text-sm font-normal text-gray-500 ml-2">
                ({order.OrderProducts.length} products)
              </span>
            )}
          </h3>

          {/* Global Error Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex justify-between items-start">
                <div className="flex-1">
              <p className="text-sm text-red-600">{error}</p>
                  {error.includes('JSON') && (
                    <p className="text-xs text-red-500 mt-1">
                      💡 Tip: This might be a caching issue. Try the reset button.
                    </p>
                  )}
                </div>
                {error.includes('JSON') || error.includes('Server error') && (
                  <button
                    type="button"
                    onClick={resetFormCompletely}
                    disabled={loading}
                    className="ml-3 text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded border border-red-300 disabled:opacity-50"
                  >
                    🔧 Reset Form
                  </button>
                )}
              </div>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-600 whitespace-pre-line">{success}</p>
            </div>
          )}

          {validationErrors.general && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-600">{validationErrors.general}</p>
            </div>
          )}

          {/* Material Movement Tickets Display */}
          {showMovementTickets && materialMovementTickets.length > 0 && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-blue-900">Material Movement Tickets Created</h4>
                <button
                  type="button"
                  onClick={() => setShowMovementTickets(false)}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Hide
                </button>
              </div>
              
              <div className="space-y-2">
                {materialMovementTickets.map((movement, index) => (
                  <div key={movement.id || index} className="bg-white border border-blue-200 rounded p-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-900">
                        {movement.materialName || 'Material'} - {movement.qty} units
                      </span>
                      <span className="text-xs text-blue-600">KELUAR</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{movement.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Tailor Name Field */}
            <div>
              <label htmlFor="tailorName" className="block text-sm font-medium text-gray-700 mb-1">
                Tailor Name *
                {tailorAssignmentSource === 'order' && (
                  <span className="ml-2 text-xs text-blue-600 font-normal">(Assigned to Order)</span>
                )}
                {tailorAssignmentSource === 'orderlink' && (
                  <span className="ml-2 text-xs text-green-600 font-normal">(OrderLink Assigned)</span>
                )}
                {tailorAssignmentSource === 'manual' && (
                  <span className="ml-2 text-xs text-gray-600 font-normal">(Manual Entry)</span>
                )}
              </label>
              <input
                type="text"
                id="tailorName"
                name="tailorName"
                value={tailorName}
                onChange={(e) => setTailorName(e.target.value)}
                disabled={!isTailorFieldEditable}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none ${
                  isTailorFieldEditable 
                    ? 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white' 
                    : 'border-gray-200 bg-gray-50 text-gray-600 cursor-not-allowed'
                } ${validationErrors.tailorName ? 'border-red-300' : ''}`}
                placeholder={isTailorFieldEditable ? "Enter your name" : ""}
                required
              />
              {validationErrors.tailorName && (
                <p className="text-xs text-red-600 mt-1">{validationErrors.tailorName}</p>
              )}
              {tailorAssignmentSource === 'order' && (
                <p className="text-xs text-blue-600 mt-1">
                  ✓ This order is assigned to {orderLink?.Order?.TailorContact?.name || orderLink?.Order?.Tailor?.name}. Name cannot be changed.
                </p>
              )}
            </div>

            {/* Per-Product Progress Cards */}
            <div className="space-y-6">
              <h4 className="text-md font-medium text-gray-900">Product Progress</h4>
              
              {/* NEW: Completed Products Summary */}
              {getCompletedProducts().length > 0 && (
                <div className="bg-green-50 rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="text-green-800 font-medium">
                      ✅ Completed Products ({getCompletedProducts().length})
                    </h5>
                    <button
                      type="button"
                      onClick={() => setShowCompletedProducts(!showCompletedProducts)}
                      className="text-sm text-green-600 hover:text-green-800"
                    >
                      {showCompletedProducts ? 'Hide' : 'Show'} Details
                    </button>
                  </div>
                  
                  {showCompletedProducts && (
                    <div className="space-y-2">
                      {getCompletedProducts().map(orderProduct => {
                        const product = orderProduct.Product;
                        const completion = getProductCompletion(orderProduct);
                        return (
                          <div key={orderProduct.id} className="bg-white border border-green-200 rounded p-3">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-gray-900">
                                {product.name}
                              </span>
                              <span className="text-xs text-green-600 font-medium">
                                {completion.completed}/{completion.target} pieces (100%)
                              </span>
                            </div>
                            {completion.completionDate && (
                              <p className="text-xs text-gray-600 mt-1">
                                Completed: {new Date(completion.completionDate).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* NEW: Completion Summary */}
              {completionSummary && (
                <div className="bg-blue-50 rounded-lg p-4 mb-6">
                  <h5 className="text-blue-800 font-medium mb-2">Order Progress Summary</h5>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-blue-600">Total Products:</span>
                      <div className="font-medium">{completionSummary.totalProducts}</div>
                    </div>
                    <div>
                      <span className="text-blue-600">Completed:</span>
                      <div className="font-medium text-green-600">{completionSummary.completedProducts}</div>
                    </div>
                    <div>
                      <span className="text-blue-600">Total Pieces:</span>
                      <div className="font-medium">{completionSummary.completedPieces}/{completionSummary.totalPieces}</div>
                    </div>
                    <div>
                      <span className="text-blue-600">Progress:</span>
                      <div className="font-medium">{completionSummary.orderCompletionPercentage}%</div>
                    </div>
                  </div>
                </div>
              )}
              
              {order?.OrderProducts && order.OrderProducts.length > 0 ? (
                // NEW: Only show incomplete products by default
                getIncompleteProducts().length > 0 ? (
                  getIncompleteProducts().map((orderProduct, index) => {
                    const product = orderProduct.Product;
                    if (!product) return null;
                    
                    const completion = getProductCompletion(orderProduct);
                    
                    return (
                      <div key={product.id} className="relative">
                        {/* NEW: Product completion indicator */}
                        {completion && completion.completed > 0 && (
                          <div className="mb-2 text-sm text-blue-600">
                            Progress: {completion.completed}/{completion.target} pieces ({completion.percentage}%)
                            {completion.remaining > 0 && (
                              <span className="text-gray-600"> - {completion.remaining} remaining</span>
                            )}
                          </div>
                        )}
                        
                        <ProductProgressCard
                          key={product.id}
                          product={product}
                          orderProduct={orderProduct}
                          productProgress={productProgressData[product.id]}
                          onProgressChange={handleProductProgressChange}
                          onPhotoUpload={handleProductPhotoUpload}
                          isSubmitting={submitting}
                          errors={validationErrors}
                          completion={completion} // NEW: Pass completion data
                        />
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-green-600 bg-green-50 rounded-lg">
                    🎉 All products in this order have been completed!
                  </div>
                )
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No products found in this order.
                </div>
              )}
            </div>

            {/* Overall Notes */}
            <div>
              <label htmlFor="overallNote" className="block text-sm font-medium text-gray-700 mb-1">
                Overall Notes (Optional)
              </label>
              <textarea
                id="overallNote"
                name="overallNote"
                rows="3"
                value={overallNote}
                onChange={(e) => setOverallNote(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Any overall notes about this progress update..."
                disabled={submitting}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || order?.status === 'completed' || getCurrentTotalPieces() === 0 || getIncompleteProducts().length === 0}
              className={`w-full py-3 px-4 text-white font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                submitting || order?.status === 'completed' || getCurrentTotalPieces() === 0 || getIncompleteProducts().length === 0
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {submitting ? 'Submitting Per-Product Progress...' : 
               order?.status === 'completed' ? 'Order Completed' :
               getIncompleteProducts().length === 0 ? 'All Products Completed' :
               getCurrentTotalPieces() === 0 ? 'Enter Progress for at Least One Product' :
               `Submit Progress for ${getCurrentTotalPieces()} Total Pieces`}
            </button>
            
            {getCurrentTotalPieces() > 0 && getIncompleteProducts().length > 0 && (
              <p className="text-center text-sm text-gray-600">
                Submitting progress for {Object.values(productProgressData).filter(p => p.pcsFinished > 0).length} products, 
                {getCurrentTotalPieces()} total pieces
              </p>
            )}
            
            {/* NEW: All products completed message */}
            {getIncompleteProducts().length === 0 && order?.OrderProducts?.length > 0 && (
              <div className="text-center py-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-800 font-medium">🎉 Congratulations!</p>
                  <p className="text-green-700 text-sm mt-1">
                    All products in this order have been completed. No further progress updates needed.
                  </p>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="text-center py-4">
          <p className="text-xs text-gray-500">
            Secure per-product progress update form for Order #{order?.orderNumber}
          </p>
        </div>
      </div>
    </div>
  );
} 