'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/app/components/DashboardLayout';
import AuthWrapper from '@/app/components/AuthWrapper';
import ordersManagementAPI from '@/app/services/OrdersManagementAPI';

export default function OrderManagementDetail({ params }) {
  const router = useRouter();
  const { id } = use(params);
  const [order, setOrder] = useState(null);
  const [progressReports, setProgressReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Progress Report Form State
  const [progressForm, setProgressForm] = useState({
    pcsFinished: 0,
    note: '',
    photoUrl: '',
    resiPengiriman: '',
    tailorName: '',
    isSubmitting: false,
    error: null,
    success: null,
  });

  // Fetch order details and progress reports
  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // Use orders-management API for enhanced data
      const orderData = await ordersManagementAPI.getOrderDetails(id);
      setOrder(orderData);

      // Fetch progress reports with enhanced data
      const token = localStorage.getItem('token');
      const progressResponse = await fetch(`/api/progress-reports?orderId=${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      });

      if (progressResponse.ok) {
        const progressData = await progressResponse.json();
        console.log('Enhanced progress reports loaded:', progressData);
        setProgressReports(progressData);
      } else {
        console.warn('Failed to fetch progress reports');
        setProgressReports([]);
      }

      // Pre-fill tailor name if assigned
      if (orderData.Tailor?.name) {
        setProgressForm(prev => ({
          ...prev,
          tailorName: orderData.Tailor.name
        }));
      }

    } catch (err) {
      setError('Error loading order details: ' + err.message);
      console.error('Error fetching order details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderDetails();
  }, [id]);

  // Handle progress form input changes
  const handleProgressInputChange = (e) => {
    const { name, value } = e.target;
    setProgressForm(prev => ({
      ...prev,
      [name]: value,
      error: null
    }));
  };

  // Handle photo upload
  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // For now, we'll just store the file name
      // In a real implementation, you'd upload to a file storage service
      setProgressForm(prev => ({
        ...prev,
        photoUrl: file.name,
        error: null
      }));
    }
  };

  // Calculate remaining pieces
  const getRemainingPcs = () => {
    if (!order) return 0;
    return Math.max(0, order.targetPcs - order.completedPcs);
  };

  // Handle progress form submission
  const handleProgressSubmit = async (e) => {
    e.preventDefault();
    setProgressForm(prev => ({ ...prev, isSubmitting: true, error: null, success: null }));

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Validate form
      if (!progressForm.pcsFinished || progressForm.pcsFinished <= 0) {
        throw new Error('Please enter a valid number of pieces finished');
      }

      if (progressForm.pcsFinished > getRemainingPcs()) {
        throw new Error(`Cannot exceed remaining pieces (${getRemainingPcs()})`);
      }

      if (!progressForm.tailorName.trim()) {
        throw new Error('Tailor name is required');
      }

      const response = await fetch('/api/progress-reports', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: parseInt(id),
          pcsFinished: parseInt(progressForm.pcsFinished),
          note: progressForm.note,
          photoUrl: progressForm.photoUrl,
          resiPengiriman: progressForm.resiPengiriman,
          tailorName: progressForm.tailorName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit progress report');
      }

      setProgressForm(prev => ({
        ...prev,
        success: 'Progress report submitted successfully!',
        pcsFinished: 0,
        note: '',
        photoUrl: '',
        resiPengiriman: ''
      }));

      // Refresh order details and progress reports
      fetchOrderDetails();

    } catch (err) {
      setProgressForm(prev => ({
        ...prev,
        error: err.message
      }));
    } finally {
      setProgressForm(prev => ({ ...prev, isSubmitting: false }));
    }
  };

  // Format date helper
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status badge color
  const getStatusColor = (status) => {
    const colors = {
      'CREATED': 'bg-blue-100 text-blue-800',
      'CONFIRMED': 'bg-green-100 text-green-800',
      'PROCESSING': 'bg-yellow-100 text-yellow-800',
      'COMPLETED': 'bg-purple-100 text-purple-800',
      'SHIPPED': 'bg-indigo-100 text-indigo-800',
      'DELIVERED': 'bg-emerald-100 text-emerald-800',
      'CANCELLED': 'bg-red-100 text-red-800',
      'NEED_MATERIAL': 'bg-orange-100 text-orange-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // Get priority color
  const getPriorityColor = (priority) => {
    const colors = {
      'LOW': 'bg-gray-100 text-gray-800',
      'MEDIUM': 'bg-blue-100 text-blue-800',
      'HIGH': 'bg-orange-100 text-orange-800',
      'URGENT': 'bg-red-100 text-red-800'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  // Calculate progress percentage
  const getProgressPercentage = () => {
    if (!order || order.targetPcs === 0) return 0;
    return Math.round((order.completedPcs / order.targetPcs) * 100);
  };

  if (loading) {
    return (
      <AuthWrapper>
        <DashboardLayout>
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </DashboardLayout>
      </AuthWrapper>
    );
  }

  if (error) {
    return (
      <AuthWrapper>
        <DashboardLayout>
          <div className="max-w-6xl mx-auto p-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700">{error}</p>
              <button
                onClick={() => router.push('/dashboard/orders-management')}
                className="mt-2 text-red-600 hover:text-red-800 underline"
              >
                Back to Orders Management
              </button>
            </div>
          </div>
        </DashboardLayout>
      </AuthWrapper>
    );
  }

  return (
    <AuthWrapper>
      <DashboardLayout>
        <div className="max-w-6xl mx-auto p-6">
          {/* Breadcrumb Navigation */}
          <nav className="flex mb-8" aria-label="Breadcrumb">
            <ol className="inline-flex items-center space-x-1 md:space-x-3">
              <li className="inline-flex items-center">
                <button
                  onClick={() => router.push('/dashboard/orders-management')}
                  className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-blue-600"
                >
                  Orders Management
                </button>
              </li>
              <li>
                <div className="flex items-center">
                  <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="ml-1 text-sm font-medium text-gray-500 md:ml-2">
                    {order?.orderNumber || 'Order Details'}
                  </span>
                </div>
              </li>
            </ol>
          </nav>

          {/* Header */}
          <div className="mb-8">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {order?.orderNumber || 'Order Details'}
                </h1>
                <p className="mt-2 text-gray-600">
                  Detailed order information and progress tracking
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => router.push(`/dashboard/orders-management/${id}/edit`)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Edit Order
                </button>
                <button
                  onClick={() => router.push('/dashboard/orders-management')}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Back to List
                </button>
              </div>
            </div>
          </div>

          {/* Success/Error Messages */}
          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-700">{success}</p>
            </div>
          )}

          <div className="space-y-8">
            {/* Order Details Card */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Order Information</h2>
              </div>
              <div className="px-6 py-5">
                <dl className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-6">
                  {/* Order Number */}
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Order Number</dt>
                    <dd className="mt-1 text-sm text-gray-900 font-semibold">{order?.orderNumber || 'N/A'}</dd>
                  </div>

                  {/* Status */}
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Status</dt>
                    <dd className="mt-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order?.status)}`}>
                        {order?.status || 'N/A'}
                      </span>
                    </dd>
                  </div>

                  {/* Priority */}
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Priority</dt>
                    <dd className="mt-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(order?.priority)}`}>
                        {order?.priority || 'N/A'}
                      </span>
                    </dd>
                  </div>

                  {/* Due Date */}
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Due Date</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {order?.dueDate ? formatDate(order.dueDate) : 'No due date'}
                    </dd>
                  </div>

                  {/* Created At */}
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Created</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {order?.createdAt ? formatDate(order.createdAt) : 'N/A'}
                    </dd>
                  </div>

                  {/* Progress */}
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Progress</dt>
                    <dd className="mt-1">
                      <div className="flex items-center">
                        <div className="flex-1">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all"
                              style={{ width: `${getProgressPercentage()}%` }}
                            ></div>
                          </div>
                        </div>
                        <span className="ml-2 text-sm text-gray-600">
                          {order?.completedPcs || 0} / {order?.targetPcs || 0} ({getProgressPercentage()}%)
                        </span>
                      </div>
                    </dd>
                  </div>

                  {/* Description */}
                  <div className="md:col-span-2 lg:col-span-3">
                    <dt className="text-sm font-medium text-gray-500">Description</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {order?.description || 'No description provided'}
                    </dd>
                  </div>

                  {/* Customer Note */}
                  <div className="md:col-span-2 lg:col-span-3">
                    <dt className="text-sm font-medium text-gray-500">Customer Note</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {order?.customerNote || 'No customer notes'}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Tailor Information Card */}
            {order?.Tailor && (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-200">
                  <h2 className="text-lg font-medium text-gray-900">Assigned Tailor</h2>
                </div>
                <div className="px-6 py-5">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-600 font-medium text-lg">
                          {order.Tailor.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900">{order.Tailor.name}</h3>
                      {order.Tailor.email && (
                        <p className="text-sm text-gray-500">{order.Tailor.email}</p>
                      )}
                      {order.Tailor.whatsappPhone && (
                        <a
                          href={`https://wa.me/${order.Tailor.whatsappPhone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-sm text-green-600 hover:text-green-800"
                        >
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" />
                          </svg>
                          WhatsApp
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Products Card */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">
                  Products ({order?.Products?.length || 0})
                </h2>
              </div>
              <div className="overflow-x-auto">
                {order?.Products && order.Products.length > 0 ? (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Product Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Code
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Category
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quantity
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Unit
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Price
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {order.Products.map((product) => (
                        <tr key={product.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {product.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {product.code}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {product.category || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {product.OrderProduct?.qty || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {product.unit}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {product.price ? `IDR ${product.price.toLocaleString('id-ID')}` : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="px-6 py-8 text-center">
                    <p className="text-gray-500">No products assigned to this order</p>
                  </div>
                )}
              </div>
            </div>

            {/* Enhanced Progress Reports History Card */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">
                  Progress History ({progressReports.length} reports)
                </h2>
              </div>
              <div className="px-6 py-5">
                {progressReports.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No progress reports yet</p>
                ) : (
                  <div className="flow-root">
                    <ul className="-mb-8">
                      {progressReports.map((report, index) => {
                        // Extract pieces completed from reportText for backward compatibility
                        const pcsMatch = report.reportText?.match(/Completed (\d+) pieces/);
                        const pcsCompleted = pcsMatch ? pcsMatch[1] : report.percentage || 'Unknown';

                        return (
                          <li key={report.id}>
                            <div className="relative pb-8">
                              {index !== progressReports.length - 1 && (
                                <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                              )}
                              <div className="relative flex space-x-3">
                                <div className="flex-shrink-0">
                                  <span className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
                                    <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                  </span>
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="text-sm">
                                    <span className="font-medium text-gray-900">
                                      {pcsCompleted} pieces completed
                                    </span>
                                    <span className="text-gray-500 ml-2">
                                      by {report.tailorName || report.user?.name || 'Unknown'}
                                    </span>
                                    {report.totalProductsUpdated > 0 && (
                                      <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                        {report.totalProductsUpdated} products
                                      </span>
                                    )}
                                  </div>

                                  {report.reportText && (
                                    <p className="mt-1 text-sm text-gray-600">{report.reportText}</p>
                                  )}

                                  {/* Enhanced Product Summary with Cumulative Progress */}
                                  {report.productSummary && report.productSummary.length > 0 && (
                                    <div className="mt-2 space-y-1">
                                      {report.productSummary.map((product, idx) => (
                                        <div key={idx} className="text-xs bg-gray-50 rounded p-2 border">
                                          <div className="flex justify-between items-center">
                                            <span className="font-medium text-gray-800">{product.productName}</span>
                                            <div className="flex items-center space-x-2">
                                              <span className="text-gray-600">
                                                {product.itemsCompleted}/{product.itemsTarget} pieces
                                              </span>
                                              {product.percentage !== undefined && (
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${product.percentage === 100
                                                  ? 'bg-green-100 text-green-700'
                                                  : product.percentage >= 50
                                                    ? 'bg-yellow-100 text-yellow-700'
                                                    : 'bg-blue-100 text-blue-700'
                                                  }`}>
                                                  {product.percentage}%
                                                </span>
                                              )}
                                            </div>
                                          </div>

                                          {/* Show progress in this specific report */}
                                          {product.itemsCompletedThisReport && product.itemsCompletedThisReport > 0 && (
                                            <p className="text-blue-600 mt-1">
                                              +{product.itemsCompletedThisReport} pieces completed in this update
                                            </p>
                                          )}

                                          {product.notes && (
                                            <p className="text-gray-600 mt-1">{product.notes}</p>
                                          )}

                                          {product.status === 'completed' && product.completionDate && (
                                            <p className="text-green-600 mt-1 font-medium">
                                              ✅ Product completed at this point: {formatDate(product.completionDate)}
                                            </p>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* Enhanced Photo Display */}
                                  {report.photos && report.photos.length > 0 && (
                                    <div className="mt-3">
                                      <div className="text-xs text-blue-600 mb-2">
                                        📷 {report.photos.length} photo{report.photos.length > 1 ? 's' : ''} attached
                                      </div>
                                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                        {report.photos.slice(0, 6).map((photo, photoIdx) => (
                                          <div key={photoIdx} className="relative group">
                                            <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border">
                                              {photo.url ? (
                                                <img
                                                  src={photo.thumbnailUrl || photo.url}
                                                  alt={photo.description || `Progress photo ${photoIdx + 1}`}
                                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                                  onError={(e) => {
                                                    e.target.style.display = 'none';
                                                    e.target.nextSibling.style.display = 'flex';
                                                  }}
                                                />
                                              ) : null}
                                              <div className="w-full h-full flex items-center justify-center text-gray-400 hidden">
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                              </div>
                                            </div>
                                            {photo.description && (
                                              <p className="text-xs text-gray-500 mt-1 truncate" title={photo.description}>
                                                {photo.description}
                                              </p>
                                            )}
                                            {photo.source === 'product_progress' && (
                                              <span className="absolute top-1 right-1 bg-green-500 text-white text-xs px-1 rounded">
                                                Product
                                              </span>
                                            )}
                                          </div>
                                        ))}
                                        {report.photos.length > 6 && (
                                          <div className="aspect-square bg-gray-100 rounded-lg border flex items-center justify-center">
                                            <span className="text-sm text-gray-500">
                                              +{report.photos.length - 6} more
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  <div className="mt-2 flex items-center justify-between">
                                    <p className="text-xs text-gray-500">
                                      {formatDate(report.reportedAt || report.createdAt)}
                                    </p>
                                    {report.percentage && (
                                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                                        {report.percentage}% progress
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </AuthWrapper>
  );
} 