'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/app/components/DashboardLayout';
import AuthWrapper from '@/app/components/AuthWrapper';
import ProductSelector from '@/app/components/ProductSelector';
import ordersManagementAPI from '@/app/services/OrdersManagementAPI';

export default function OrdersManagement() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [tailors, setTailors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Optimized pagination state
  const [pagination, setPagination] = useState({
    total: 0,
    pages: 0,
    current: 1,
    limit: 10
  });

  // Filter counts for UI
  const [filterCounts, setFilterCounts] = useState({
    statusCounts: {},
    priorityCounts: {}
  });

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    customerNote: '',
    dueDate: '',
    description: '',
    priority: 'MEDIUM',
    status: 'CREATED',
    workerContactId: '',
    products: []
  });

  // Filter states
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    search: '',
    dateFrom: '',
    dateTo: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  // Performance optimization states
  const [updating, setUpdating] = useState(new Set()); // Track which orders are being updated
  const [refreshingTailors, setRefreshingTailors] = useState(false);

  // Optimized fetch orders using new API
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      // Prepare parameters for optimized API
      const params = {
        page: pagination.current,
        limit: pagination.limit,
        status: filters.status,
        priority: filters.priority,
        search: filters.search,
        startDate: filters.dateFrom,
        endDate: filters.dateTo,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder
      };

      // Use optimized API with server-side processing
      const data = await ordersManagementAPI.getOrdersList(params);

      setOrders(data.orders);
      setPagination(data.pagination);
      setFilterCounts(data.filters);

      // Preload next page for better UX
      ordersManagementAPI.preloadNextPage(params);

    } catch (err) {
      setError('Error loading orders: ' + err.message);
      console.error('Failed to fetch orders:', err);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.current, pagination.limit]);

  // Optimized fetch tailors using cached API
  const fetchTailors = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('No authentication token for loading tailors');
        setTailors([]);
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
          setTailors([]);
        }
      } else {
        console.error('Tailors API error:', response.status, response.statusText);
        setTailors([]);
      }
    } catch (err) {
      console.error('Error loading tailors:', err.message);
      // Fallback to empty array on error
      setTailors([]);
    }
  };

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

  // Split into two separate useEffect hooks
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    fetchTailors();
  }, []);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Optimized status change with optimistic updates
  const handleStatusChange = async (orderId, newStatus) => {
    try {
      // Add to updating set for UI feedback
      setUpdating(prev => new Set(prev).add(orderId));

      // Optimistic update - update UI immediately
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === orderId
            ? { ...order, status: newStatus, updatedAt: new Date().toISOString() }
            : order
        )
      );

      // Use optimized API
      await ordersManagementAPI.updateOrderStatus(orderId, newStatus);

      setSuccess(`Order status updated to ${newStatus}`);
      setTimeout(() => setSuccess(''), 3000);

    } catch (err) {
      // Revert optimistic update on error
      fetchOrders();
      setError('Failed to update status: ' + err.message);
      setTimeout(() => setError(''), 5000);
    } finally {
      // Remove from updating set
      setUpdating(prev => {
        const newSet = new Set(prev);
        newSet.delete(orderId);
        return newSet;
      });
    }
  };

  // Handle OrderLink generation
  const handleOrderLink = async (orderId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      setSuccess('Generating OrderLink...');

      // Find the order details to get tailor information
      const order = orders.find(o => o.id === orderId);
      if (!order) {
        throw new Error('Order not found');
      }

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

      // If tailor is assigned, offer to send WhatsApp message
      if (order.tailor && order.tailor.whatsappPhone) {
        const tailorName = order.tailor.name;
        const orderNumber = order.orderNumber;

        // Prepare WhatsApp message
        const whatsappMessage = encodeURIComponent(
          `Hi ${tailorName}! 👋\n\n` +
          `You have been assigned to work on Order ${orderNumber}.\n\n` +
          `📋 Order Details:\n` +
          `• Products: ${order.productCount || 0} items\n` +
          `• Total Quantity: ${order.targetPcs} pcs\n` +
          `• Priority: ${order.priority}\n` +
          `• Due Date: ${order.dueDate ? new Date(order.dueDate).toLocaleDateString() : 'Not specified'}\n\n` +
          `🔗 Progress Tracking Link:\n${orderLinkUrl}\n\n` +
          `Please use this link to submit your progress updates. The link expires in 30 days.\n\n` +
          `Thank you! 🙏`
        );

        const whatsappUrl = `https://wa.me/${order.tailor.whatsappPhone.replace(/\D/g, '')}?text=${whatsappMessage}`;

        // Ask user if they want to send WhatsApp message
        const sendWhatsApp = confirm(
          `OrderLink generated successfully!\n\n` +
          `Tailor "${tailorName}" is assigned to this order.\n` +
          `Would you like to send the OrderLink via WhatsApp?`
        );

        if (sendWhatsApp) {
          window.open(whatsappUrl, '_blank');
          setSuccess(`OrderLink sent to ${tailorName} via WhatsApp! Link also copied to clipboard.`);
        } else {
          setSuccess('OrderLink copied to clipboard! (expires in 30 days)');
        }
      } else {
        setSuccess('OrderLink copied to clipboard! (expires in 30 days) - No tailor assigned to send via WhatsApp');
      }

      setTimeout(() => setSuccess(''), 5000);

    } catch (err) {
      console.error('Error generating OrderLink:', err);
      setError('Failed to generate OrderLink: ' + err.message);
      setTimeout(() => setError(''), 8000);
    }
  };

  // Handle product changes
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

  // Create order using dedicated API
  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      if (!formData.dueDate) throw new Error('Due date is required');
      if (formData.products.length === 0) throw new Error('Please select at least one product');

      // Use dedicated orders-management API
      const result = await ordersManagementAPI.createOrder(formData);

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

      setShowCreateModal(false);
      resetForm();
      fetchOrders();
    } catch (err) {
      setError(err.message);
    }
  };

  // Update order using dedicated API
  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      // Use dedicated orders-management API
      const result = await ordersManagementAPI.updateOrder(selectedOrder.id, formData);

      // Handle stock warnings if any
      if (result.stockResults && result.stockResults.hasStockIssues) {
        const warnings = result.stockResults.warnings || [];
        const alerts = result.stockResults.alerts || [];

        if (warnings.length > 0 || alerts.length > 0) {
          const stockMessage = [
            ...warnings,
            ...alerts.map(alert => `Purchase alert updated for ${alert.materialName}`)
          ].join('; ');

          setSuccess(`Order updated successfully! Stock notifications: ${stockMessage}`);
        } else {
          setSuccess('Order updated successfully!');
        }
      } else {
        setSuccess('Order updated successfully!');
      }

      setShowEditModal(false);
      resetForm();
      fetchOrders();
    } catch (err) {
      setError('Failed to update order');
      setTimeout(() => setError(''), 3000);
    }
  };

  // Delete order using dedicated API
  const handleDelete = async (orderId) => {
    if (!confirm('Are you sure you want to delete this order?')) return;

    try {
      // Use dedicated orders-management API
      const result = await ordersManagementAPI.deleteOrder(orderId);

      setSuccess(result.message || 'Order deleted successfully!');
      fetchOrders();
    } catch (err) {
      setError(err.message);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      customerNote: '',
      dueDate: '',
      description: '',
      priority: 'MEDIUM',
      status: 'CREATED',
      workerContactId: '',
      products: []
    });
    setSelectedOrder(null);
  };

  // Open edit modal
  const openEditModal = async (order) => {
    try {
      // Get complete order details for editing
      const orderDetails = await ordersManagementAPI.getOrderDetails(order.id);

      setSelectedOrder(orderDetails);
      setFormData({
        customerNote: orderDetails.customerNote || '',
        dueDate: orderDetails.dueDate ? orderDetails.dueDate.split('T')[0] : '',
        description: orderDetails.description || '',
        priority: orderDetails.priority || 'MEDIUM',
        status: orderDetails.status || 'CREATED',
        workerContactId: orderDetails.workerContactId || '',
        products: orderDetails.Products?.map(p => ({
          productId: p.id,
          quantity: p.OrderProduct.qty
        })) || []
      });
      setShowEditModal(true);
    } catch (err) {
      setError('Failed to load order details: ' + err.message);
    }
  };

  // Open view modal
  const openViewModal = async (order) => {
    try {
      // Get complete order details for viewing
      const orderDetails = await ordersManagementAPI.getOrderDetails(order.id);
      setSelectedOrder(orderDetails);
      setShowViewModal(true);
    } catch (err) {
      setError('Failed to load order details: ' + err.message);
    }
  };

  // Get status badge color
  const getStatusColor = (status) => {
    const colors = {
      'CREATED': 'bg-blue-100 text-blue-800',
      'CONFIRMED': 'bg-green-100 text-green-800',
      'PROCESSING': 'bg-yellow-100 text-yellow-800',
      'COMPLETED': 'bg-purple-100 text-purple-800',
      'SHIPPED': 'bg-indigo-100 text-indigo-800',
      'DELIVERED': 'bg-emerald-100 text-emerald-800',
      'CANCELLED': 'bg-red-100 text-red-800',
      'NEED_MATERIAL': 'bg-orange-100 text-orange-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // Get priority color
  const getPriorityColor = (priority) => {
    const colors = {
      'LOW': 'bg-gray-100 text-gray-800',
      'MEDIUM': 'bg-blue-100 text-blue-800',
      'HIGH': 'bg-orange-100 text-orange-800',
      'URGENT': 'bg-red-100 text-red-800'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  // Format products list with quantities
  const formatProductsList = (products) => {
    if (!products || products.length === 0) return 'No products';

    return products.map(product =>
      `${product.name} (${product.OrderProduct.qty})`
    ).join(', ');
  };

  // Format products with quantities for table display
  const formatProductsDisplay = (products) => {
    if (!products || products.length === 0) {
      return { displayText: 'No products', detailText: '' };
    }

    const maxDisplay = 2; // Show first 2 products
    const displayProducts = products.slice(0, maxDisplay);
    const remainingCount = products.length - maxDisplay;

    const displayText = displayProducts
      .map(product => `${product.name} (${product.OrderProduct.qty}pcs)`)
      .join(', ');

    const moreText = remainingCount > 0 ? ` +${remainingCount} more` : '';

    return {
      displayText: displayText + moreText,
      detailText: products.map(p => `${p.name}: ${p.OrderProduct.qty}pcs`).join(' | ')
    };
  };

  // Server-side pagination - orders array already contains the correct page
  const paginatedOrders = orders;

  return (
    <AuthWrapper>
      <DashboardLayout>
        <div className="min-h-screen bg-gray-50 p-6">
          {/* Header */}
          <div className="mb-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Orders Management</h1>
                <p className="mt-2 text-gray-600">Advanced order management with multiple products support</p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => router.push('/dashboard/orders-management/create')}
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create New Order
                </button>
              </div>
            </div>
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

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Filters & Search</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <input
                  type="text"
                  placeholder="Order number, customer note..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">All Status</option>
                  <option value="CREATED">Created</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="PROCESSING">Processing</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="SHIPPED">Shipped</option>
                  <option value="DELIVERED">Delivered</option>
                  <option value="CANCELLED">Cancelled</option>
                  <option value="NEED_MATERIAL">Need Material</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={filters.priority}
                  onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">All Priority</option>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">
                  Orders ({pagination.total} total)
                </h3>
                <div className="text-sm text-gray-600">
                  Page {pagination.current} of {pagination.pages}
                  {pagination.total > 0 && (
                    <span className="ml-2">
                      ({((pagination.current - 1) * pagination.limit) + 1}-{Math.min(pagination.current * pagination.limit, pagination.total)})
                    </span>
                  )}
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Order Details
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Products & Quantities
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status & Priority
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Progress
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tailor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Due Date
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {order.orderNumber}
                            </div>
                            <div className="text-sm text-gray-500 max-w-xs truncate">
                              {order.description || 'No description'}
                            </div>
                            {order.customerNote && (
                              <div className="text-xs text-blue-600 max-w-xs truncate">
                                Note: {order.customerNote}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            <span className="font-medium">
                              {order.productCount || 0} products
                            </span>
                            <div className="text-xs text-gray-500">
                              Total: {order.targetPcs} pcs
                            </div>
                            {order.productCount > 0 && (
                              <div className="text-xs text-gray-400 mt-1">
                                {order.productCount} items selected
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-2">
                            <select
                              value={order.status}
                              onChange={(e) => handleStatusChange(order.id, e.target.value)}
                              className={`text-xs rounded-full px-3 py-1 font-medium border-0 focus:ring-2 focus:ring-blue-500 ${getStatusColor(order.status)}`}
                            >
                              <option value="CREATED">Created</option>
                              <option value="CONFIRMED">Confirmed</option>
                              <option value="PROCESSING">Processing</option>
                              <option value="COMPLETED">Completed</option>
                              <option value="SHIPPED">Shipped</option>
                              <option value="DELIVERED">Delivered</option>
                              <option value="CANCELLED">Cancelled</option>
                              <option value="NEED_MATERIAL">Need Material</option>
                            </select>
                            <br />
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(order.priority)}`}>
                              {order.priority}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {order.completedPcs} / {order.targetPcs}
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all"
                              style={{
                                width: `${order.targetPcs > 0 ? (order.completedPcs / order.targetPcs) * 100 : 0}%`
                              }}
                            ></div>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {order.targetPcs > 0 ? Math.round((order.completedPcs / order.targetPcs) * 100) : 0}% complete
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {order.tailor ? (
                              <div>
                                <div className="font-medium">{order.tailor.name}</div>
                                {order.tailor.whatsappPhone && (
                                  <a
                                    href={`https://wa.me/${order.tailor.whatsappPhone.replace(/\D/g, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-green-600 hover:text-green-800"
                                  >
                                    WhatsApp
                                  </a>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs">No tailor assigned</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {order.dueDate ? new Date(order.dueDate).toLocaleDateString() : 'No due date'}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => router.push(`/dashboard/orders-management/${order.id}`)}
                              className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                              View
                            </button>
                            <button
                              onClick={() => router.push(`/dashboard/orders-management/${order.id}/edit`)}
                              className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleOrderLink(order.id)}
                              className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                              title="Generate OrderLink for tailor"
                            >
                              OrderLink
                            </button>
                            <button
                              onClick={() => handleDelete(order.id)}
                              className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Server-side Pagination */}
            {pagination.pages > 1 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, current: Math.max(prev.current - 1, 1) }))}
                    disabled={pagination.current === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, current: Math.min(prev.current + 1, prev.pages) }))}
                    disabled={pagination.current === pagination.pages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing <span className="font-medium">{((pagination.current - 1) * pagination.limit) + 1}</span> to{' '}
                      <span className="font-medium">{Math.min(pagination.current * pagination.limit, pagination.total)}</span> of{' '}
                      <span className="font-medium">{pagination.total}</span> results
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      {Array.from({ length: Math.min(pagination.pages, 10) }, (_, i) => {
                        // Show first 5 and last 5 pages if more than 10 pages
                        let pageNum;
                        if (pagination.pages <= 10) {
                          pageNum = i + 1;
                        } else if (pagination.current <= 5) {
                          pageNum = i + 1;
                        } else if (pagination.current > pagination.pages - 5) {
                          pageNum = pagination.pages - 9 + i;
                        } else {
                          pageNum = pagination.current - 5 + i;
                        }
                        return pageNum;
                      }).map((page) => (
                        <button
                          key={page}
                          onClick={() => setPagination(prev => ({ ...prev, current: page }))}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${page === pagination.current
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                        >
                          {page}
                        </button>
                      ))}
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>


          {/* View Modal */}
          {showViewModal && selectedOrder && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
              <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
                <div className="mt-3">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-medium text-gray-900">
                      Order Details: {selectedOrder.orderNumber}
                    </h3>
                    <button
                      onClick={() => setShowViewModal(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="space-y-6">
                    {/* Order Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Order Number</label>
                          <p className="mt-1 text-sm text-gray-900">{selectedOrder.orderNumber}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Status</label>
                          <span className={`mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedOrder.status)}`}>
                            {selectedOrder.status}
                          </span>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Priority</label>
                          <span className={`mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(selectedOrder.priority)}`}>
                            {selectedOrder.priority}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Due Date</label>
                          <p className="mt-1 text-sm text-gray-900">
                            {selectedOrder.dueDate ? new Date(selectedOrder.dueDate).toLocaleDateString() : 'No due date'}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Progress</label>
                          <div className="mt-1">
                            <div className="flex items-center">
                              <div className="flex-1">
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-blue-600 h-2 rounded-full"
                                    style={{
                                      width: `${selectedOrder.targetPcs > 0 ? (selectedOrder.completedPcs / selectedOrder.targetPcs) * 100 : 0}%`
                                    }}
                                  ></div>
                                </div>
                              </div>
                              <span className="ml-2 text-sm text-gray-600">
                                {selectedOrder.completedPcs} / {selectedOrder.targetPcs}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Created</label>
                          <p className="mt-1 text-sm text-gray-900">
                            {new Date(selectedOrder.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Products */}
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-3">Products ({selectedOrder.Products?.length || 0})</label>
                      {selectedOrder.Products && selectedOrder.Products.length > 0 ? (
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="space-y-3">
                            {selectedOrder.Products.map((product, index) => (
                              <div key={product.id} className="flex justify-between items-center bg-white p-3 rounded border">
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{product.name}</p>
                                  <p className="text-xs text-gray-500">Code: {product.code}</p>
                                  {product.category && (
                                    <p className="text-xs text-blue-600">Category: {product.category}</p>
                                  )}
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-medium text-gray-900">
                                    {product.OrderProduct.qty} {product.unit}
                                  </p>
                                  {product.price && (
                                    <p className="text-xs text-gray-500">
                                      IDR {product.price.toLocaleString('id-ID')}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="mt-4 pt-3 border-t border-gray-200">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-gray-900">Total Quantity:</span>
                              <span className="text-sm font-bold text-gray-900">{selectedOrder.targetPcs} pcs</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 italic">No products assigned to this order</p>
                      )}
                    </div>

                    {/* Description & Notes */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Description</label>
                        <p className="mt-1 text-sm text-gray-900">
                          {selectedOrder.description || 'No description provided'}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Customer Note</label>
                        <p className="mt-1 text-sm text-gray-900">
                          {selectedOrder.customerNote || 'No customer notes'}
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-end pt-4">
                      <button
                        onClick={() => setShowViewModal(false)}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    </AuthWrapper>
  );
} 