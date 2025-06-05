'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function OrderLinkPage({ params }) {
  const { token } = params;
  const [orderLink, setOrderLink] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('details');
  
  // Material Receipt Form State
  const [materialForm, setMaterialForm] = useState({
    confirmed: false,
    photoUrl: '',
    note: '',
    isSubmitting: false,
    error: null,
    success: null,
  });

  // Progress Report Form State
  const [progressForm, setProgressForm] = useState({
    pcsFinished: 0,
    photoUrl: '',
    resiPengiriman: '',
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
      setMaterialForm(prev => ({
        ...prev,
        photoUrl: file.name
      }));
    }
  };

  // Handle material receipt form change
  const handleMaterialFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setMaterialForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Submit material receipt
  const handleMaterialSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setMaterialForm(prev => ({ ...prev, isSubmitting: true, error: null, success: null }));
      
      // Validation
      if (!materialForm.confirmed) {
        throw new Error('You must confirm that you have received the materials');
      }
      
      // In a real implementation, you would upload the photo and then submit the form
      // For now, we'll just simulate a successful submission
      
      // Simulated API call - replace with actual endpoint when available
      setTimeout(() => {
        setMaterialForm({
          confirmed: false,
          photoUrl: '',
          note: '',
          isSubmitting: false,
          error: null,
          success: 'Material receipt confirmed successfully'
        });
      }, 1000);
      
    } catch (err) {
      setMaterialForm(prev => ({
        ...prev,
        isSubmitting: false,
        error: err.message
      }));
      console.error('Error submitting material receipt:', err);
    }
  };

  // Handle progress form change
  const handleProgressFormChange = (e) => {
    const { name, value, type } = e.target;
    
    if (type === 'number') {
      // Ensure pcsFinished is not more than remaining
      const remaining = orderLink?.Order ? orderLink.Order.targetPcs - orderLink.Order.completedPcs : 0;
      const newValue = Math.min(parseInt(value, 10) || 0, remaining);
      
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

  // Handle progress photo upload
  const handleProgressPhotoChange = (e) => {
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
      
      // Validation
      if (!progressForm.pcsFinished || progressForm.pcsFinished <= 0) {
        throw new Error('Completed pieces must be greater than 0');
      }
      
      // Submit progress report via API
      const response = await fetch(`/api/order-links/${token}/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          pcsFinished: progressForm.pcsFinished,
          photoUrl: progressForm.photoUrl || null,
          resiPengiriman: progressForm.resiPengiriman || null,
          note: progressForm.note || null
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit progress report');
      }
      
      const data = await response.json();
      
      // Success - reset form and refresh order link data
      setProgressForm({
        pcsFinished: 0,
        photoUrl: '',
        resiPengiriman: '',
        note: '',
        isSubmitting: false,
        error: null,
        success: data.message || 'Progress report submitted successfully'
      });
      
      // Refresh order link data
      fetchOrderLink();
      
    } catch (err) {
      setProgressForm(prev => ({
        ...prev,
        isSubmitting: false,
        error: err.message
      }));
      console.error('Error submitting progress report:', err);
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

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Order: {Order.orderNumber}</h1>
              <p className="mt-1 text-sm text-gray-600">
                Assigned to: {User.name}
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
              <span className="text-sm text-gray-500">
                Due: {formatDate(Order.dueDate)}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('details')}
              className={`py-4 px-6 border-b-2 font-medium text-sm ${
                activeTab === 'details'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Order Details
            </button>
            <button
              onClick={() => setActiveTab('materials')}
              className={`py-4 px-6 border-b-2 font-medium text-sm ${
                activeTab === 'materials'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Material Receipt
            </button>
            <button
              onClick={() => setActiveTab('progress')}
              className={`py-4 px-6 border-b-2 font-medium text-sm ${
                activeTab === 'progress'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Progress Report
            </button>
            <Link 
              href={`/order-link/${token}/remaining-fabric`}
              className="py-4 px-6 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              Remaining Fabric
            </Link>
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Order Details Tab */}
        {activeTab === 'details' && (
          <div className="bg-white shadow overflow-hidden rounded-lg">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Order Details</h2>
              <p className="mt-1 text-sm text-gray-500">Details and specifications for this order.</p>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Order Number</dt>
                  <dd className="mt-1 text-sm text-gray-900">{Order.orderNumber}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Status</dt>
                  <dd className="mt-1 text-sm">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      Order.status === 'completed' ? 'bg-green-100 text-green-800' :
                      Order.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                      Order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {Order.status}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Target Quantity</dt>
                  <dd className="mt-1 text-sm text-gray-900">{Order.targetPcs} pcs</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Due Date</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatDate(Order.dueDate)}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Description</dt>
                  <dd className="mt-1 text-sm text-gray-900">{Order.description || 'No description provided'}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Customer Note</dt>
                  <dd className="mt-1 text-sm text-gray-900">{Order.customerNote || 'No customer notes'}</dd>
                </div>
              </dl>
            </div>
          </div>
        )}

        {/* Material Receipt Tab */}
        {activeTab === 'materials' && (
          <div className="bg-white shadow overflow-hidden rounded-lg">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Material Receipt Confirmation</h2>
              <p className="mt-1 text-sm text-gray-500">Please confirm when you receive the materials for this order.</p>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
              {/* Material Receipt Form */}
              <form onSubmit={handleMaterialSubmit} className="space-y-6">
                {/* Form success/error messages */}
                {materialForm.success && (
                  <div className="bg-green-50 border border-green-200 rounded-md p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-green-800">{materialForm.success}</p>
                      </div>
                    </div>
                  </div>
                )}

                {materialForm.error && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-red-800">{materialForm.error}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Photo Upload */}
                <div>
                  <label htmlFor="photoUrl" className="block text-sm font-medium text-gray-700">
                    Receipt Photo
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
                      {materialForm.photoUrl ? materialForm.photoUrl : 'No file selected'}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Take a photo of the received materials to confirm receipt.
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
                    value={materialForm.note}
                    onChange={handleMaterialFormChange}
                    placeholder="Any notes about the received materials..."
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  ></textarea>
                </div>

                {/* Confirmation Checkbox */}
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="confirmed"
                      name="confirmed"
                      type="checkbox"
                      checked={materialForm.confirmed}
                      onChange={handleMaterialFormChange}
                      className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="confirmed" className="font-medium text-gray-700">
                      I confirm that I have received all materials for this order
                    </label>
                    <p className="text-gray-500">
                      By checking this box, you confirm that all required materials for this order have been received.
                    </p>
                  </div>
                </div>

                {/* Submit Button */}
                <div>
                  <button
                    type="submit"
                    disabled={materialForm.isSubmitting || !materialForm.confirmed}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {materialForm.isSubmitting ? 'Submitting...' : 'Confirm Material Receipt'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Progress Report Tab */}
        {activeTab === 'progress' && (
          <div className="bg-white shadow overflow-hidden rounded-lg">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Progress Report</h2>
              <p className="mt-1 text-sm text-gray-500">Report your production progress on this order.</p>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
              {/* Current Progress */}
              <div className="mb-6">
                <h3 className="text-base font-medium text-gray-900 mb-2">Current Progress</h3>
                <div className="flex items-center mb-2">
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2 flex-grow">
                    <div 
                      className={`h-2.5 rounded-full ${
                        Order.completedPcs / Order.targetPcs < 0.3 
                          ? 'bg-red-500' 
                          : Order.completedPcs / Order.targetPcs < 0.7 
                            ? 'bg-yellow-500' 
                            : 'bg-green-500'
                      }`} 
                      style={{ width: `${Math.round((Order.completedPcs / Order.targetPcs) * 100)}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {Math.round((Order.completedPcs / Order.targetPcs) * 100)}% ({Order.completedPcs}/{Order.targetPcs} pcs)
                  </span>
                </div>
              </div>

              {/* Progress Report Form */}
              <form onSubmit={handleProgressSubmit} className="space-y-6">
                {/* Form success/error messages */}
                {progressForm.success && (
                  <div className="bg-green-50 border border-green-200 rounded-md p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-green-800">{progressForm.success}</p>
                      </div>
                    </div>
                  </div>
                )}

                {progressForm.error && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-red-800">{progressForm.error}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Completed Pieces */}
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
                      max={Order.targetPcs - Order.completedPcs}
                      value={progressForm.pcsFinished}
                      onChange={handleProgressFormChange}
                      className="flex-1 focus:ring-blue-500 focus:border-blue-500 block w-full min-w-0 rounded-md sm:text-sm border-gray-300"
                      required
                    />
                    <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                      pcs
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Maximum: {Order.targetPcs - Order.completedPcs} pcs remaining
                  </p>
                </div>

                {/* Progress Photo */}
                <div>
                  <label htmlFor="progressPhoto" className="block text-sm font-medium text-gray-700">
                    Progress Photo
                  </label>
                  <div className="mt-1 flex items-center">
                    <input
                      type="file"
                      id="progressPhoto"
                      name="progressPhoto"
                      accept="image/*"
                      onChange={handleProgressPhotoChange}
                      className="sr-only"
                    />
                    <label
                      htmlFor="progressPhoto"
                      className="relative cursor-pointer bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                    >
                      <span>Upload a photo</span>
                    </label>
                    <p className="ml-3 text-sm text-gray-500">
                      {progressForm.photoUrl ? progressForm.photoUrl : 'No file selected'}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Take a photo of the completed pieces to verify progress.
                  </p>
                </div>

                {/* Shipping Receipt (optional) */}
                <div>
                  <label htmlFor="resiPengiriman" className="block text-sm font-medium text-gray-700">
                    Shipping Receipt Number (Optional)
                  </label>
                  <input
                    type="text"
                    name="resiPengiriman"
                    id="resiPengiriman"
                    value={progressForm.resiPengiriman}
                    onChange={handleProgressFormChange}
                    className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    placeholder="Enter shipping receipt/tracking number"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    If you&apos;ve shipped the completed pieces, enter the tracking number.
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
                    value={progressForm.note}
                    onChange={handleProgressFormChange}
                    className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    placeholder="Add any notes about this progress update"
                  ></textarea>
                </div>

                {/* Submit Button */}
                <div>
                  <button
                    type="submit"
                    disabled={progressForm.isSubmitting || progressForm.pcsFinished <= 0}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {progressForm.isSubmitting ? 'Submitting...' : 'Submit Progress Report'}
                  </button>
                </div>
              </form>

              {/* Progress History */}
              <div className="mt-10">
                <h3 className="text-base font-medium text-gray-900 mb-4">Progress History</h3>
                {Order.ProgressReports && Order.ProgressReports.length > 0 ? (
                  <div className="flow-root">
                    <ul className="-mb-8">
                      {Order.ProgressReports.map((report, reportIdx) => (
                        <li key={report.id}>
                          <div className="relative pb-8">
                            {reportIdx !== Order.ProgressReports.length - 1 ? (
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
                                  {report.resiPengiriman && (
                                    <p className="text-xs text-gray-500 mt-1">
                                      Shipping receipt: <span className="font-medium">{report.resiPengiriman}</span>
                                    </p>
                                  )}
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
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">No progress reports yet.</p>
                )}
              </div>
            </div>
          </div>
        )}
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