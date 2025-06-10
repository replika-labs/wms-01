'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/app/components/DashboardLayout';
import AuthWrapper from '@/app/components/AuthWrapper';
import ProductSelector from '@/app/components/ProductSelector';
import ordersManagementAPI from '@/app/services/OrdersManagementAPI';

export default function CreateOrderManagement() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tailors, setTailors] = useState([]);
  const [refreshingTailors, setRefreshingTailors] = useState(false);

  const [formData, setFormData] = useState({
    customerNote: '',
    dueDate: '',
    description: '',
    priority: 'MEDIUM',
    workerContactId: '',
    products: [] // Array of { productId, quantity }
  });

  // Fetch tailors on component mount
  useEffect(() => {
    const fetchTailors = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          console.warn('No authentication token for loading tailors');
          return;
        }

        const response = await fetch('http://localhost:8080/api/contacts/type/WORKER', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setTailors(data.contacts || []);
          } else {
            console.error('Failed to load tailors:', data.message);
          }
        } else {
          console.error('Tailors API error:', response.status, response.statusText);
        }
      } catch (err) {
        console.error('Error loading tailors:', err);
        // Don't show error for tailors, just log it
      }
    };

    fetchTailors();
  }, []);

  // Manual refresh tailors function
  const handleRefreshTailors = async () => {
    try {
      setRefreshingTailors(true);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token required');
      }

      const response = await fetch('http://localhost:8080/api/contacts/type/WORKER', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setTailors(data.contacts || []);
          setSuccess('Tailors list refreshed successfully!');
          setTimeout(() => setSuccess(''), 3000);
        } else {
          throw new Error(data.message || 'Failed to refresh tailors');
        }
      } else {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      setError('Failed to refresh tailors: ' + error.message);
      setTimeout(() => setError(''), 5000);
    } finally {
      setRefreshingTailors(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleProductChange = (productId, quantity) => {
    console.log('Product change:', { productId, quantity });

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

      console.log('Updated products:', products);
      return { ...prev, products };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
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

      console.log('Submitting form data:', formData);

      // Use orders-management API for creation
      const result = await ordersManagementAPI.createOrder(formData);

      console.log('Order creation result:', result);

      // Handle stock warnings if any
      if (result.stockResults && result.stockResults.hasStockIssues) {
        const warnings = result.stockResults.warnings || [];
        const alerts = result.stockResults.alerts || [];

        if (warnings.length > 0 || alerts.length > 0) {
          const stockMessage = [
            ...warnings,
            ...alerts.map(alert => `Purchase alert created for ${alert.materialName}`)
          ].join('; ');

          setSuccess(`Order created successfully! Stock notifications: ${stockMessage}`);
        } else {
          setSuccess('Order created successfully!');
        }
      } else {
        setSuccess('Order created successfully!');
      }

      // Reset form
      setFormData({
        customerNote: '',
        dueDate: '',
        description: '',
        priority: 'MEDIUM',
        workerContactId: '',
        products: []
      });

      // Redirect to orders management after 2 seconds
      setTimeout(() => {
        router.push('/dashboard/orders-management');
      }, 2000);

    } catch (err) {
      console.error('Error creating order:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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
                  <span className="ml-1 text-sm font-medium text-gray-500 md:ml-2">Create New Order</span>
                </div>
              </li>
            </ol>
          </nav>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Create New Order</h1>
            <p className="mt-2 text-gray-600">
              Fill in the order details below. All fields marked with * are required.
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>

                  {/* Tailor Assignment */}
                  <div>
                    <label htmlFor="workerContactId" className="block text-sm font-medium text-gray-700 mb-1">
                      Assigned Tailor
                    </label>
                    <div className="flex items-center space-x-2">
                      <select
                        id="workerContactId"
                        name="workerContactId"
                        value={formData.workerContactId}
                        onChange={handleInputChange}
                        className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      >
                        <option value="">Select Tailor (Optional)</option>
                        {tailors.map(tailor => (
                          <option key={tailor.id} value={tailor.id}>
                            {tailor.name}
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
                  <p className="mt-2 text-xs text-gray-500">
                    Select products and specify quantities. Material stock will be automatically checked.
                  </p>
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
                    onClick={() => router.push('/dashboard/orders-management')}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {loading ? 'Creating...' : 'Create Order'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Help Section */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-blue-900 mb-2">Enhanced Features</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>Tailor Assignment:</strong> Assign orders directly to tailors for better tracking</li>
              <li>• <strong>Material Stock Checking:</strong> Automatic material availability verification</li>
              <li>• <strong>Purchase Alerts:</strong> Automatic alerts when materials are low</li>
              <li>• <strong>Progress Tracking:</strong> Integrated progress reporting system</li>
              <li>• <strong>WhatsApp Integration:</strong> Direct communication with assigned tailors</li>
            </ul>
          </div>
        </div>
      </DashboardLayout>
    </AuthWrapper>
  );
} 