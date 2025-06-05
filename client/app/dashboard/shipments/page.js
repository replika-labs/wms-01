'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/app/components/DashboardLayout';
import AuthWrapper from '@/app/components/AuthWrapper';

export default function ShipmentsPage() {
  const router = useRouter();
  const [shipments, setShipments] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    orderId: '',
    trackingNumber: '',
    courier: '',
    deliveryDate: '',
    notes: '',
  });
  
  // Filter state
  const [filter, setFilter] = useState({
    orderId: '',
    dateFrom: '',
    dateTo: '',
    search: '',
  });
  
  // Submit state
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Clipboard state
  const [copyStatus, setCopyStatus] = useState({});

  // Fetch shipments
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No authentication token found');
        }

        // Build query params for filter
        const queryParams = new URLSearchParams();
        if (filter.orderId) queryParams.append('orderId', filter.orderId);
        if (filter.dateFrom) queryParams.append('dateFrom', filter.dateFrom);
        if (filter.dateTo) queryParams.append('dateTo', filter.dateTo);
        if (filter.search) queryParams.append('search', filter.search);

        // Fetch shipments
        const shipmentsResponse = await fetch(`/api/shipments?${queryParams.toString()}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!shipmentsResponse.ok) {
          throw new Error('Failed to fetch shipments');
        }

        const shipmentsData = await shipmentsResponse.json();
        setShipments(Array.isArray(shipmentsData) ? shipmentsData : []);

        // Fetch orders for dropdown
        const ordersResponse = await fetch('/api/orders-management/list?status=processing,created', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!ordersResponse.ok) {
          throw new Error('Failed to fetch orders');
        }

        const ordersData = await ordersResponse.json();
        // orders-management returns {orders: [...]} structure
        const orders = ordersData.orders || [];
        setOrders(Array.isArray(orders) ? orders : []);

      } catch (err) {
        setError(err.message);
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [filter]);

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // Handle filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilter({
      ...filter,
      [name]: value
    });
  };

  // Reset filters
  const resetFilters = () => {
    setFilter({
      orderId: '',
      dateFrom: '',
      dateTo: '',
      search: '',
    });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setIsSubmitting(true);
      setError(null);
      setSuccess(null);
      
      // Validate form data
      if (!formData.orderId) {
        throw new Error('Please select an order');
      }
      
      if (!formData.trackingNumber) {
        throw new Error('Tracking number is required');
      }
      
      if (!formData.courier) {
        throw new Error('Courier is required');
      }
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      // Submit form data
      const response = await fetch('/api/shipments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create shipment');
      }
      
      // Reset form and fetch updated data
      setFormData({
        orderId: '',
        trackingNumber: '',
        courier: '',
        deliveryDate: '',
        notes: '',
      });
      
      setShowForm(false);
      setSuccess('Shipment created successfully');
      
      // Refresh data
      setTimeout(() => {
        setFilter({ ...filter }); // Trigger re-fetch
      }, 500);
      
    } catch (err) {
      setError(err.message);
      console.error('Error creating shipment:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to copy tracking link to clipboard
  const copyTrackingLink = async (shipmentId, trackingNumber) => {
    try {
      // Check if clipboard API is available
      if (!navigator.clipboard) {
        throw new Error('Clipboard API not available in your browser');
      }
      
      const trackingLink = `https://www.aftership.com/track/${trackingNumber}`;
      await navigator.clipboard.writeText(trackingLink);
      
      // Set success status for this specific shipment
      setCopyStatus({
        ...copyStatus,
        [shipmentId]: { success: true, message: 'Link copied!' }
      });
      
      // Clear status after 3 seconds
      setTimeout(() => {
        setCopyStatus(prev => {
          const newStatus = { ...prev };
          delete newStatus[shipmentId];
          return newStatus;
        });
      }, 3000);
    } catch (err) {
      console.error('Failed to copy:', err);
      
      // Set error status for this specific shipment
      setCopyStatus({
        ...copyStatus,
        [shipmentId]: { success: false, message: 'Failed to copy link' }
      });
      
      // Clear status after 3 seconds
      setTimeout(() => {
        setCopyStatus(prev => {
          const newStatus = { ...prev };
          delete newStatus[shipmentId];
          return newStatus;
        });
      }, 3000);
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

  return (
    <AuthWrapper>
      <DashboardLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Shipments</h1>
              <p className="mt-1 text-sm text-gray-600">
                Manage product shipments
              </p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {showForm ? 'Cancel' : 'Add Shipment'}
            </button>
          </div>

          {/* Error and Success Messages */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
              <span className="block sm:inline">{error}</span>
            </div>
          )}
          
          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4">
              <span className="block sm:inline">{success}</span>
            </div>
          )}

          {/* Form Panel */}
          {showForm && (
            <div className="bg-white shadow sm:rounded-lg mb-6">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Add Shipment
                </h3>
                <div className="mt-5">
                  <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                      {/* Order Selection */}
                      <div className="sm:col-span-3">
                        <label htmlFor="orderId" className="block text-sm font-medium text-gray-700">
                          Order *
                        </label>
                        <select
                          id="orderId"
                          name="orderId"
                          value={formData.orderId}
                          onChange={handleChange}
                          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                          required
                        >
                          <option value="">Select Order</option>
                          {orders.map((order) => (
                            <option key={order.id} value={order.id}>
                              {order.orderNumber} - {order.status}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Tracking Number */}
                      <div className="sm:col-span-3">
                        <label htmlFor="trackingNumber" className="block text-sm font-medium text-gray-700">
                          Tracking Number *
                        </label>
                        <input
                          type="text"
                          name="trackingNumber"
                          id="trackingNumber"
                          value={formData.trackingNumber}
                          onChange={handleChange}
                          placeholder="Enter tracking/receipt number"
                          className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                          required
                        />
                      </div>

                      {/* Courier */}
                      <div className="sm:col-span-3">
                        <label htmlFor="courier" className="block text-sm font-medium text-gray-700">
                          Courier *
                        </label>
                        <input
                          type="text"
                          name="courier"
                          id="courier"
                          value={formData.courier}
                          onChange={handleChange}
                          placeholder="Enter courier name"
                          className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                          required
                        />
                      </div>

                      {/* Delivery Date */}
                      <div className="sm:col-span-3">
                        <label htmlFor="deliveryDate" className="block text-sm font-medium text-gray-700">
                          Delivery Date
                        </label>
                        <input
                          type="date"
                          name="deliveryDate"
                          id="deliveryDate"
                          value={formData.deliveryDate}
                          onChange={handleChange}
                          className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                        />
                      </div>

                      {/* Notes */}
                      <div className="sm:col-span-6">
                        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                          Notes
                        </label>
                        <textarea
                          id="notes"
                          name="notes"
                          rows="3"
                          value={formData.notes}
                          onChange={handleChange}
                          className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                          placeholder="Additional information about this shipment"
                        ></textarea>
                      </div>
                    </div>

                    <div className="mt-5 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setShowForm(false)}
                        className="mr-3 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        {isSubmitting ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Filters
              </h3>
              <div className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-6">
                {/* Order Filter */}
                <div className="sm:col-span-2">
                  <label htmlFor="orderFilter" className="block text-sm font-medium text-gray-700">
                    Order
                  </label>
                  <select
                    id="orderFilter"
                    name="orderId"
                    value={filter.orderId}
                    onChange={handleFilterChange}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  >
                    <option value="">All Orders</option>
                    {orders.map((order) => (
                      <option key={order.id} value={order.id}>
                        {order.orderNumber}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date From */}
                <div className="sm:col-span-1">
                  <label htmlFor="dateFrom" className="block text-sm font-medium text-gray-700">
                    Date From
                  </label>
                  <input
                    type="date"
                    name="dateFrom"
                    id="dateFrom"
                    value={filter.dateFrom}
                    onChange={handleFilterChange}
                    className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  />
                </div>

                {/* Date To */}
                <div className="sm:col-span-1">
                  <label htmlFor="dateTo" className="block text-sm font-medium text-gray-700">
                    Date To
                  </label>
                  <input
                    type="date"
                    name="dateTo"
                    id="dateTo"
                    value={filter.dateTo}
                    onChange={handleFilterChange}
                    className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  />
                </div>

                {/* Search */}
                <div className="sm:col-span-4">
                  <label htmlFor="search" className="block text-sm font-medium text-gray-700">
                    Search
                  </label>
                  <input
                    type="text"
                    name="search"
                    id="search"
                    value={filter.search}
                    onChange={handleFilterChange}
                    className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    placeholder="Search by tracking number or courier"
                  />
                </div>

                {/* Reset Button */}
                <div className="sm:col-span-2 flex items-end">
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Reset Filters
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Shipments Table */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="overflow-x-auto">
              {loading ? (
                <div className="py-12 flex justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Order
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tracking Number
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Courier
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created Date
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Delivery Date
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {shipments.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">
                          No shipments found
                        </td>
                      </tr>
                    ) : (
                      shipments.map((shipment) => (
                        <tr key={shipment.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {shipment.Order ? shipment.Order.orderNumber : 'Unknown Order'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {shipment.trackingNumber}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {shipment.courier}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(shipment.createdAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(shipment.deliveryDate)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center">
                              <button
                                onClick={() => copyTrackingLink(shipment.id, shipment.trackingNumber)}
                                className="text-blue-600 hover:text-blue-900 mr-3 flex items-center"
                                title="Copy tracking link"
                              >
                                <span>Copy Link</span>
                                {copyStatus[shipment.id] && (
                                  <span className={`ml-2 text-xs ${copyStatus[shipment.id].success ? 'text-green-600' : 'text-red-600'}`}>
                                    {copyStatus[shipment.id].message}
                                  </span>
                                )}
                              </button>
                              <button
                                onClick={() => {
                                  // Open tracking link in new window
                                  window.open(`https://www.aftership.com/track/${shipment.trackingNumber}`, '_blank');
                                }}
                                className="text-green-600 hover:text-green-900"
                                title="Track this shipment"
                              >
                                Track
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </DashboardLayout>
    </AuthWrapper>
  );
} 