'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import AuthWrapper from '@/app/components/AuthWrapper';
import DashboardLayout from '@/app/components/DashboardLayout';
import ProductSelector from '@/app/components/ProductSelector';
import ordersManagementAPI from '@/app/services/OrdersManagementAPI';

export default function EditOrderManagement({ params }) {
  const router = useRouter();
  const { id } = use(params);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tailors, setTailors] = useState([]);
  const [refreshingTailors, setRefreshingTailors] = useState(false);
  
  const [formData, setFormData] = useState({
    customerNote: '',
    dueDate: '',
    description: '',
    priority: 'medium',
    status: 'created',
    tailorContactId: '',
    products: [] // Array of { productId, quantity }
  });

  // Fetch order data and pre-populate form
  useEffect(() => {
    const fetchOrderData = async () => {
      try {
        setLoading(true);
        setError('');

        // Fetch order details using orders-management API
        const orderData = await ordersManagementAPI.getOrderDetails(id);
        
        // Pre-populate form data
        setFormData({
          customerNote: orderData.customerNote || '',
          dueDate: orderData.dueDate ? orderData.dueDate.split('T')[0] : '', // Format date for input
          description: orderData.description || '',
          priority: orderData.priority || 'medium',
          status: orderData.status || 'created',
          tailorContactId: orderData.tailorContactId || '',
          products: orderData.Products?.map(p => ({
            productId: p.id,
            quantity: p.OrderProduct.qty
          })) || []
        });

        // Fetch tailors for dropdown
        const tailorsData = await ordersManagementAPI.getTailors();
        setTailors(tailorsData);

      } catch (err) {
        setError('Error loading order data: ' + err.message);
        console.error('Error fetching order data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrderData();
  }, [id]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleProductChange = (productId, quantity) => {
    setFormData(prev => {
      const products = [...prev.products];
      const existingIndex = products.findIndex(p => p.productId === productId);
      
      if (existingIndex >= 0) {
        if (quantity > 0) {
          products[existingIndex].quantity = quantity;
        } else {
          products.splice(existingIndex, 1);
        }
      } else if (quantity > 0) {
        products.push({ productId, quantity });
      }

      return { ...prev, products };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      // Validate form
      if (!formData.dueDate) {
        throw new Error('Due date is required');
      }
      if (formData.products.length === 0) {
        throw new Error('Please select at least one product');
      }

      // Use orders-management API for update
      const result = await ordersManagementAPI.updateOrder(id, formData);

      // Handle stock warnings if any
      if (result.stockResults && result.stockResults.hasStockIssues) {
        const warnings = result.stockResults.warnings || [];
        const alerts = result.stockResults.alerts || [];
        
        if (warnings.length > 0 || alerts.length > 0) {
          const stockMessage = [
            ...warnings,
            ...alerts.map(alert => `Purchase alert updated for ${alert.materialName}`)
          ].join('; ');
          
          setSuccess(`Order updated successfully! Stock notifications: ${stockMessage}`);
        } else {
          setSuccess('Order updated successfully!');
        }
      } else {
        setSuccess('Order updated successfully!');
      }

      // Redirect to order details after 2 seconds
      setTimeout(() => {
        router.push(`/dashboard/orders-management/${id}`);
      }, 2000);

    } catch (err) {
      setError(err.message);
      console.error('Error updating order:', err);
    } finally {
      setSaving(false);
    }
  };

  // Manual refresh tailors function
  const handleRefreshTailors = async () => {
    try {
      setRefreshingTailors(true);
      await ordersManagementAPI.clearTailorsCache();
      const freshTailors = await ordersManagementAPI.getTailors(true);
      setTailors(freshTailors);
      setSuccess('Tailors list refreshed successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Failed to refresh tailors: ' + error.message);
      setTimeout(() => setError(''), 5000);
    } finally {
      setRefreshingTailors(false);
    }
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
                  <button
                    onClick={() => router.push(`/dashboard/orders-management/${id}`)}
                    className="ml-1 text-sm font-medium text-gray-700 hover:text-blue-600 md:ml-2"
                  >
                    Order Details
                  </button>
                </div>
              </li>
              <li>
                <div className="flex items-center">
                  <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="ml-1 text-sm font-medium text-gray-500 md:ml-2">Edit</span>
                </div>
              </li>
            </ol>
          </nav>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Edit Order</h1>
            <p className="mt-2 text-gray-600">
              Update order details below. All fields marked with * are required.
            </p>
          </div>

          {/* Alerts */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <svg className="w-5 h-5 text-red-400 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex">
                <svg className="w-5 h-5 text-green-400 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-green-700">{success}</p>
              </div>
            </div>
          )}

          {/* Form */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Order Information</h2>
            </div>
            <div className="px-6 py-5">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Status */}
                  <div>
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                      Status *
                    </label>
                    <select
                      id="status"
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      required
                    >
                      <option value="created">Created</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="processing">Processing</option>
                      <option value="completed">Completed</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="need material">Need Material</option>
                    </select>
                  </div>

                  {/* Due Date */}
                  <div>
                    <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-1">
                      Due Date *
                    </label>
                    <input
                      type="date"
                      id="dueDate"
                      name="dueDate"
                      value={formData.dueDate}
                      onChange={handleInputChange}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                  </div>

                  {/* Priority */}
                  <div>
                    <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
                      Priority
                    </label>
                    <select
                      id="priority"
                      name="priority"
                      value={formData.priority}
                      onChange={handleInputChange}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>

                  {/* Tailor Assignment */}
                  <div>
                    <label htmlFor="tailorContactId" className="block text-sm font-medium text-gray-700 mb-1">
                      Assigned Tailor
                    </label>
                    <div className="flex items-center space-x-2">
                      <select
                        id="tailorContactId"
                        name="tailorContactId"
                        value={formData.tailorContactId}
                        onChange={handleInputChange}
                        className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      >
                        <option value="">Select Tailor (Optional)</option>
                        {tailors.map(tailor => (
                          <option key={tailor.id} value={tailor.id}>
                            {tailor.name} {tailor.company && `(${tailor.company})`}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={handleRefreshTailors}
                        disabled={refreshingTailors}
                        className="px-2 py-2 text-sm bg-blue-100 text-blue-600 rounded hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Refresh tailors list"
                      >
                        {refreshingTailors ? (
                          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        )}
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Assign a tailor to this order for progress tracking
                    </p>
                  </div>
                </div>

                {/* Product Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Products & Quantities *
                  </label>
                  <ProductSelector 
                    selectedProducts={formData.products}
                    onProductChange={handleProductChange}
                  />
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows={3}
                    value={formData.description}
                    onChange={handleInputChange}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Enter order description..."
                  />
                </div>

                {/* Customer Notes */}
                <div>
                  <label htmlFor="customerNote" className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Notes
                  </label>
                  <textarea
                    id="customerNote"
                    name="customerNote"
                    rows={3}
                    value={formData.customerNote}
                    onChange={handleInputChange}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Enter customer notes..."
                  />
                </div>

                {/* Form Actions */}
                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => router.push(`/dashboard/orders-management/${id}`)}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {saving ? 'Updating...' : 'Update Order'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </AuthWrapper>
  );
} 