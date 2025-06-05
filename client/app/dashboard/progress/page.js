'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/app/components/DashboardLayout';
import AuthWrapper from '@/app/components/AuthWrapper';
import Image from 'next/image';

export default function ProgressReportsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [progressReports, setProgressReports] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [currentReport, setCurrentReport] = useState(null);
  
  // Form data
  const [formData, setFormData] = useState({
    orderId: '',
    pcsFinished: 0,
    photoUrl: '',
    resiPengiriman: '',
    note: ''
  });

  // Filter states
  const [filterOrderId, setFilterOrderId] = useState('');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');
  
  // Fetch user from localStorage
  useEffect(() => {
    const userJson = localStorage.getItem('user');
    if (userJson) {
      try {
        setUser(JSON.parse(userJson));
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
  }, []);
  
  // Fetch progress reports
  const fetchProgressReports = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }
      
      const response = await fetch('/api/progress-reports', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to fetch progress reports');
      }
      
      const data = await response.json();
      setProgressReports(data);
      setError('');
    } catch (err) {
      console.error('Error fetching progress reports:', err);
      setError('Failed to load progress reports: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch orders for dropdown
  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }
      
      const response = await fetch('/api/orders-management/list', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to fetch orders');
      }
      
      const data = await response.json();
      // orders-management returns {orders: [...]} structure
      const orders = data.orders || [];
      // Filter only orders that are not completed or cancelled
      const activeOrders = orders.filter(order => 
        order.status !== 'completed' && 
        order.status !== 'cancelled' &&
        order.completedPcs < order.targetPcs
      );
      setOrders(activeOrders);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError('Failed to load orders: ' + err.message);
    }
  };
  
  // Load data on component mount
  useEffect(() => {
    fetchProgressReports();
    fetchOrders();
  }, []);
  
  // Handle input change
  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'number' ? parseInt(value, 10) : value
    });
  };

  // Get maximum allowed pcs for selected order
  const getMaxPcsForOrder = () => {
    if (!formData.orderId) return 0;
    const selectedOrder = orders.find(order => order.id === parseInt(formData.orderId, 10));
    if (!selectedOrder) return 0;
    return selectedOrder.targetPcs - selectedOrder.completedPcs;
  };
  
  // Handle add progress report
  const handleAddProgressReport = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/progress-reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Failed to add progress report');
      }
      
      // Refresh data and reset form
      fetchProgressReports();
      fetchOrders(); // Refresh orders to update completedPcs
      setFormData({
        orderId: '',
        pcsFinished: 0,
        photoUrl: '',
        resiPengiriman: '',
        note: ''
      });
      setShowAddModal(false);
      setSuccessMessage('Progress report added successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (err) {
      console.error('Failed to add progress report:', err);
      setError(err.message || 'Failed to add progress report');
    } finally {
      setLoading(false);
    }
  };
  
  // Open detail modal
  const openDetailModal = (report) => {
    setCurrentReport(report);
    setShowDetailModal(true);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Apply filters
  const filteredReports = progressReports.filter(report => {
    // Filter by order
    if (filterOrderId && report.orderId !== parseInt(filterOrderId, 10)) return false;
    
    // Filter by date range
    if (filterDateStart || filterDateEnd) {
      const reportDate = new Date(report.reportedAt);
      
      if (filterDateStart) {
        const startDate = new Date(filterDateStart);
        if (reportDate < startDate) return false;
      }
      
      if (filterDateEnd) {
        const endDate = new Date(filterDateEnd);
        endDate.setHours(23, 59, 59);
        if (reportDate > endDate) return false;
      }
    }
    
    return true;
  });

  // Calculate total pieces completed
  const totalPcsCompleted = filteredReports.reduce((sum, report) => sum + report.pcsFinished, 0);

  if (!user) return null;
  
  return (
    <AuthWrapper>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Progress Reports</h1>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Add New Progress Report
            </button>
          </div>
          
          {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-lg">
              {error}
            </div>
          )}
          
          {successMessage && (
            <div className="p-4 bg-green-50 text-green-700 rounded-lg">
              {successMessage}
            </div>
          )}

          {/* Filters */}
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h2 className="text-lg font-medium text-gray-900 mb-3">Filters</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="filterOrderId" className="block text-sm font-medium text-gray-700 mb-1">
                  Order
                </label>
                <select
                  id="filterOrderId"
                  value={filterOrderId}
                  onChange={(e) => setFilterOrderId(e.target.value)}
                  className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="">All Orders</option>
                  {orders.map((order) => (
                    <option key={order.id} value={order.id}>
                      {order.orderNumber}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="filterDateStart" className="block text-sm font-medium text-gray-700 mb-1">
                  From Date
                </label>
                <input
                  type="date"
                  id="filterDateStart"
                  value={filterDateStart}
                  onChange={(e) => setFilterDateStart(e.target.value)}
                  className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              
              <div>
                <label htmlFor="filterDateEnd" className="block text-sm font-medium text-gray-700 mb-1">
                  To Date
                </label>
                <input
                  type="date"
                  id="filterDateEnd"
                  value={filterDateEnd}
                  onChange={(e) => setFilterDateEnd(e.target.value)}
                  className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>
            
            <div className="flex justify-end mt-4">
              <button
                onClick={() => {
                  setFilterOrderId('');
                  setFilterDateStart('');
                  setFilterDateEnd('');
                }}
                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 mr-2"
              >
                Clear Filters
              </button>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h2 className="text-lg font-medium text-gray-900 mb-3">Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-500">Total Reports</p>
                <p className="text-2xl font-bold">{filteredReports.length}</p>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-green-500">Total Pieces Completed</p>
                <p className="text-2xl font-bold">{totalPcsCompleted}</p>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm text-purple-500">Recent Progress</p>
                <p className="text-2xl font-bold">
                  {filteredReports.length > 0 ? formatDate(filteredReports[0].reportedAt) : '-'}
                </p>
              </div>
            </div>
          </div>
          
          {/* Progress Reports Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order Number
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reported By
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pieces Finished
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tracking Number
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reported At
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-4 text-center">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      </div>
                    </td>
                  </tr>
                ) : filteredReports.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                      No progress reports found
                    </td>
                  </tr>
                ) : (
                  filteredReports.map((report) => (
                    <tr key={report.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {report.Order?.orderNumber || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {report.User?.name || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{report.pcsFinished}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{report.resiPengiriman || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{formatDate(report.reportedAt)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => openDetailModal(report)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Add Progress Report Modal */}
          {showAddModal && (
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-lg w-full">
                <h2 className="text-xl font-semibold mb-4">Add New Progress Report</h2>
                <form onSubmit={handleAddProgressReport}>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="orderId" className="block text-sm font-medium text-gray-700">
                        Order*
                      </label>
                      <select
                        id="orderId"
                        name="orderId"
                        value={formData.orderId}
                        onChange={handleInputChange}
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select Order</option>
                        {orders.map((order) => (
                          <option key={order.id} value={order.id}>
                            {order.orderNumber} - Remaining: {order.targetPcs - order.completedPcs} pcs
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label htmlFor="pcsFinished" className="block text-sm font-medium text-gray-700">
                        Pieces Finished*
                      </label>
                      <input
                        type="number"
                        id="pcsFinished"
                        name="pcsFinished"
                        value={formData.pcsFinished}
                        onChange={handleInputChange}
                        min="1"
                        max={getMaxPcsForOrder()}
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                      {formData.orderId && (
                        <p className="mt-1 text-xs text-gray-500">
                          Maximum: {getMaxPcsForOrder()} pieces
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <label htmlFor="photoUrl" className="block text-sm font-medium text-gray-700">
                        Photo URL
                      </label>
                      <input
                        type="text"
                        id="photoUrl"
                        name="photoUrl"
                        value={formData.photoUrl}
                        onChange={handleInputChange}
                        placeholder="https://example.com/photo.jpg"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="resiPengiriman" className="block text-sm font-medium text-gray-700">
                        Tracking Number
                      </label>
                      <input
                        type="text"
                        id="resiPengiriman"
                        name="resiPengiriman"
                        value={formData.resiPengiriman}
                        onChange={handleInputChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="note" className="block text-sm font-medium text-gray-700">
                        Note
                      </label>
                      <textarea
                        id="note"
                        name="note"
                        value={formData.note}
                        onChange={handleInputChange}
                        rows="3"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      ></textarea>
                    </div>
                  </div>
                  
                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading || !formData.orderId || formData.pcsFinished <= 0 || formData.pcsFinished > getMaxPcsForOrder()}
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Saving...' : 'Save Progress Report'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
          
          {/* Detail Modal */}
          {showDetailModal && currentReport && (
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-lg w-full">
                <h2 className="text-xl font-semibold mb-4">Progress Report Details</h2>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Order Number</p>
                      <p className="text-base font-semibold">{currentReport.Order?.orderNumber || '-'}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-500">Reported By</p>
                      <p className="text-base font-semibold">{currentReport.User?.name || '-'}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-500">Pieces Finished</p>
                      <p className="text-base font-semibold">{currentReport.pcsFinished}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-500">Reported At</p>
                      <p className="text-base font-semibold">{formatDate(currentReport.reportedAt)}</p>
                    </div>
                    
                    <div className="col-span-2">
                      <p className="text-sm font-medium text-gray-500">Tracking Number</p>
                      <p className="text-base font-semibold">{currentReport.resiPengiriman || '-'}</p>
                    </div>
                    
                    <div className="col-span-2">
                      <p className="text-sm font-medium text-gray-500">Note</p>
                      <p className="text-base">{currentReport.note || '-'}</p>
                    </div>
                  </div>
                  
                  {currentReport.photoUrl && (
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-2">Photo</p>
                      <div className="border rounded-lg overflow-hidden">
                        <img
                          src={currentReport.photoUrl}
                          alt="Progress Report"
                          className="w-full h-auto object-cover"
                          onError={(e) => {
                            e.target.src = "https://placehold.co/400x300?text=Image+Not+Available";
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowDetailModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    </AuthWrapper>
  );
} 