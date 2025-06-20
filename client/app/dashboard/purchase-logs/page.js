'use client';

import { useState, useEffect } from 'react';
import { FiPlus, FiSearch, FiFilter, FiEye, FiEdit2, FiTrash2, FiDollarSign, FiPackage, FiCalendar, FiTrendingUp } from 'react-icons/fi';
import DashboardLayout from '@/app/components/DashboardLayout';
import AuthWrapper from '@/app/components/AuthWrapper';
import { formatCurrencyShort } from '@/utils/formatNominal';

function PurchaseLogsPage() {
  const [purchaseLogs, setPurchaseLogs] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    status: '',
    supplier: '',
    materialId: '',
    startDate: '',
    endDate: '',
    sortBy: 'purchaseDate',
    sortOrder: 'DESC'
  });

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedPurchaseLog, setSelectedPurchaseLog] = useState(null);

  // Form data
  const [formData, setFormData] = useState({
    purchaseDate: '',
    materialId: '',
    quantity: '',
    unit: 'pcs',
    supplier: '',
    pricePerUnit: '',
    status: 'PENDING',
    invoiceNumber: '',
    deliveryDate: '',
    receivedQuantity: '',
    notes: ''
  });

  // Load purchase logs
  const loadPurchaseLogs = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: currentPage,
        limit: 20,
        ...filters
      });

      const token = localStorage.getItem('token');

      // Try the API first
      try {
        const response = await fetch(`http://localhost:8080/api/purchase-logs?${queryParams}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();

          if (data.success) {
            const apiPurchaseLogs = data.data.purchaseLogs || [];

            console.log('API purchase logs loaded:', apiPurchaseLogs.length);
            setPurchaseLogs(apiPurchaseLogs);
            setTotalPages(data.data.pagination?.totalPages || 1);
            setError(''); // Clear any previous errors
            return;
          } else {
            throw new Error(data.message || 'Failed to load purchase logs');
          }
        } else if (response.status === 401) {
          throw new Error('Authentication required. Please login again.');
        } else {
          throw new Error(`API error: ${response.status} ${response.statusText}`);
        }
      } catch (apiError) {
        console.error('API error:', apiError.message);
        setError(`Error connecting to server: ${apiError.message}`);
        // Don't fall back to demo data - show the actual error
        setPurchaseLogs([]);
        setTotalPages(1);
        return;
      }

      // Removed demo data fallback - show actual API errors instead

    } catch (error) {
      console.error('Error loading purchase logs:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Load materials for dropdown
  const loadMaterials = async () => {
    try {
      const token = localStorage.getItem('token');

      if (!token) {
        console.warn('No authentication token for loading materials');
        return;
      }

      const response = await fetch('http://localhost:8080/api/materials-management', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();

        if (data.success) {
          const apiMaterials = data.data.materials || [];
          console.log('Materials loaded for dropdown:', apiMaterials.length);
          setMaterials(apiMaterials);
        } else {
          console.error('Failed to load materials:', data.message);
        }
      } else if (response.status === 401) {
        console.error('Authentication required for loading materials');
      } else {
        console.error('Materials API error:', response.status, response.statusText);
      }

    } catch (error) {
      console.error('Error loading materials:', error);
    }
  };

  // Load suppliers from contacts API
  const loadSuppliers = async () => {
    try {
      const token = localStorage.getItem('token');

      if (!token) {
        console.warn('No authentication token for loading suppliers');
        return;
      }

      const response = await fetch('http://localhost:8080/api/contacts/type/SUPPLIER', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();

        if (data.success) {
          const apiSuppliers = data.contacts || [];
          console.log('Suppliers loaded for dropdown:', apiSuppliers.length);
          setSuppliers(apiSuppliers);
        } else {
          console.error('Failed to load suppliers:', data.message);
        }
      } else if (response.status === 401) {
        console.error('Authentication required for loading suppliers');
      } else {
        console.error('Suppliers API error:', response.status, response.statusText);
      }

    } catch (error) {
      console.error('Error loading suppliers:', error);
    }
  };

  // Load purchase log details for view/edit
  const loadPurchaseLogDetails = async (purchaseLogId) => {
    if (!purchaseLogId) {
      alert('Purchase log ID not found');
      return null;
    }

    try {
      const token = localStorage.getItem('token');

      if (!token) {
        alert('Authentication required. Please login again.');
        return null;
      }

      const response = await fetch(`http://localhost:8080/api/purchase-logs/${purchaseLogId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required. Please login again.');
        } else if (response.status === 404) {
          throw new Error('Purchase log not found');
        } else {
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
      }

      const data = await response.json();

      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to load purchase log details');
      }
    } catch (error) {
      console.error('Error loading purchase log details:', error);
      setError(error.message);
      alert(`Error loading purchase log details: ${error.message}`);
      return null;
    }
  };

  // Create purchase log
  const handleCreatePurchaseLog = async (e) => {
    e.preventDefault();

    // Basic validation
    if (!formData.purchaseDate || !formData.materialId || !formData.quantity || !formData.pricePerUnit || !formData.supplier) {
      alert('Please fill in required fields: Purchase Date, Material, Quantity, Price per Unit, and Supplier');
      return;
    }

    try {
      const token = localStorage.getItem('token');

      if (!token) {
        alert('Authentication required. Please login again.');
        return;
      }

      // Find the selected supplier and use its company field
      const selectedSupplier = suppliers.find(supplier => supplier.id.toString() === formData.supplier);
      const supplierCompany = selectedSupplier ? (selectedSupplier.company || selectedSupplier.name) : '';

      const submissionData = {
        ...formData,
        supplier: supplierCompany
      };

      const response = await fetch('http://localhost:8080/api/purchase-logs', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submissionData)
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required. Please login again.');
        } else if (response.status === 400) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Invalid data provided');
        } else {
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
      }

      const data = await response.json();

      if (data.success) {
        alert('Purchase log created successfully!');
        setShowCreateModal(false);
        resetForm();
        loadPurchaseLogs();
      } else {
        throw new Error(data.message || 'Failed to create purchase log');
      }
    } catch (error) {
      console.error('Error creating purchase log:', error);
      alert(`Error: ${error.message}`);
    }
  };

  // Update purchase log
  const handleUpdatePurchaseLog = async (e) => {
    e.preventDefault();

    // Basic validation
    if (!formData.purchaseDate || !formData.materialId || !formData.quantity || !formData.pricePerUnit || !formData.supplier) {
      alert('Please fill in required fields: Purchase Date, Material, Quantity, Price per Unit, and Supplier');
      return;
    }

    if (!selectedPurchaseLog) {
      alert('No purchase log selected for update');
      return;
    }

    try {
      const token = localStorage.getItem('token');

      if (!token) {
        alert('Authentication required. Please login again.');
        return;
      }

      // Find the selected supplier and use its company field
      const selectedSupplier = suppliers.find(supplier => supplier.id.toString() === formData.supplier);
      const supplierCompany = selectedSupplier ? (selectedSupplier.company || selectedSupplier.name) : '';

      const submissionData = {
        ...formData,
        supplier: supplierCompany
      };

      const response = await fetch(`http://localhost:8080/api/purchase-logs/${selectedPurchaseLog.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submissionData)
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required. Please login again.');
        } else if (response.status === 400) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Invalid data provided');
        } else if (response.status === 404) {
          throw new Error('Purchase log not found');
        } else {
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
      }

      const data = await response.json();

      if (data.success) {
        alert('Purchase log updated successfully!');
        setShowEditModal(false);
        resetForm();
        setSelectedPurchaseLog(null);
        loadPurchaseLogs();
      } else {
        throw new Error(data.message || 'Failed to update purchase log');
      }
    } catch (error) {
      console.error('Error updating purchase log:', error);
      alert(`Error: ${error.message}`);
    }
  };

  // Update purchase log status
  const handleUpdateStatus = async (purchaseLogId, newStatus) => {
    if (!purchaseLogId) {
      alert('Purchase log ID not found');
      return;
    }

    try {
      const token = localStorage.getItem('token');

      if (!token) {
        alert('Authentication required. Please login again.');
        return;
      }

      const response = await fetch(`http://localhost:8080/api/purchase-logs/${purchaseLogId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required. Please login again.');
        } else if (response.status === 404) {
          throw new Error('Purchase log not found');
        } else if (response.status === 400) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Invalid status value');
        } else {
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
      }

      const data = await response.json();

      if (data.success) {
        alert('Status updated successfully!');
        loadPurchaseLogs();
      } else {
        throw new Error(data.message || 'Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert(`Error: ${error.message}`);
    }
  };

  // Delete purchase log
  const handleDeletePurchaseLog = async (purchaseLogId) => {
    if (!purchaseLogId) {
      alert('Purchase log ID not found');
      return;
    }

    if (!confirm('Are you sure you want to delete this purchase log? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');

      if (!token) {
        alert('Authentication required. Please login again.');
        return;
      }

      const response = await fetch(`http://localhost:8080/api/purchase-logs/${purchaseLogId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required. Please login again.');
        } else if (response.status === 404) {
          throw new Error('Purchase log not found');
        } else if (response.status === 400) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Cannot delete purchase log');
        } else {
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
      }

      const data = await response.json();

      if (data.success) {
        alert('Purchase log deleted successfully!');
        loadPurchaseLogs();
      } else {
        throw new Error(data.message || 'Failed to delete purchase log');
      }
    } catch (error) {
      console.error('Error deleting purchase log:', error);
      alert(`Error: ${error.message}`);
    }
  };

  // View purchase log details
  const handleViewPurchaseLog = async (purchaseLogId) => {
    const details = await loadPurchaseLogDetails(purchaseLogId);
    if (details) {
      setSelectedPurchaseLog(details);
      setShowViewModal(true);
    }
  };

  // Edit purchase log
  const handleEditPurchaseLog = async (purchaseLogId) => {
    const details = await loadPurchaseLogDetails(purchaseLogId);
    if (details) {
      setSelectedPurchaseLog(details);

      // Find the supplier ID based on the company name stored in the purchase log
      const supplierMatch = suppliers.find(supplier =>
        supplier.company === details.supplier || supplier.name === details.supplier
      );

      setFormData({
        purchaseDate: details.purchaseDate ? new Date(details.purchaseDate).toISOString().split('T')[0] : '',
        materialId: details.materialId || '',
        quantity: details.quantity || '',
        unit: details.unit || 'pcs',
        supplier: supplierMatch ? supplierMatch.id.toString() : '',
        pricePerUnit: details.pricePerUnit || '',
        status: details.status || 'PENDING',
        invoiceNumber: details.invoiceNumber || '',
        deliveryDate: details.deliveryDate ? new Date(details.deliveryDate).toISOString().split('T')[0] : '',
        receivedQuantity: details.receivedQuantity || '',
        notes: details.notes || ''
      });
      setShowEditModal(true);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      purchaseDate: '',
      materialId: '',
      quantity: '',
      unit: 'pcs',
      supplier: '',
      pricePerUnit: '',
      status: 'PENDING',
      invoiceNumber: '',
      deliveryDate: '',
      receivedQuantity: '',
      notes: ''
    });
  };

  // Get status badge
  const getStatusBadge = (status) => {
    const statusConfig = {
      'PENDING': { bg: 'bg-yellow-600', text: 'text-white', label: 'Pending' },
      'RECEIVED': { bg: 'bg-green-600', text: 'text-white', label: 'Received' },
      'CANCELLED': { bg: 'bg-red-600', text: 'text-white', label: 'Cancelled' }
    };

    const config = statusConfig[status] || { bg: 'bg-gray-600', text: 'text-white', label: status };

    return (
      <span className={`px-3 py-2 text-xs font-medium ${config.bg} ${config.text} rounded-full`}>
        {config.label}
      </span>
    );
  };

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  // Handle pagination
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  useEffect(() => {
    loadPurchaseLogs();
  }, [currentPage, filters]);

  useEffect(() => {
    loadMaterials();
  }, []);

  useEffect(() => {
    loadSuppliers();
  }, []);

  if (loading && purchaseLogs.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading purchase logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Purchase Logs</h1>
            <p className="text-gray-600">Track and manage all material purchase transactions</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <FiPlus size={20} />
            Add Purchase
          </button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              <FiPackage className="text-blue-600 text-2xl mr-3" />
              <div>
                <p className="text-sm text-gray-600">Total Purchases</p>
                <p className="text-xl font-bold">{purchaseLogs.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              <FiDollarSign className="text-green-600 text-2xl mr-3" />
              <div>
                <p className="text-sm text-gray-600">Total Value</p>
                <p className="text-xl font-bold">
                  {(() => {
                    const total = purchaseLogs.reduce((sum, p) => {
                      const cost = p.totalCost || 0;
                      return sum + Number(cost);
                    }, 0);
                    return formatCurrencyShort(total);
                  })()}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              <FiTrendingUp className="text-purple-600 text-2xl mr-3" />
              <div>
                <p className="text-sm text-gray-600">Received</p>
                <p className="text-xl font-bold">
                  {purchaseLogs.filter(p => p.status === 'RECEIVED').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              <FiCalendar className="text-orange-600 text-2xl mr-3" />
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-xl font-bold">
                  {purchaseLogs.filter(p => p.status === 'PENDING').length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="RECEIVED">Received</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
            <input
              type="text"
              value={filters.supplier}
              onChange={(e) => handleFilterChange('supplier', e.target.value)}
              placeholder="Filter by supplier..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Material</label>
            <select
              value={filters.materialId}
              onChange={(e) => handleFilterChange('materialId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Materials</option>
              {materials.map(material => (
                <option key={material.id} value={material.id}>
                  {material.name} ({material.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-600 border border-red-700 text-white px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Purchase Logs Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Purchase Info
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Material
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity & Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Supplier & Payment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {purchaseLogs.map((purchaseLog) => (
                <tr key={purchaseLog.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {new Date(purchaseLog.purchaseDate).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-gray-500">
                        ID: {purchaseLog.id}
                      </div>
                      <div className="text-sm text-gray-500">
                        Invoice: {purchaseLog.invoiceNumber || 'N/A'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {purchaseLog.material?.name || 'Unknown Material'}
                        </div>
                        <div className="text-sm text-gray-500">
                          Code: {purchaseLog.material?.code || 'N/A'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div className="font-medium">
                        {purchaseLog.quantity} {purchaseLog.unit}
                      </div>
                      <div className="text-gray-500">
                        @ {formatCurrencyShort(purchaseLog.pricePerUnit || 0)}
                      </div>
                      <div className="font-medium text-green-600">
                        Total: {formatCurrencyShort(purchaseLog.totalCost || 0)}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div className="font-medium">
                        {purchaseLog.supplier || 'No supplier'}
                      </div>
                      <div className="text-gray-500">
                        Delivery: {purchaseLog.deliveryDate ? new Date(purchaseLog.deliveryDate).toLocaleDateString() : 'Not set'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {purchaseLog.status === 'PENDING' ? (
                      <div className="relative">
                        <select
                          value={purchaseLog.status}
                          onChange={(e) => handleUpdateStatus(purchaseLog.id, e.target.value)}
                          className="appearance-none bg-yellow-600 text-white px-3 py-2 text-xs font-medium rounded-full border-0 cursor-pointer hover:bg-yellow-700 focus:ring-2 focus:ring-yellow-500 focus:outline-none"
                        >
                          <option value="PENDING">Pending</option>
                          <option value="RECEIVED">Received</option>
                          <option value="CANCELLED">Cancelled</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center mr-3 pointer-events-none">
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    ) : (
                      getStatusBadge(purchaseLog.status)
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleViewPurchaseLog(purchaseLog.id)}
                        className="text-blue-600 hover:text-blue-900"
                        title="View Details"
                      >
                        <FiEye size={16} />
                      </button>
                      <button
                        onClick={() => handleEditPurchaseLog(purchaseLog.id)}
                        className="text-green-600 hover:text-green-900"
                        title="Edit Purchase Log"
                      >
                        <FiEdit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeletePurchaseLog(purchaseLog.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete Purchase Log"
                      >
                        <FiTrash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex justify-center">
          <div className="flex space-x-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`px-3 py-2 text-sm rounded-md ${page === currentPage
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                  }`}
              >
                {page}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Add New Purchase</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleCreatePurchaseLog} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Purchase Date *
                    </label>
                    <input
                      type="date"
                      value={formData.purchaseDate}
                      onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Material *
                    </label>
                    <select
                      value={formData.materialId}
                      onChange={(e) => {
                        const selectedMaterial = materials.find(m => m.id == e.target.value);
                        setFormData({
                          ...formData,
                          materialId: e.target.value,
                          unit: selectedMaterial?.unit || 'pcs'
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Select Material</option>
                      {materials.map(material => (
                        <option key={material.id} value={material.id}>
                          {material.name} ({material.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity *
                    </label>
                    <input
                      type="number"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price per Unit *
                    </label>
                    <input
                      type="number"
                      value={formData.pricePerUnit}
                      onChange={(e) => setFormData({ ...formData, pricePerUnit: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Supplier *
                    </label>
                    <select
                      value={formData.supplier}
                      onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Select Supplier</option>
                      {suppliers.map(supplier => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.company && supplier.company !== '-' ? `${supplier.company}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="PENDING">Pending</option>
                      <option value="RECEIVED">Received</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Delivery Date
                    </label>
                    <input
                      type="date"
                      value={formData.deliveryDate}
                      onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <div className="bg-blue-600 border border-blue-700 rounded-lg p-3">
                      <p className="text-sm text-white">
                        <strong>Note:</strong> Invoice number will be automatically generated when the purchase is created.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Create Purchase
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal - Similar to Create Modal */}
      {showEditModal && selectedPurchaseLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Edit Purchase Log</h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleUpdatePurchaseLog} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Purchase Date *
                    </label>
                    <input
                      type="date"
                      value={formData.purchaseDate}
                      onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Material *
                    </label>
                    <select
                      value={formData.materialId}
                      onChange={(e) => {
                        const selectedMaterial = materials.find(m => m.id == e.target.value);
                        setFormData({
                          ...formData,
                          materialId: e.target.value,
                          unit: selectedMaterial?.unit || 'pcs'
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Select Material</option>
                      {materials.map(material => (
                        <option key={material.id} value={material.id}>
                          {material.name} ({material.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity *
                    </label>
                    <input
                      type="number"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price per Unit *
                    </label>
                    <input
                      type="number"
                      value={formData.pricePerUnit}
                      onChange={(e) => setFormData({ ...formData, pricePerUnit: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Supplier *
                    </label>
                    <select
                      value={formData.supplier}
                      onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Select Supplier</option>
                      {suppliers.map(supplier => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.name} {supplier.company && supplier.company !== '-' ? `(${supplier.company})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="PENDING">Pending</option>
                      <option value="RECEIVED">Received</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Delivery Date
                    </label>
                    <input
                      type="date"
                      value={formData.deliveryDate}
                      onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <div className="bg-blue-600 border border-blue-700 rounded-lg p-3">
                      <p className="text-sm text-white">
                        <strong>Note:</strong> Invoice number was auto-generated when this purchase was created. You can update it if needed.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      resetForm();
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Update Purchase
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && selectedPurchaseLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Purchase Log Details</h2>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Purchase Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Purchase Information</h3>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Purchase Date</label>
                      <p className="text-gray-900">{new Date(selectedPurchaseLog.purchaseDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Material</label>
                      <p className="text-gray-900">{selectedPurchaseLog.material?.name || 'Unknown'}</p>
                      <p className="text-sm text-gray-500">Code: {selectedPurchaseLog.material?.code || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Quantity</label>
                      <p className="text-gray-900 font-semibold">{selectedPurchaseLog.quantity} {selectedPurchaseLog.unit}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Price per Unit</label>
                      <p className="text-gray-900">{formatCurrencyShort(selectedPurchaseLog.pricePerUnit || 0)}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Total Amount</label>
                      <p className="text-gray-900 font-bold text-green-600">
                        {formatCurrencyShort(selectedPurchaseLog.totalCost || 0)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Supplier & Status Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Supplier & Status</h3>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Supplier</label>
                      <p className="text-gray-900">{selectedPurchaseLog.supplier || 'No supplier specified'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Status</label>
                      {getStatusBadge(selectedPurchaseLog.status)}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Invoice Number</label>
                      <p className="text-gray-900">{selectedPurchaseLog.invoiceNumber || 'Auto-generated'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Delivery Date</label>
                      <p className="text-gray-900">
                        {selectedPurchaseLog.deliveryDate
                          ? new Date(selectedPurchaseLog.deliveryDate).toLocaleDateString()
                          : 'Not specified'
                        }
                      </p>
                    </div>
                    {selectedPurchaseLog.receivedQuantity && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Received Quantity</label>
                        <p className="text-gray-900">{selectedPurchaseLog.receivedQuantity} {selectedPurchaseLog.unit}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedPurchaseLog.notes && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold border-b pb-2 mb-4">Notes</h3>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">
                    {selectedPurchaseLog.notes}
                  </p>
                </div>
              )}

              {/* Timeline */}
              <div className="mt-6">
                <h3 className="text-lg font-semibold border-b pb-2 mb-4">Timeline</h3>
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <div className="w-24 text-gray-500">Created:</div>
                    <div className="text-gray-900">{new Date(selectedPurchaseLog.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="flex items-center text-sm">
                    <div className="w-24 text-gray-500">Updated:</div>
                    <div className="text-gray-900">{new Date(selectedPurchaseLog.updatedAt).toLocaleString()}</div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowViewModal(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PurchaseLogsPageWrapper() {
  return (
    <AuthWrapper>
      <DashboardLayout>
        <PurchaseLogsPage />
      </DashboardLayout>
    </AuthWrapper>
  );
} 