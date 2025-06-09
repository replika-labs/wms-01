'use client';

import { useState, useEffect } from 'react';
import { FiPlus, FiSearch, FiFilter, FiEye, FiEdit2, FiTrash2, FiPackage, FiAlertTriangle, FiTrendingUp, FiRefreshCw } from 'react-icons/fi';
import DashboardLayout from '@/app/components/DashboardLayout';
import AuthWrapper from '@/app/components/AuthWrapper';
import { formatCurrencyShort } from '@/utils/formatNominal';

function MaterialsManagementPage() {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    lowStock: false,
    sortBy: 'name',
    sortOrder: 'ASC'
  });

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState(null);

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    unit: 'pcs',
    qtyOnHand: 0,
    minStock: 0,
    maxStock: 0,
    reorderPoint: 0,
    reorderQty: 0,
    location: '',
    attributeType: '',
    attributeValue: ''
  });

  // Load materials
  const loadMaterials = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: currentPage,
        limit: 20,
        _timestamp: Date.now(), // Cache busting parameter
        ...filters
      });

      const token = localStorage.getItem('token');

      // Try the API first
      try {
        const response = await fetch(`http://localhost:8080/api/materials-management?${queryParams}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();

          if (data.success) {
            // Handle API data properly
            const apiMaterials = data.data.materials || [];

            console.log('API materials loaded:', apiMaterials.length);
            setMaterials(apiMaterials);
            setTotalPages(data.data.pagination?.totalPages || 1);
            setError(''); // Clear any previous errors
            return;
          } else {
            throw new Error(data.message || 'Failed to load materials');
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
        setMaterials([]);
        setTotalPages(1);
        return;
      }

      // Removed demo data fallback - show actual API errors instead

    } catch (error) {
      console.error('Error loading materials:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Load material details for view/edit
  const loadMaterialDetails = async (materialId) => {
    if (!materialId) {
      alert('Material ID not found');
      return null;
    }

    try {
      const token = localStorage.getItem('token');

      if (!token) {
        alert('Authentication required. Please login again.');
        return null;
      }

      const response = await fetch(`http://localhost:8080/api/materials-management/${materialId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required. Please login again.');
        } else if (response.status === 404) {
          throw new Error('Material not found');
        } else {
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
      }

      const data = await response.json();

      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to load material details');
      }
    } catch (error) {
      console.error('Error loading material details:', error);
      setError(error.message);
      alert(`Error loading material details: ${error.message}`);
      return null;
    }
  };

  // Create material
  const handleCreateMaterial = async (e) => {
    e.preventDefault();

    // Basic validation
    if (!formData.name) {
      alert('Please fill in required fields: Name');
      return;
    }

    try {
      const token = localStorage.getItem('token');

      if (!token) {
        alert('Authentication required. Please login again.');
        return;
      }

      const response = await fetch('http://localhost:8080/api/materials-management', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
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
        alert('Material created successfully!');
        setShowCreateModal(false);
        resetForm();
        loadMaterials();
      } else {
        throw new Error(data.message || 'Failed to create material');
      }
    } catch (error) {
      console.error('Error creating material:', error);
      alert(`Error: ${error.message}`);
    }
  };

  // Update material
  const handleUpdateMaterial = async (e) => {
    e.preventDefault();

    // Basic validation
    if (!formData.name) {
      alert('Please fill in required fields: Name');
      return;
    }

    if (!selectedMaterial) {
      alert('No material selected for update');
      return;
    }

    try {
      const token = localStorage.getItem('token');

      if (!token) {
        alert('Authentication required. Please login again.');
        return;
      }

      const materialId = selectedMaterial.id || selectedMaterial.material?.id;

      if (!materialId) {
        alert('Material ID not found');
        return;
      }

      const response = await fetch(`http://localhost:8080/api/materials-management/${materialId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required. Please login again.');
        } else if (response.status === 400) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Invalid data provided');
        } else if (response.status === 404) {
          throw new Error('Material not found');
        } else {
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
      }

      const data = await response.json();

      if (data.success) {
        alert('Material updated successfully!');
        setShowEditModal(false);
        resetForm();
        setSelectedMaterial(null);
        loadMaterials();
      } else {
        throw new Error(data.message || 'Failed to update material');
      }
    } catch (error) {
      console.error('Error updating material:', error);
      alert(`Error: ${error.message}`);
    }
  };

  // Delete material
  const handleDeleteMaterial = async (materialId) => {
    if (!materialId) {
      alert('Material ID not found');
      return;
    }

    if (!confirm('Are you sure you want to delete this material? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');

      if (!token) {
        alert('Authentication required. Please login again.');
        return;
      }

      const response = await fetch(`http://localhost:8080/api/materials-management/${materialId}`, {
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
          throw new Error('Material not found');
        } else if (response.status === 400) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Cannot delete material');
        } else {
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
      }

      const data = await response.json();

      if (data.success) {
        alert('Material deleted successfully!');
        loadMaterials();
      } else {
        throw new Error(data.message || 'Failed to delete material');
      }
    } catch (error) {
      console.error('Error deleting material:', error);
      alert(`Error: ${error.message}`);
    }
  };

  // View material details
  const handleViewMaterial = async (materialId) => {
    const details = await loadMaterialDetails(materialId);
    if (details) {
      setSelectedMaterial(details);
      setShowViewModal(true);
    }
  };

  // Edit material
  const handleEditMaterial = async (materialId) => {
    const details = await loadMaterialDetails(materialId);
    if (details) {
      setSelectedMaterial(details);
      setFormData({
        name: details.name || '',
        description: details.description || '',
        unit: details.unit || 'pcs',
        qtyOnHand: details.qtyOnHand || 0,
        minStock: details.minStock || 0,
        maxStock: details.maxStock || 0,
        reorderPoint: details.reorderPoint || 0,
        reorderQty: details.reorderQty || 0,
        location: details.location || '',
        attributeType: details.attributeType || '',
        attributeValue: details.attributeValue || ''
      });
      setShowEditModal(true);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      unit: 'pcs',
      qtyOnHand: 0,
      minStock: 0,
      maxStock: 0,
      reorderPoint: 0,
      reorderQty: 0,
      location: '',
      attributeType: '',
      attributeValue: ''
    });
  };

  // Get stock status badge
  const getStockStatusBadge = (material) => {
    const currentStock = material.qtyOnHand || 0;
    const minStock = material.minStock || 0;

    if (currentStock === 0) {
      return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">Out of Stock</span>;
    } else if (currentStock <= minStock) {
      return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">Low Stock</span>;
    } else {
      return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Adequate</span>;
    }
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

  // Manual refresh function
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadMaterials();
    setRefreshing(false);
  };

  useEffect(() => {
    loadMaterials();
  }, [currentPage, filters]);

  if (loading && materials.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading materials...</p>
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
            <h1 className="text-2xl font-bold text-gray-900">Materials Management</h1>
            <p className="text-gray-600">Manage your materials inventory with enhanced tracking</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <FiRefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <FiPlus size={20} />
              Add Material
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              <FiPackage className="text-blue-600 text-2xl mr-3" />
              <div>
                <p className="text-sm text-gray-600">Total Materials</p>
                <p className="text-xl font-bold">{materials.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              <FiAlertTriangle className="text-red-600 text-2xl mr-3" />
              <div>
                <p className="text-sm text-gray-600">Low Stock</p>
                <p className="text-xl font-bold">
                  {materials.filter(m => m.qtyOnHand <= m.minStock).length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              <FiTrendingUp className="text-green-600 text-2xl mr-3" />
              <div>
                <p className="text-sm text-gray-600">Total Value</p>
                <p className="text-xl font-bold">
                  {formatCurrencyShort(materials.reduce((sum, m) => sum + (m.totalValue || 0), 0))}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              <FiPackage className="text-purple-600 text-2xl mr-3" />
              <div>
                <p className="text-sm text-gray-600">Categories</p>
                <p className="text-xl font-bold">
                  {new Set(materials.map(m => m.attributeType).filter(Boolean)).size}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Search materials..."
                className="pl-10 pr-3 py-2 border border-gray-300 rounded-md w-full focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Attribute Type</label>
            <input
              type="text"
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              placeholder="Filter by attribute type..."
              className="px-3 py-2 border border-gray-300 rounded-md w-full focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
            <select
              value={filters.sortBy}
              onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md w-full focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="name">Name</option>
              <option value="code">Code</option>
              <option value="qtyOnHand">Stock</option>
              <option value="minStock">Min Stock</option>
              <option value="pricePerUnit">Price</option>
              <option value="createdAt">Created Date</option>
            </select>
          </div>

          <div className="flex items-end">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters.lowStock}
                onChange={(e) => handleFilterChange('lowStock', e.target.checked)}
                className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Low Stock Only</span>
            </label>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Info Note */}
      <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded mb-4">
        <div className="flex items-center">
          <FiPackage className="mr-2" />
          <span className="text-sm">
            <strong>Note:</strong> Stock levels are automatically updated when purchases are marked as &quot;RECEIVED&quot;.
            Latest purchase data may take a moment to refresh. Use the &quot;Refresh&quot; button above to get the most recent data.
          </span>
        </div>
      </div>

      {/* Materials Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Material Info
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Inventory
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {materials.map((material, index) => (
                <tr key={material.id || `material-${index}`} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {material.image && (
                        <div className="flex-shrink-0 h-12 w-12">
                          <img
                            className="h-12 w-12 rounded-lg object-cover"
                            src={material.image}
                            alt={material.name}
                          />
                        </div>
                      )}
                      <div className={material.image ? "ml-4" : ""}>
                        <div className="text-sm font-medium text-gray-900">
                          {material.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          Code: {material.code || 'N/A'} | {material.attributeType || 'No category'}: {material.attributeValue || 'N/A'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      {getStockStatusBadge(material)}
                      {material.qtyOnHand <= material.minStock && (
                        <div className="flex items-center text-red-600 text-xs">
                          <FiAlertTriangle size={12} className="mr-1" />
                          Needs Restock
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div className="font-medium">
                        Current: {material.qtyOnHand || 0} {material.unit}
                      </div>
                      <div className="text-gray-500">
                        Min Stock: {material.minStock || 0} {material.unit}
                      </div>
                      <div className="text-xs text-gray-400">
                        Supplier: {material.supplier || 'N/A'} |
                        Location: {material.location || 'N/A'}
                      </div>
                      {material.latestPurchase && (
                        <div className="text-xs text-blue-600">
                          Last purchase: {new Date(material.latestPurchase.date).toLocaleDateString()}
                          from {material.latestPurchase.supplier}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div className="font-medium">
                        Avg Price: {formatCurrencyShort(material.avgPrice || 0)}
                      </div>
                      <div className="text-gray-500">
                        Reorder: {material.reorderPoint || 0} / {material.reorderQty || 0}
                      </div>
                      <div className="text-xs text-gray-400">
                        Value: {formatCurrencyShort(material.totalValue || 0)}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleViewMaterial(material.id)}
                        className="text-blue-600 hover:text-blue-900"
                        title="View Details"
                      >
                        <FiEye size={16} />
                      </button>
                      <button
                        onClick={() => handleEditMaterial(material.id)}
                        className="text-green-600 hover:text-green-900"
                        title="Edit Material"
                      >
                        <FiEdit2 size={16} />
                      </button>
                      {material.canDelete ? (
                        <button
                          onClick={() => handleDeleteMaterial(material.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete Material"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      ) : (
                        <button
                          disabled
                          className="text-gray-400 cursor-not-allowed"
                          title={`Cannot delete: Material has ${material.hasMovements ? 'existing movements' : ''}${material.hasMovements && material.hasRemainingMaterials ? ' and ' : ''}${material.hasRemainingMaterials ? 'remaining material records' : ''}`}
                        >
                          <FiTrash2 size={16} />
                        </button>
                      )}
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
                <h2 className="text-xl font-bold">Add New Material</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleCreateMaterial} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Material Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unit *
                    </label>
                    <select
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="pcs">Pieces</option>
                      <option value="meter">Meter</option>
                      <option value="yard">Yard</option>
                      <option value="roll">Roll</option>
                      <option value="kg">Kilogram</option>
                      <option value="liter">Liter</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Attribute Type
                    </label>
                    <input
                      type="text"
                      value={formData.attributeType}
                      onChange={(e) => setFormData({ ...formData, attributeType: e.target.value })}
                      placeholder="e.g., Raw Materials, Components"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Attribute Value
                    </label>
                    <input
                      type="text"
                      value={formData.attributeValue}
                      onChange={(e) => setFormData({ ...formData, attributeValue: e.target.value })}
                      placeholder="e.g., Steel, Plastic, Electronic"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Initial Stock
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.qtyOnHand}
                      onChange={(e) => setFormData({ ...formData, qtyOnHand: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Min Stock
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.minStock}
                      onChange={(e) => setFormData({ ...formData, minStock: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Stock
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.maxStock}
                      onChange={(e) => setFormData({ ...formData, maxStock: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reorder Point
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.reorderPoint}
                      onChange={(e) => setFormData({ ...formData, reorderPoint: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reorder Quantity
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.reorderQty}
                      onChange={(e) => setFormData({ ...formData, reorderQty: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Location
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                    Create Material
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal - Similar to Create Modal */}
      {showEditModal && selectedMaterial && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Edit Material</h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleUpdateMaterial} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Material Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unit *
                    </label>
                    <select
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="pcs">Pieces</option>
                      <option value="meter">Meter</option>
                      <option value="yard">Yard</option>
                      <option value="roll">Roll</option>
                      <option value="kg">Kilogram</option>
                      <option value="liter">Liter</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Attribute Type
                    </label>
                    <input
                      type="text"
                      value={formData.attributeType}
                      onChange={(e) => setFormData({ ...formData, attributeType: e.target.value })}
                      placeholder="e.g., Raw Materials, Components"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Attribute Value
                    </label>
                    <input
                      type="text"
                      value={formData.attributeValue}
                      onChange={(e) => setFormData({ ...formData, attributeValue: e.target.value })}
                      placeholder="e.g., Steel, Plastic, Electronic"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Current Stock
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.qtyOnHand}
                      onChange={(e) => setFormData({ ...formData, qtyOnHand: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Min Stock
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.minStock}
                      onChange={(e) => setFormData({ ...formData, minStock: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Stock
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.maxStock}
                      onChange={(e) => setFormData({ ...formData, maxStock: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reorder Point
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.reorderPoint}
                      onChange={(e) => setFormData({ ...formData, reorderPoint: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reorder Quantity
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.reorderQty}
                      onChange={(e) => setFormData({ ...formData, reorderQty: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Location
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                    Update Material
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && selectedMaterial && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Material Details</h2>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Basic Information</h3>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Name</label>
                      <p className="text-gray-900">{selectedMaterial.name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Code</label>
                      <p className="text-gray-900">{selectedMaterial.code || 'Auto-generated'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Attribute Type</label>
                      <p className="text-gray-900">{selectedMaterial.attributeType || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Attribute Value</label>
                      <p className="text-gray-900">{selectedMaterial.attributeValue || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Unit</label>
                      <p className="text-gray-900">{selectedMaterial.unit}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Average Price</label>
                      <p className="text-gray-900">
                        {selectedMaterial.avgPrice ? formatCurrencyShort(selectedMaterial.avgPrice) : 'No purchase data'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Latest Supplier</label>
                      <p className="text-gray-900">{selectedMaterial.latestSupplier || 'No purchases yet'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Total Value</label>
                      <p className="text-gray-900 font-semibold text-green-600">
                        {formatCurrencyShort(selectedMaterial.totalValue || 0)}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Location</label>
                      <p className="text-gray-900">{selectedMaterial.location || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Stock Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Stock Information</h3>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Stock Status</label>
                      {getStockStatusBadge({
                        stockStatus: selectedMaterial.qtyOnHand <= selectedMaterial.minStock ? 'low' : 'adequate'
                      })}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Current Stock</label>
                      <p className="text-gray-900 font-semibold">
                        {selectedMaterial.qtyOnHand} {selectedMaterial.unit}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Min Stock</label>
                      <p className="text-gray-900">{selectedMaterial.minStock || 0} {selectedMaterial.unit}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Max Stock</label>
                      <p className="text-gray-900">{selectedMaterial.maxStock || 0} {selectedMaterial.unit}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Reorder Point</label>
                      <p className="text-gray-900">{selectedMaterial.reorderPoint || 0} {selectedMaterial.unit}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Reorder Quantity</label>
                      <p className="text-gray-900">{selectedMaterial.reorderQty || 0} {selectedMaterial.unit}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Purchase History */}
              {selectedMaterial.purchaseHistory && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold border-b pb-2 mb-4">Purchase History</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-sm text-blue-600">Total Purchases</p>
                      <p className="text-xl font-bold text-blue-800">{selectedMaterial.purchaseHistory.summary.totalPurchases}</p>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <p className="text-sm text-green-600">Total Quantity</p>
                      <p className="text-xl font-bold text-green-800">
                        {selectedMaterial.purchaseHistory.summary.totalQuantity} {selectedMaterial.material?.unit || selectedMaterial.unit}
                      </p>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-lg">
                      <p className="text-sm text-purple-600">Total Value</p>
                      <p className="text-xl font-bold text-purple-800">
                        {formatCurrencyShort(selectedMaterial.purchaseHistory.summary.totalValue)}
                      </p>
                    </div>
                  </div>

                  {selectedMaterial.purchaseHistory.purchases.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {selectedMaterial.purchaseHistory.purchases.slice(0, 5).map((purchase, index) => (
                            <tr key={purchase.id || `purchase-${index}`}>
                              <td className="px-4 py-2 text-sm text-gray-900">
                                {new Date(purchase.purchasedDate).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-900">
                                {purchase.stock} {purchase.unit}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-900">
                                {purchase.supplier || 'N/A'}
                              </td>
                              <td className="px-4 py-2 text-sm">
                                <span className={`px-2 py-1 text-xs rounded-full ${purchase.status === 'diterima' ? 'bg-green-100 text-green-800' :
                                  purchase.status === 'dikirim' ? 'bg-blue-100 text-blue-800' :
                                    'bg-yellow-100 text-yellow-800'
                                  }`}>
                                  {purchase.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Restock Recommendation */}
              {selectedMaterial.restockRecommendation && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold border-b pb-2 mb-4">Restock Recommendation</h3>
                  <div className={`p-4 rounded-lg ${selectedMaterial.restockRecommendation.priority === 'critical' ? 'bg-red-50 border border-red-200' :
                    selectedMaterial.restockRecommendation.priority === 'high' ? 'bg-orange-50 border border-orange-200' :
                      selectedMaterial.restockRecommendation.priority === 'medium' ? 'bg-yellow-50 border border-yellow-200' :
                        'bg-green-50 border border-green-200'
                    }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          Action: {selectedMaterial.restockRecommendation.action.replace('_', ' ').toUpperCase()}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          {selectedMaterial.restockRecommendation.reason}
                        </p>
                        {selectedMaterial.restockRecommendation.recommendedQuantity > 0 && (
                          <p className="text-sm font-medium mt-2">
                            Recommended Quantity: {selectedMaterial.restockRecommendation.recommendedQuantity} {selectedMaterial.material?.unit || selectedMaterial.unit}
                          </p>
                        )}
                      </div>
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${selectedMaterial.restockRecommendation.priority === 'critical' ? 'bg-red-100 text-red-800' :
                        selectedMaterial.restockRecommendation.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                          selectedMaterial.restockRecommendation.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                        }`}>
                        {selectedMaterial.restockRecommendation.priority.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              )}

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

export default function MaterialsManagementPageWrapper() {
  return (
    <AuthWrapper>
      <DashboardLayout>
        <MaterialsManagementPage />
      </DashboardLayout>
    </AuthWrapper>
  );
} 