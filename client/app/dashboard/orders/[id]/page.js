'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/app/components/DashboardLayout';
import AuthWrapper from '@/app/components/AuthWrapper';

export default function OrderDetail({ params }) {
  const router = useRouter();
  const { id } = params;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Progress Report Form State
  const [progressForm, setProgressForm] = useState({
    pcsFinished: 0,
    note: '',
    photoUrl: '',
    isSubmitting: false,
    error: null,
    success: null,
  });

  // Progress Reports History
  const [progressReports, setProgressReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);

  // Fetch order details
  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
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
        throw new Error('Failed to fetch order details');
      }

      const data = await response.json();
      setOrder(data);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching order details:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch progress reports
  const fetchProgressReports = async () => {
    try {
      setLoadingReports(true);
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`/api/progress-reports?orderId=${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch progress reports');
      }

      const data = await response.json();
      setProgressReports(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching progress reports:', err);
      // Don't set main error state to avoid blocking the entire page
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    fetchOrderDetails();
    fetchProgressReports();
  }, [id]);

  // Handle progress form change
  const handleProgressChange = (e) => {
    const { name, value, type } = e.target;
    
    if (type === 'number') {
      // Ensure pcsFinished is not more than remaining
      const remaining = order ? order.targetPcs - order.completedPcs : 0;
      const newValue = Math.min(parseInt(value, 10), remaining);
      
      setProgressForm(prev => ({
        ...prev,
        [name]: newValue
      }));
    } else {
      setProgressForm(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Handle file upload
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // For simplicity, we'll just store the file name
      // In a real app, you would upload to a server or cloud storage
      setProgressForm(prev => ({
        ...prev,
        photoUrl: file.name
      }));
    }
  };

  // Submit progress report
  const handleProgressSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setProgressForm(prev => ({ ...prev, isSubmitting: true, error: null, success: null }));
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Validation
      if (progressForm.pcsFinished <= 0) {
        throw new Error('Completed pieces must be greater than 0');
      }

      const response = await fetch('/api/progress-reports', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          orderId: id,
          pcsFinished: progressForm.pcsFinished,
          note: progressForm.note,
          photoUrl: progressForm.photoUrl || null
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit progress report');
      }

      // Success - reset form
      setProgressForm({
        pcsFinished: 0,
        note: '',
        photoUrl: '',
        isSubmitting: false,
        error: null,
        success: 'Progress report submitted successfully'
      });

      // Refresh order details and progress reports
      fetchOrderDetails();
      fetchProgressReports();
    } catch (err) {
      setProgressForm(prev => ({
        ...prev,
        isSubmitting: false,
        error: err.message
      }));
      console.error('Error submitting progress report:', err);
    }
  };

  // Calculate progress percentage
  const calculateProgress = (order) => {
    if (!order || !order.targetPcs || order.targetPcs === 0) return 0;
    return Math.round((order.completedPcs / order.targetPcs) * 100);
  };

  // Get progress color based on percentage
  const getProgressColor = (percentage) => {
    if (percentage < 30) return 'bg-red-500';
    if (percentage < 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <AuthWrapper>
      <DashboardLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header with back button */}
          <div className="flex items-center mb-6">
            <button
              onClick={() => router.back()}
              className="mr-4 text-gray-600 hover:text-gray-900"
            >
              ← Back
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {loading ? 'Loading...' : `Order: ${order?.orderNumber || 'N/A'}`}
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                View order details and update progress
              </p>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {/* Success message */}
          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
              {success}
            </div>
          )}

          {/* Loading state */}
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Order details card */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-200">
                  <h2 className="text-lg font-medium text-gray-900">Order Details</h2>
                </div>
                <div className="px-6 py-5">
                  <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
                    {/* Order Number */}
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Order Number</dt>
                      <dd className="mt-1 text-sm text-gray-900">{order?.orderNumber || 'N/A'}</dd>
                    </div>
                    
                    {/* Status */}
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Status</dt>
                      <dd className="mt-1 text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          order?.status === 'completed' ? 'bg-green-100 text-green-800' :
                          order?.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                          order?.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {order?.status || 'N/A'}
                        </span>
                      </dd>
                    </div>
                    
                    {/* Due Date */}
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Due Date</dt>
                      <dd className="mt-1 text-sm text-gray-900">{order?.dueDate ? formatDate(order.dueDate) : 'N/A'}</dd>
                    </div>
                    
                    {/* Priority */}
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Priority</dt>
                      <dd className="mt-1 text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          order?.priority === 'high' ? 'bg-yellow-100 text-yellow-800' :
                          order?.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                          order?.priority === 'low' ? 'bg-gray-100 text-gray-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {order?.priority || 'N/A'}
                        </span>
                      </dd>
                    </div>
                    
                    {/* Created At */}
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Created At</dt>
                      <dd className="mt-1 text-sm text-gray-900">{order?.createdAt ? formatDate(order.createdAt) : 'N/A'}</dd>
                    </div>
                    
                    {/* Customer Note */}
                    <div className="md:col-span-2">
                      <dt className="text-sm font-medium text-gray-500">Customer Note</dt>
                      <dd className="mt-1 text-sm text-gray-900">{order?.customerNote || 'No notes'}</dd>
                    </div>
                    
                    {/* Progress */}
                    <div className="md:col-span-2">
                      <dt className="text-sm font-medium text-gray-500">Progress</dt>
                      <dd className="mt-1">
                        <div className="flex items-center">
                          <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2 flex-grow">
                            <div 
                              className={`h-2.5 rounded-full ${getProgressColor(calculateProgress(order))}`} 
                              style={{ width: `${calculateProgress(order)}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {calculateProgress(order)}% ({order?.completedPcs || 0}/{order?.targetPcs || 0} pcs)
                          </span>
                        </div>
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>

              {/* Products card */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-200">
                  <h2 className="text-lg font-medium text-gray-900">Products</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Product Name
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Code
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quantity
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Unit
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {order?.Products && order.Products.length > 0 ? (
                        order.Products.map((product) => (
                          <tr key={product.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {product.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {product.code}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {product.OrderProduct?.quantity || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {product.unit}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">
                            No products found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Progress form card */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-200">
                  <h2 className="text-lg font-medium text-gray-900">Update Progress</h2>
                </div>
                <div className="px-6 py-5">
                  {/* Progress form error/success messages */}
                  {progressForm.error && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm text-red-600">{progressForm.error}</p>
                    </div>
                  )}
                  
                  {progressForm.success && (
                    <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
                      <p className="text-sm text-green-600">{progressForm.success}</p>
                    </div>
                  )}

                  {/* Only show form if order is not completed, cancelled, or delivered */}
                  {order && !['completed', 'cancelled', 'delivered'].includes(order.status) ? (
                    <form onSubmit={handleProgressSubmit} className="space-y-4">
                      <div>
                        <label htmlFor="pcsFinished" className="block text-sm font-medium text-gray-700">
                          Completed Pieces *
                        </label>
                        <div className="mt-1 flex rounded-md shadow-sm">
                          <input
                            type="number"
                            name="pcsFinished"
                            id="pcsFinished"
                            min="1"
                            max={order ? order.targetPcs - order.completedPcs : 0}
                            value={progressForm.pcsFinished}
                            onChange={handleProgressChange}
                            className="flex-1 focus:ring-blue-500 focus:border-blue-500 block w-full min-w-0 rounded-md sm:text-sm border-gray-300"
                            required
                          />
                          <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                            pcs
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          Maximum: {order ? order.targetPcs - order.completedPcs : 0} pcs remaining
                        </p>
                      </div>

                      <div>
                        <label htmlFor="photoUrl" className="block text-sm font-medium text-gray-700">
                          Progress Photo
                        </label>
                        <input
                          type="file"
                          name="photoUrl"
                          id="photoUrl"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300"
                        />
                      </div>

                      <div>
                        <label htmlFor="note" className="block text-sm font-medium text-gray-700">
                          Notes
                        </label>
                        <textarea
                          id="note"
                          name="note"
                          rows={3}
                          value={progressForm.note}
                          onChange={handleProgressChange}
                          className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                          placeholder="Add any notes about this progress update"
                        ></textarea>
                      </div>

                      <div className="pt-3">
                        <button
                          type="submit"
                          disabled={progressForm.isSubmitting || progressForm.pcsFinished <= 0}
                          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {progressForm.isSubmitting ? 'Submitting...' : 'Submit Progress'}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="py-4 text-center">
                      <p className="text-sm text-gray-500">
                        {order?.status === 'completed' ? 'This order is already completed.' :
                         order?.status === 'cancelled' ? 'This order has been cancelled.' :
                         order?.status === 'delivered' ? 'This order has been delivered.' :
                         'Cannot update progress for this order.'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Progress history card */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-200">
                  <h2 className="text-lg font-medium text-gray-900">Progress History</h2>
                </div>
                <div className="px-6 py-5">
                  {loadingReports ? (
                    <div className="flex justify-center items-center h-20">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    </div>
                  ) : progressReports.length === 0 ? (
                    <div className="py-4 text-center">
                      <p className="text-sm text-gray-500">No progress reports found</p>
                    </div>
                  ) : (
                    <div className="flow-root">
                      <ul className="-mb-8">
                        {progressReports.map((report, reportIdx) => (
                          <li key={report.id}>
                            <div className="relative pb-8">
                              {reportIdx !== progressReports.length - 1 ? (
                                <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true"></span>
                              ) : null}
                              <div className="relative flex space-x-3">
                                <div>
                                  <span className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center ring-8 ring-white">
                                    <svg className="h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  </span>
                                </div>
                                <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                                  <div>
                                    <p className="text-sm text-gray-500">
                                      Completed <span className="font-medium text-gray-900">{report.pcsFinished} pcs</span>
                                      {report.note && <span> - {report.note}</span>}
                                    </p>
                                  </div>
                                  <div className="text-right text-sm whitespace-nowrap text-gray-500">
                                    {formatDate(report.reportedAt || report.createdAt)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    </AuthWrapper>
  );
} 