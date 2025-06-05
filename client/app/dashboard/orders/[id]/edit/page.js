'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthWrapper from '../../../../components/AuthWrapper';
import DashboardLayout from '../../../../components/DashboardLayout';
import ProductSelector from '../../../../components/ProductSelector';

export default function EditOrder({ params }) {
  const router = useRouter();
  const { id } = params;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    customerNote: '',
    dueDate: '',
    description: '',
    priority: 'medium',
    status: 'created',
    products: [] // Array of { productId, quantity }
  });

  // Fetch order data and pre-populate form
  useEffect(() => {
    const fetchOrderData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No authentication token found');
        }

        const response = await fetch(`/api/orders-management/${id}/details`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || 'Failed to fetch order details');
        }

        const orderData = await response.json();
        
        // Pre-populate form data
        setFormData({
          customerNote: orderData.customerNote || '',
          dueDate: orderData.dueDate ? orderData.dueDate.split('T')[0] : '', // Format date for input
          description: orderData.description || '',
          priority: orderData.priority || 'medium',
          status: orderData.status || 'created',
          products: orderData.Products?.map(p => ({
            productId: p.id,
            quantity: p.OrderProduct.quantity
          })) || []
        });

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
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Validate form
      if (!formData.dueDate) {
        throw new Error('Due date is required');
      }
      if (formData.products.length === 0) {
        throw new Error('Please select at least one product');
      }

      const response = await fetch(`/api/orders-management/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update order');
      }

      setSuccess('Order updated successfully!');
      // Redirect to order list after 2 seconds
      setTimeout(() => {
        router.push('/dashboard/orders');
      }, 2000);

    } catch (err) {
      setError(err.message);
      console.error('Error updating order:', err);
    } finally {
      setSaving(false);
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
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Edit Order</h1>
            <p className="mt-2 text-sm text-gray-600">
              Update order details below. All fields marked with * are required.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-600">{success}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Status (Edit page specific field) */}
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                Status *
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                required
              >
                <option value="created">Created</option>
                <option value="confirmed">Confirmed</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Target Quantity - REMOVED to match create form */}
            {/* This field was removed to match the enhanced ProductSelector system */}

            {/* Due Date */}
            <div>
              <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700">
                Due Date *
              </label>
              <input
                type="date"
                id="dueDate"
                name="dueDate"
                value={formData.dueDate}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                required
              />
            </div>

            {/* Priority */}
            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
                Priority
              </label>
              <select
                id="priority"
                name="priority"
                value={formData.priority}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                value={formData.description}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Enter order description..."
              />
            </div>

            {/* Customer Notes */}
            <div>
              <label htmlFor="customerNote" className="block text-sm font-medium text-gray-700">
                Customer Notes
              </label>
              <textarea
                id="customerNote"
                name="customerNote"
                rows={3}
                value={formData.customerNote}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Enter customer notes..."
              />
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

            {/* Form Actions */}
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => router.push('/dashboard/orders')}
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
      </DashboardLayout>
    </AuthWrapper>
  );
} 