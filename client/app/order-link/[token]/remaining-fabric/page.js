'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RemainingFabricPage({ params }) {
  const { token } = params;
  const router = useRouter();
  const [orderLink, setOrderLink] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [formData, setFormData] = useState({
    qtyRemaining: 0,
    photoUrl: '',
    note: '',
    isSubmitting: false,
    error: null,
    success: null,
  });

  // Fetch order link details
  useEffect(() => {
    const fetchOrderLink = async () => {
      try {
        setLoading(true);
        
        const response = await fetch(`/api/order-links/${token}`);
        
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || 'Failed to fetch order link');
        }
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.message || 'Invalid or expired order link');
        }
        
        setOrderLink(data.orderLink);
      } catch (err) {
        setError(err.message);
        console.error('Error fetching order link:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchOrderLink();
  }, [token]);

  // Handle file upload
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // For simplicity, we'll just store the file name
      // In a real app, you would upload to a server or cloud storage
      setFormData(prev => ({
        ...prev,
        photoUrl: file.name
      }));
    }
  };

  // Handle form change
  const handleChange = (e) => {
    const { name, value, type } = e.target;
    
    if (type === 'number') {
      // Ensure non-negative values
      const newValue = Math.max(0, parseInt(value, 10) || 0);
      
      setFormData(prev => ({
        ...prev,
        [name]: newValue
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setFormData(prev => ({ ...prev, isSubmitting: true, error: null, success: null }));
      
      // Validation
      if (formData.qtyRemaining < 0) {
        throw new Error('Remaining fabric quantity cannot be negative');
      }
      
      if (!formData.photoUrl) {
        throw new Error('Please upload a photo of the remaining fabric');
      }
      
      // Submit via API
      const response = await fetch(`/api/order-links/${token}/remaining-fabric`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          qtyRemaining: formData.qtyRemaining,
          photoUrl: formData.photoUrl,
          note: formData.note || null
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit remaining fabric report');
      }
      
      const data = await response.json();
      
      // Success - update form state
      setFormData({
        qtyRemaining: 0,
        photoUrl: '',
        note: '',
        isSubmitting: false,
        error: null,
        success: data.message || 'Remaining fabric report submitted successfully'
      });
      
      // Redirect back to the main order page after a short delay
      setTimeout(() => {
        router.push(`/order-link/${token}`);
      }, 3000);
      
    } catch (err) {
      setFormData(prev => ({
        ...prev,
        isSubmitting: false,
        error: err.message
      }));
      console.error('Error submitting remaining fabric report:', err);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">Loading order details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <div className="text-red-500 text-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-center text-gray-800 mb-4">Error Loading Order</h1>
          <p className="text-gray-600 text-center mb-6">{error}</p>
          <div className="text-center">
            <Link href="/" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              Go Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!orderLink) {
    return null;
  }

  const { Order, User } = orderLink;

  // Don't allow remaining fabric reports for orders that aren't completed
  const isCompleted = Order.status === 'completed';

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Remaining Fabric Report
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Order: {Order.orderNumber} | Assigned to: {User.name}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                Order.status === 'completed' ? 'bg-green-100 text-green-800' :
                Order.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                Order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {Order.status}
              </span>
              <Link
                href={`/order-link/${token}`}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Back to Order
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow overflow-hidden rounded-lg">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Remaining Fabric Report</h2>
            <p className="mt-1 text-sm text-gray-500">
              Report any remaining fabric after order completion to help with inventory management.
            </p>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
            {!isCompleted ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">Order Not Completed</h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p>
                        This order is not yet marked as completed. Remaining fabric should only be reported after the order is complete.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Form success/error messages */}
                {formData.success && (
                  <div className="bg-green-50 border border-green-200 rounded-md p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-green-800">{formData.success}</p>
                      </div>
                    </div>
                  </div>
                )}

                {formData.error && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-red-800">{formData.error}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Remaining Fabric Quantity */}
                <div>
                  <label htmlFor="qtyRemaining" className="block text-sm font-medium text-gray-700">
                    Remaining Fabric Quantity (cm) *
                  </label>
                  <div className="mt-1 flex rounded-md shadow-sm">
                    <input
                      type="number"
                      name="qtyRemaining"
                      id="qtyRemaining"
                      min="0"
                      value={formData.qtyRemaining}
                      onChange={handleChange}
                      className="flex-1 focus:ring-blue-500 focus:border-blue-500 block w-full min-w-0 rounded-md sm:text-sm border-gray-300"
                      required
                    />
                    <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                      cm
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Enter the total length of remaining fabric in centimeters.
                  </p>
                </div>

                {/* Photo Upload */}
                <div>
                  <label htmlFor="photoUrl" className="block text-sm font-medium text-gray-700">
                    Photo of Remaining Fabric *
                  </label>
                  <div className="mt-1 flex items-center">
                    <input
                      type="file"
                      id="photoUrl"
                      name="photoUrl"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="sr-only"
                    />
                    <label
                      htmlFor="photoUrl"
                      className="relative cursor-pointer bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                    >
                      <span>Upload a photo</span>
                    </label>
                    <p className="ml-3 text-sm text-gray-500">
                      {formData.photoUrl ? formData.photoUrl : 'No file selected'}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Take a photo of the remaining fabric with a measuring tape visible.
                  </p>
                </div>

                {/* Notes */}
                <div>
                  <label htmlFor="note" className="block text-sm font-medium text-gray-700">
                    Notes
                  </label>
                  <textarea
                    id="note"
                    name="note"
                    rows={3}
                    value={formData.note}
                    onChange={handleChange}
                    placeholder="Any notes about the remaining fabric..."
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  ></textarea>
                </div>

                {/* Submit Button */}
                <div>
                  <button
                    type="submit"
                    disabled={formData.isSubmitting || !formData.photoUrl}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {formData.isSubmitting ? 'Submitting...' : 'Submit Remaining Fabric Report'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} WMS System. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
} 