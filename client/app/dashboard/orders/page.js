'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/app/components/DashboardLayout';
import AuthWrapper from '@/app/components/AuthWrapper';

const OrderList = () => {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState({
    status: '',
    priority: '',
    search: '',
    dateRange: {
      start: '',
      end: ''
    }
  });
  const [statusError, setStatusError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Fetch orders
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Build query string from filters
      const queryParams = new URLSearchParams();
      if (filter.status) queryParams.append('status', filter.status);
      if (filter.priority) queryParams.append('priority', filter.priority);
      if (filter.search) queryParams.append('search', filter.search);
      if (filter.dateRange.start) queryParams.append('startDate', filter.dateRange.start);
      if (filter.dateRange.end) queryParams.append('endDate', filter.dateRange.end);

      const response = await fetch(`/api/orders-management/list?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }

      const data = await response.json();
      // orders-management returns {orders: [...]} structure
      const orders = data.orders || [];
      if (Array.isArray(orders)) {
        setOrders(orders);
      } else {
        setOrders([]);
      }
    } catch (err) {
      setError(err.message);
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [filter]);

  // Handle status change
  const handleStatusChange = async (orderId, newStatus) => {
    try {
      setStatusError(null);
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/orders-management/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setStatusError({ orderId, message: data.message });
        return;
      }
      
      // Update order status in local state
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      );
      
      // Show success message
      setSuccessMessage(data.message || 'Status updated successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error updating status:', err);
      setStatusError({ orderId, message: err.message });
    }
  };

  // Handle delete
  const handleDelete = async (orderId) => {
    if (!window.confirm('Are you sure you want to delete this order?')) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      const response = await fetch(`/api/orders-management/${orderId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to delete order');

      // Refresh orders list
      fetchOrders();
    } catch (err) {
      setError(err.message);
      console.error('Error deleting order:', err);
    }
  };

  // Get status badge color
  const getStatusColor = (status) => {
    const colors = {
      created: 'bg-gray-100 text-gray-800',
      confirmed: 'bg-blue-100 text-blue-800',
      processing: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      shipped: 'bg-purple-100 text-purple-800',
      delivered: 'bg-indigo-100 text-indigo-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // Get priority badge color
  const getPriorityColor = (priority) => {
    const colors = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-blue-100 text-blue-800',
      high: 'bg-yellow-100 text-yellow-800',
      urgent: 'bg-red-100 text-red-800'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  // Get progress color based on percentage
  const getProgressColor = (percentage) => {
    if (percentage < 30) return 'bg-red-500';
    if (percentage < 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  // Calculate progress
  const calculateProgress = (order) => {
    if (!order.targetPcs || order.targetPcs === 0) return 0;
    return Math.round((order.completedPcs / order.targetPcs) * 100);
  };

  // Check if order is overdue
  const isOverdue = (order) => {
    if (!order.dueDate) return false;
    return new Date() > new Date(order.dueDate) && 
           !['completed', 'delivered', 'cancelled'].includes(order.status);
  };

  // Check if order can be cancelled
  const canBeCancelled = (order) => {
    return ['created', 'confirmed', 'processing'].includes(order.status);
  };

  // Calculate order summary for target column
  const getOrderSummary = (order) => {
    const productCount = order.Products ? order.Products.length : 0;
    const totalQuantity = order.targetPcs || 0;
    return {
      productCount,
      totalQuantity
    };
  };

  // Handle OrderLink generation and copy
  const handleOrderLink = async (orderId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Show loading state
      setSuccessMessage('Generating OrderLink...');

      // Direct OrderLink creation - no tailor fetching needed
      const response = await fetch('/api/order-links', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          orderId: orderId,
          expireAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to generate OrderLink');
      }

      // Generate the complete URL with token
      const orderLinkUrl = `${window.location.origin}/order-progress/${data.token}`;
      
      // Copy to clipboard
      await navigator.clipboard.writeText(orderLinkUrl);
      
      setSuccessMessage('OrderLink copied to clipboard! (expires in 30 days) - Anyone can use this link to submit progress');
      setTimeout(() => setSuccessMessage(''), 5000);

    } catch (err) {
      console.error('Error generating OrderLink:', err);
      setError('Failed to generate OrderLink: ' + err.message);
      setTimeout(() => setError(''), 8000);
    }
  };

  return (
    <AuthWrapper>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
            <button
              onClick={() => router.push('/dashboard/orders/create')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Create Order
            </button>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative">
              <span className="block sm:inline">{successMessage}</span>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Filters</h3>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={filter.status}
                    onChange={(e) => setFilter(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">All Status</option>
                    <option value="created">Created</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="processing">Processing</option>
                    <option value="completed">Completed</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={filter.priority}
                    onChange={(e) => setFilter(prev => ({ ...prev, priority: e.target.value }))}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">All Priority</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                  <input
                    type="text"
                    value={filter.search}
                    onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value }))}
                    placeholder="Search order number..."
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={filter.dateRange.start}
                      onChange={(e) => setFilter(prev => ({
                        ...prev,
                        dateRange: { ...prev.dateRange, start: e.target.value }
                      }))}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input
                      type="date"
                      value={filter.dateRange.end}
                      onChange={(e) => setFilter(prev => ({
                        ...prev,
                        dateRange: { ...prev.dateRange, end: e.target.value }
                      }))}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            /* Orders Table */
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Order Number
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Products
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Target
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Progress
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Priority
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Due Date
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {orders.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                          No orders found
                        </td>
                      </tr>
                    ) : (
                      orders.map((order) => (
                        <tr key={order.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {order.orderNumber}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {order.Products && order.Products.length > 0 ? (
                              order.Products.map((product) => (
                                <div key={product.id} className="mb-1">
                                  {product.name} <span className="text-xs text-gray-500">({product.OrderProduct.quantity} {product.unit})</span>
                                </div>
                              ))
                            ) : (
                              <span className="text-xs text-gray-400">No products</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="space-y-1">
                              <div className="text-xs text-blue-600 font-medium">
                                Selected Products: {getOrderSummary(order).productCount} items
                              </div>
                              <div className="text-sm text-gray-900 font-medium">
                                Total Quantity: {getOrderSummary(order).totalQuantity} pcs
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex flex-col w-32">
                              <div className="flex justify-between mb-1">
                                <span className="text-xs text-gray-700">{calculateProgress(order)}%</span>
                                <span className="text-xs text-gray-700">{order.completedPcs || 0}/{order.targetPcs} pcs</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full ${
                                    calculateProgress(order) < 30 
                                      ? 'bg-red-500' 
                                      : calculateProgress(order) < 70 
                                        ? 'bg-yellow-500' 
                                        : 'bg-green-500'
                                  }`} 
                                  style={{ width: `${calculateProgress(order)}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <select
                              value={order.status}
                              onChange={(e) => handleStatusChange(order.id, e.target.value)}
                              className={`text-sm rounded-full px-3 py-1 font-medium ${
                                getStatusColor(order.status)
                              }`}
                            >
                              <option value="created">Created</option>
                              <option value="confirmed">Confirmed</option>
                              <option value="processing">Processing</option>
                              <option value="completed">Completed</option>
                              <option value="shipped">Shipped</option>
                              <option value="delivered">Delivered</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                            {statusError && statusError.orderId === order.id && (
                              <p className="mt-1 text-xs text-red-600">{statusError.message}</p>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              getPriorityColor(order.priority)
                            }`}>
                              {order.priority}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(order.dueDate).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => router.push(`/dashboard/orders/${order.id}`)}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                View
                              </button>
                              <button
                                onClick={() => router.push(`/dashboard/orders/${order.id}/edit`)}
                                className="text-yellow-600 hover:text-yellow-900"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleOrderLink(order.id)}
                                className="text-green-600 hover:text-green-900"
                                title="Copy order link for tailor"
                              >
                                OrderLink
                              </button>
                              {canBeCancelled(order) && (
                                <button
                                  onClick={() => handleDelete(order.id)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    </AuthWrapper>
  );
};

export default OrderList; 