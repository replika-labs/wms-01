'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/app/components/DashboardLayout';
import AuthWrapper from '@/app/components/AuthWrapper';

export default function CreateRecurringPlanPage() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  const [formData, setFormData] = useState({
    productId: '',
    frequency: 'WEEKLY',
    dayOfWeek: 'Mon',
    dayOfMonth: '1',
    qty: 0,
    nextRun: '',
    isActive: true
  });

  const [formErrors, setFormErrors] = useState({});

  // Fetch products for dropdown
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No authentication token found');
        }

        const response = await fetch('/api/products', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch products');
        }

        const data = await response.json();
        setProducts(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message);
        console.error('Error fetching products:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Form validation
  const validateForm = () => {
    const errors = {};

    if (!formData.productId) {
      errors.productId = 'Product is required';
    }

    if (!formData.frequency) {
      errors.frequency = 'Frequency is required';
    }

    if (formData.frequency === 'WEEKLY' && !formData.dayOfWeek) {
      errors.dayOfWeek = 'Day of week is required for weekly frequency';
    }

    if (formData.frequency === 'MONTHLY' && !formData.dayOfMonth) {
      errors.dayOfMonth = 'Day of month is required for monthly frequency';
    }

    if (!formData.qty || formData.qty <= 0) {
      errors.qty = 'Quantity must be greater than 0';
    }

    if (!formData.nextRun) {
      errors.nextRun = 'Next run date is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : type === 'number' ? parseInt(value) || 0 : value
    });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const payload = {
        ...formData,
        // Only include dayOfWeek or dayOfMonth based on frequency
        dayOfWeek: formData.frequency === 'WEEKLY' ? formData.dayOfWeek : null,
        dayOfMonth: formData.frequency === 'MONTHLY' ? formData.dayOfMonth : null
      };

      const response = await fetch('/api/recurring-plans', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to create recurring plan');
      }

      setSuccess('Recurring plan created successfully');
      
      // Reset form
      setFormData({
        productId: '',
        frequency: 'WEEKLY',
        dayOfWeek: 'Mon',
        dayOfMonth: '1',
        qty: 0,
        nextRun: '',
        isActive: true
      });

      // Redirect to recurring plans list after a delay
      setTimeout(() => {
        router.push('/dashboard/recurring-plans');
      }, 2000);
    } catch (err) {
      console.error('Error creating recurring plan:', err);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Get tomorrow's date for default next run
  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  // Days of week options
  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Days of month options
  const daysOfMonth = Array.from({ length: 31 }, (_, i) => (i + 1).toString());

  return (
    <AuthWrapper>
      <DashboardLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Create Recurring Plan</h1>
              <p className="mt-1 text-sm text-gray-600">
                Set up a new scheduled production plan
              </p>
            </div>
            <button
              onClick={() => router.push('/dashboard/recurring-plans')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Back to Plans
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
              {success}
            </div>
          )}

          {/* Loading State */}
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="bg-white shadow rounded-lg p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Product Selection */}
                <div>
                  <label htmlFor="productId" className="block text-sm font-medium text-gray-700">
                    Product *
                  </label>
                  <select
                    id="productId"
                    name="productId"
                    value={formData.productId}
                    onChange={handleChange}
                    className={`mt-1 block w-full py-2 px-3 border ${formErrors.productId ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                  >
                    <option value="">Select a product</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} ({product.code})
                      </option>
                    ))}
                  </select>
                  {formErrors.productId && (
                    <p className="mt-2 text-sm text-red-600">{formErrors.productId}</p>
                  )}
                </div>

                {/* Frequency */}
                <div>
                  <label htmlFor="frequency" className="block text-sm font-medium text-gray-700">
                    Frequency *
                  </label>
                  <select
                    id="frequency"
                    name="frequency"
                    value={formData.frequency}
                    onChange={handleChange}
                    className={`mt-1 block w-full py-2 px-3 border ${formErrors.frequency ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                  >
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                  </select>
                  {formErrors.frequency && (
                    <p className="mt-2 text-sm text-red-600">{formErrors.frequency}</p>
                  )}
                </div>

                {/* Day of Week - Only show if frequency is WEEKLY */}
                {formData.frequency === 'WEEKLY' && (
                  <div>
                    <label htmlFor="dayOfWeek" className="block text-sm font-medium text-gray-700">
                      Day of Week *
                    </label>
                    <select
                      id="dayOfWeek"
                      name="dayOfWeek"
                      value={formData.dayOfWeek}
                      onChange={handleChange}
                      className={`mt-1 block w-full py-2 px-3 border ${formErrors.dayOfWeek ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                    >
                      {daysOfWeek.map((day) => (
                        <option key={day} value={day}>
                          {day}
                        </option>
                      ))}
                    </select>
                    {formErrors.dayOfWeek && (
                      <p className="mt-2 text-sm text-red-600">{formErrors.dayOfWeek}</p>
                    )}
                  </div>
                )}

                {/* Day of Month - Only show if frequency is MONTHLY */}
                {formData.frequency === 'MONTHLY' && (
                  <div>
                    <label htmlFor="dayOfMonth" className="block text-sm font-medium text-gray-700">
                      Day of Month *
                    </label>
                    <select
                      id="dayOfMonth"
                      name="dayOfMonth"
                      value={formData.dayOfMonth}
                      onChange={handleChange}
                      className={`mt-1 block w-full py-2 px-3 border ${formErrors.dayOfMonth ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                    >
                      {daysOfMonth.map((day) => (
                        <option key={day} value={day}>
                          {day}
                        </option>
                      ))}
                    </select>
                    {formErrors.dayOfMonth && (
                      <p className="mt-2 text-sm text-red-600">{formErrors.dayOfMonth}</p>
                    )}
                  </div>
                )}

                {/* Quantity */}
                <div>
                  <label htmlFor="qty" className="block text-sm font-medium text-gray-700">
                    Quantity (pcs) *
                  </label>
                  <input
                    type="number"
                    id="qty"
                    name="qty"
                    min="1"
                    value={formData.qty}
                    onChange={handleChange}
                    className={`mt-1 block w-full py-2 px-3 border ${formErrors.qty ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                  />
                  {formErrors.qty && (
                    <p className="mt-2 text-sm text-red-600">{formErrors.qty}</p>
                  )}
                </div>

                {/* Next Run Date */}
                <div>
                  <label htmlFor="nextRun" className="block text-sm font-medium text-gray-700">
                    Next Run Date *
                  </label>
                  <input
                    type="date"
                    id="nextRun"
                    name="nextRun"
                    value={formData.nextRun || getTomorrowDate()}
                    onChange={handleChange}
                    className={`mt-1 block w-full py-2 px-3 border ${formErrors.nextRun ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                  />
                  {formErrors.nextRun && (
                    <p className="mt-2 text-sm text-red-600">{formErrors.nextRun}</p>
                  )}
                </div>

                {/* Is Active */}
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="isActive"
                      name="isActive"
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={handleChange}
                      className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="isActive" className="font-medium text-gray-700">
                      Active
                    </label>
                    <p className="text-gray-500">Enable this plan to automatically generate orders</p>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {submitting ? 'Creating...' : 'Create Plan'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </DashboardLayout>
    </AuthWrapper>
  );
} 