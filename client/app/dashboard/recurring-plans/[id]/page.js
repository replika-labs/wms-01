'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/app/components/DashboardLayout';
import AuthWrapper from '@/app/components/AuthWrapper';

export default function RecurringPlanDetailPage({ params }) {
  const { id } = params;
  const router = useRouter();
  const [plan, setPlan] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  
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

  // Fetch recurring plan details and products
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No authentication token found');
        }

        // Fetch recurring plan details
        const planResponse = await fetch(`/api/recurring-plans/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!planResponse.ok) {
          throw new Error('Failed to fetch recurring plan details');
        }

        const planData = await planResponse.json();
        setPlan(planData);
        
        // Initialize form data
        setFormData({
          productId: planData.productId || '',
          frequency: planData.frequency || 'WEEKLY',
          dayOfWeek: planData.dayOfWeek || 'Mon',
          dayOfMonth: planData.dayOfMonth || '1',
          qty: planData.qty || 0,
          nextRun: planData.nextRun ? new Date(planData.nextRun).toISOString().split('T')[0] : '',
          isActive: planData.isActive !== undefined ? planData.isActive : true
        });

        // Fetch products for dropdown
        const productsResponse = await fetch('/api/products', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!productsResponse.ok) {
          throw new Error('Failed to fetch products');
        }

        const productsData = await productsResponse.json();
        setProducts(Array.isArray(productsData) ? productsData : []);
      } catch (err) {
        setError(err.message);
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

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

      const response = await fetch(`/api/recurring-plans/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to update recurring plan');
      }

      const updatedPlan = await response.json();
      setPlan(updatedPlan);
      setSuccess('Recurring plan updated successfully');
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating recurring plan:', err);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle edit mode
  const toggleEditMode = () => {
    setIsEditing(!isEditing);
    setError(null);
    setSuccess(null);
    
    // Reset form data to current plan data
    if (plan) {
      setFormData({
        productId: plan.productId || '',
        frequency: plan.frequency || 'WEEKLY',
        dayOfWeek: plan.dayOfWeek || 'Mon',
        dayOfMonth: plan.dayOfMonth || '1',
        qty: plan.qty || 0,
        nextRun: plan.nextRun ? new Date(plan.nextRun).toISOString().split('T')[0] : '',
        isActive: plan.isActive !== undefined ? plan.isActive : true
      });
    }
  };

  // Handle toggle active status
  const handleToggleActive = async () => {
    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`/api/recurring-plans/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive: !plan.isActive })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to update recurring plan status');
      }

      const updatedPlan = await response.json();
      setPlan(updatedPlan);
      setSuccess(`Plan ${updatedPlan.isActive ? 'activated' : 'deactivated'} successfully`);
    } catch (err) {
      console.error('Error updating recurring plan status:', err);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Days of week options
  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Days of month options
  const daysOfMonth = Array.from({ length: 31 }, (_, i) => (i + 1).toString());

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <AuthWrapper>
      <DashboardLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {isEditing ? 'Edit Recurring Plan' : 'Recurring Plan Details'}
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                {isEditing ? 'Edit scheduled production plan' : 'View scheduled production plan details'}
              </p>
            </div>
            <div className="flex space-x-4">
              {!isEditing && (
                <>
                  <button
                    onClick={() => router.push('/dashboard/recurring-plans')}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Back to Plans
                  </button>
                  <button
                    onClick={toggleEditMode}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Edit Plan
                  </button>
                </>
              )}
              {isEditing && (
                <button
                  onClick={toggleEditMode}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel Edit
                </button>
              )}
            </div>
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
          ) : isEditing ? (
            /* Edit Form */
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
                    value={formData.nextRun}
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
                    {submitting ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* View Details */
            <div className="bg-white shadow rounded-lg overflow-hidden">
              {plan && (
                <>
                  {/* Header with status */}
                  <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <div className="flex items-center">
                      <h2 className="text-lg font-semibold text-gray-900">
                        Plan Details
                      </h2>
                      <span className={`ml-4 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        plan.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {plan.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <button
                      onClick={handleToggleActive}
                      disabled={submitting}
                      className={`inline-flex items-center px-3 py-1.5 border border-transparent rounded-md text-xs font-medium ${
                        plan.isActive 
                          ? 'text-red-700 bg-red-100 hover:bg-red-200' 
                          : 'text-green-700 bg-green-100 hover:bg-green-200'
                      } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50`}
                    >
                      {submitting ? 'Updating...' : plan.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                  
                  {/* Details */}
                  <div className="px-6 py-4">
                    <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
                      {/* Product */}
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Product</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {plan.Product ? (
                            <>
                              {plan.Product.name} <span className="text-gray-500">({plan.Product.code})</span>
                            </>
                          ) : (
                            'Unknown Product'
                          )}
                        </dd>
                      </div>
                      
                      {/* Frequency */}
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Frequency</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {plan.frequency === 'WEEKLY' ? (
                            <>Weekly (Every {plan.dayOfWeek || 'N/A'})</>
                          ) : (
                            <>Monthly (Day {plan.dayOfMonth || 'N/A'})</>
                          )}
                        </dd>
                      </div>
                      
                      {/* Quantity */}
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Quantity</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {plan.qty} pcs
                        </dd>
                      </div>
                      
                      {/* Next Run */}
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Next Run Date</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {formatDate(plan.nextRun)}
                        </dd>
                      </div>
                      
                      {/* Created At */}
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Created At</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {formatDate(plan.createdAt)}
                        </dd>
                      </div>
                      
                      {/* Updated At */}
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {formatDate(plan.updatedAt)}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </DashboardLayout>
    </AuthWrapper>
  );
} 