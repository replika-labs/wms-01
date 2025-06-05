'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/app/components/DashboardLayout';
import AuthWrapper from '@/app/components/AuthWrapper';
import ProductSelector from '@/app/components/ProductSelector';

export default function CreateOrder() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    customerNote: '',
    dueDate: '',
    description: '',
    priority: 'medium',
    products: [] // Array of { productId, quantity }
  });

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

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }

      // Validate form
      if (!formData.dueDate) {
        throw new Error('Due date is required');
      }
      if (formData.products.length === 0) {
        throw new Error('Please select at least one product');
      }

      // Debug: Log the data being sent
      console.log('Sending order data:', {
        ...formData,
        token: token ? 'Present' : 'Missing'
      });

      const response = await fetch('/api/orders-management', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          console.log('Error response data:', data);
          
          // Provide more specific error messages
          if (response.status === 401) {
            throw new Error('Authentication failed. Please log in again.');
          } else if (response.status === 400) {
            throw new Error(`Validation error: ${data.message || 'Invalid form data'}`);
          } else if (response.status === 500) {
            throw new Error(`Server error: ${data.message || 'Internal server error. Please try again.'}`);
          } else {
            throw new Error(data.message || `Request failed with status ${response.status}`);
          }
        } else {
          // If not JSON, it's likely an HTML error page
          const errorText = await response.text();
          console.error('Server error response:', errorText);
          
          if (response.status === 401) {
            throw new Error('Authentication failed. Please log in again.');
          } else if (response.status === 404) {
            throw new Error('API endpoint not found. Please check if the server is running.');
          } else {
            throw new Error(`Server error (${response.status}): Please check server logs`);
          }
        }
      }

      const result = await response.json();
      console.log('Success response:', result);
      
      // Handle successful order creation with material warnings
      let successMessage = result.message || 'Order created successfully!';
      
      // Add material warnings to success message if any
      if (result.stockWarnings && result.stockWarnings.length > 0) {
        successMessage += '\n\nMaterial Warnings:\n' + result.stockWarnings.join('\n');
      }
      
      // Add purchase alerts information if any
      if (result.purchaseAlerts && result.purchaseAlerts.length > 0) {
        successMessage += `\n\n${result.purchaseAlerts.length} purchase alert(s) generated for materials below safety stock.`;
      }
      
      // Show different messages based on order status
      if (result.order && result.order.status === 'need material') {
        successMessage += '\n\nNote: Order created with "need material" status due to insufficient material stock.';
      }

      alert(successMessage);

      // Reset form and redirect
      setFormData({
        customerNote: '',
        dueDate: '',
        description: '',
        priority: 'medium',
        products: []
      });

      router.push('/dashboard/orders');

    } catch (error) {
      console.error('Order creation error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthWrapper>
      <DashboardLayout>
        <div className="max-w-6xl mx-auto p-6">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Create New Order</h1>
            <p className="mt-2 text-sm text-gray-600">
              Fill in the order details below. All fields marked with * are required.
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
              </select>
            </div>

            {/* Enhanced Products Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Products *
              </label>
              <ProductSelector
                selectedProducts={formData.products}
                onProductChange={handleProductChange}
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows="3"
                value={formData.description}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Enter order description or special instructions..."
              />
            </div>

            {/* Customer Note */}
            <div>
              <label htmlFor="customerNote" className="block text-sm font-medium text-gray-700">
                Customer Note
              </label>
              <textarea
                id="customerNote"
                name="customerNote"
                rows="2"
                value={formData.customerNote}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Enter any customer notes or requirements..."
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  loading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {loading ? 'Creating...' : 'Create Order'}
              </button>
            </div>
          </form>
        </div>
      </DashboardLayout>
    </AuthWrapper>
  );
} 