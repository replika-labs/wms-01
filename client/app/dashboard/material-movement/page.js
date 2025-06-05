'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/app/components/DashboardLayout';
import AuthWrapper from '@/app/components/AuthWrapper';

export default function MaterialMovementPage() {
  const router = useRouter();
  const [movements, setMovements] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Pagination state
  const [pagination, setPagination] = useState({
    current: 1,
    total: 0,
    pages: 0,
    limit: 10
  });
  
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingMovement, setEditingMovement] = useState(null);
  const [formData, setFormData] = useState({
    materialId: '',
    qty: '',
    movementType: 'MASUK',
    description: '',
    referenceNumber: '',
    unitPrice: '',
    notes: ''
  });
  
  // Filter state
  const [filter, setFilter] = useState({
    movementType: '',
    movementSource: '',
    materialId: '',
    startDate: '',
    endDate: '',
    search: '',
    page: 1,
    limit: 10
  });
  
  // View state
  const [activeTab, setActiveTab] = useState('movements'); // movements, analytics
  const [showAnalytics, setShowAnalytics] = useState(false);
  
  // Submit state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch material movements with pagination
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
        Object.keys(filter).forEach(key => {
          if (filter[key]) queryParams.append(key, filter[key]);
        });

        // Fetch movements with pagination
        const movementsResponse = await fetch(`/api/material-movements?${queryParams.toString()}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!movementsResponse.ok) {
          throw new Error('Failed to fetch material movements');
        }

        const movementsData = await movementsResponse.json();
        setMovements(movementsData.movements || []);
        setPagination(movementsData.pagination || {});

        // Fetch materials for dropdown
        const materialsResponse = await fetch('/api/materials', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!materialsResponse.ok) {
          throw new Error('Failed to fetch materials');
        }

        const materialsData = await materialsResponse.json();
        setMaterials(Array.isArray(materialsData) ? materialsData : []);

        // Fetch analytics if tab is active
        if (showAnalytics) {
          const analyticsResponse = await fetch(`/api/material-movements/analytics?${queryParams.toString()}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (analyticsResponse.ok) {
            const analyticsData = await analyticsResponse.json();
            setAnalytics(analyticsData);
          }
        }

      } catch (err) {
        setError(err.message);
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [filter, showAnalytics]);

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value, type } = e.target;
    
    if (type === 'number') {
      setFormData({
        ...formData,
        [name]: value === '' ? '' : parseFloat(value) || 0
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  // Handle filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilter({
      ...filter,
      [name]: value,
      page: 1 // Reset to first page when filtering
    });
  };

  // Handle pagination
  const handlePageChange = (newPage) => {
    setFilter({
      ...filter,
      page: newPage
    });
  };

  // Reset filters
  const resetFilters = () => {
    setFilter({
      movementType: '',
      movementSource: '',
      materialId: '',
      startDate: '',
      endDate: '',
      search: '',
      page: 1,
      limit: 10
    });
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      materialId: '',
      qty: '',
      movementType: 'MASUK',
      description: '',
      referenceNumber: '',
      unitPrice: '',
      notes: ''
    });
    setEditingMovement(null);
    setShowForm(false);
  };

  // Handle edit movement
  const handleEdit = (movement) => {
    if (movement.movementSource === 'purchase') {
      setError('Cannot edit purchase-generated movements');
      return;
    }
    
    setFormData({
      materialId: movement.materialId,
      qty: movement.qty,
      movementType: movement.movementType,
      description: movement.description || '',
      referenceNumber: movement.referenceNumber || '',
      unitPrice: movement.unitPrice || '',
      notes: movement.notes || ''
    });
    setEditingMovement(movement);
    setShowForm(true);
  };

  // Handle delete movement
  const handleDelete = async (movement) => {
    if (movement.movementSource === 'purchase') {
      setError('Cannot delete purchase-generated movements');
      return;
    }
    
    if (!confirm('Are you sure you want to delete this movement?')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/material-movements/${movement.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete movement');
      }
      
      setSuccess('Movement deleted successfully');
      // Refresh data
      setFilter({ ...filter });
      
    } catch (err) {
      setError(err.message);
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setIsSubmitting(true);
      setError(null);
      setSuccess(null);
      
      // Validate form data
      if (!formData.materialId || !formData.qty || !formData.movementType) {
        throw new Error('Material, quantity, and movement type are required');
      }
      
      if (formData.qty <= 0) {
        throw new Error('Quantity must be greater than 0');
      }
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      // Prepare submission data
      const submitData = {
        materialId: parseInt(formData.materialId),
        qty: parseFloat(formData.qty),
        movementType: formData.movementType,
        description: formData.description,
        referenceNumber: formData.referenceNumber,
        unitPrice: formData.unitPrice ? parseFloat(formData.unitPrice) : null,
        notes: formData.notes
      };
      
      // Submit form data
      const url = editingMovement 
        ? `/api/material-movements/${editingMovement.id}`
        : '/api/material-movements';
      const method = editingMovement ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submitData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${editingMovement ? 'update' : 'create'} movement`);
      }
      
      // Reset form and fetch updated data
      resetForm();
      setSuccess(`Movement ${editingMovement ? 'updated' : 'created'} successfully`);
      
      // Refresh data
      setTimeout(() => {
        setFilter({ ...filter });
      }, 500);
      
    } catch (err) {
      setError(err.message);
      console.error('Error submitting movement:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format currency
  const formatCurrency = (amount) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(amount);
  };

  // Get movement source badge
  const getSourceBadge = (source) => {
    const badges = {
      purchase: 'bg-blue-100 text-blue-800',
      manual: 'bg-gray-100 text-gray-800',
      production: 'bg-purple-100 text-purple-800',
      adjustment: 'bg-yellow-100 text-yellow-800'
    };
    
    return badges[source] || 'bg-gray-100 text-gray-800';
  };

  return (
    <AuthWrapper>
      <DashboardLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Material Movement</h1>
              <p className="mt-1 text-sm text-gray-600">
                Manage material inflow and outflow with purchase integration
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowAnalytics(!showAnalytics)}
                className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium ${
                  showAnalytics 
                    ? 'text-blue-700 bg-blue-100 hover:bg-blue-200' 
                    : 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50'
                }`}
              >
                📊 Analytics
              </button>
              <button
                onClick={() => setShowForm(!showForm)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {showForm ? 'Cancel' : '+ Add Movement'}
              </button>
            </div>
          </div>

          {/* Error and Success Messages */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
              <span className="block sm:inline">{error}</span>
              <button 
                onClick={() => setError(null)}
                className="absolute top-0 bottom-0 right-0 px-4 py-3"
              >
                <span className="sr-only">Dismiss</span>
                ×
              </button>
            </div>
          )}
          
          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4">
              <span className="block sm:inline">{success}</span>
              <button 
                onClick={() => setSuccess(null)}
                className="absolute top-0 bottom-0 right-0 px-4 py-3"
              >
                <span className="sr-only">Dismiss</span>
                ×
              </button>
            </div>
          )}

          {/* Analytics Panel */}
          {showAnalytics && analytics && (
            <div className="bg-white shadow sm:rounded-lg mb-6">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Movement Analytics
                </h3>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="bg-blue-50 overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                            <span className="text-white text-sm font-medium">📊</span>
                          </div>
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 truncate">
                              Total Movements
                            </dt>
                            <dd className="text-lg font-medium text-gray-900">
                              {analytics.totalMovements || 0}
                            </dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {analytics.movementsBySource && analytics.movementsBySource.map((source, index) => (
                    <div key={index} className="bg-gray-50 overflow-hidden shadow rounded-lg">
                      <div className="p-5">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-gray-500 rounded-md flex items-center justify-center">
                              <span className="text-white text-sm font-medium">
                                {source.movementSource === 'purchase' ? '🛒' : '✋'}
                              </span>
                            </div>
                          </div>
                          <div className="ml-5 w-0 flex-1">
                            <dl>
                              <dt className="text-sm font-medium text-gray-500 truncate">
                                {source.movementSource} Movements
                              </dt>
                              <dd className="text-lg font-medium text-gray-900">
                                {source.dataValues?.count || 0}
                              </dd>
                            </dl>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Form Panel */}
          {showForm && (
            <div className="bg-white shadow sm:rounded-lg mb-6">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  {editingMovement ? 'Edit Movement' : 'Add Material Movement'}
                </h3>
                <div className="mt-5">
                  <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                      {/* Movement Type */}
                      <div className="sm:col-span-2">
                        <label htmlFor="movementType" className="block text-sm font-medium text-gray-700">
                          Movement Type *
                        </label>
                        <select
                          id="movementType"
                          name="movementType"
                          value={formData.movementType}
                          onChange={handleChange}
                          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                          required
                        >
                          <option value="MASUK">MASUK (In)</option>
                          <option value="KELUAR">KELUAR (Out)</option>
                        </select>
                      </div>

                      {/* Material Selection */}
                      <div className="sm:col-span-4">
                        <label htmlFor="materialId" className="block text-sm font-medium text-gray-700">
                          Material *
                        </label>
                        <select
                          id="materialId"
                          name="materialId"
                          value={formData.materialId}
                          onChange={handleChange}
                          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                          required
                        >
                          <option value="">Select Material</option>
                          {materials.map((material) => (
                            <option key={material.id} value={material.id}>
                              {material.name} ({material.code}) - Stock: {material.qtyOnHand} {material.unit}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Quantity */}
                      <div className="sm:col-span-2">
                        <label htmlFor="qty" className="block text-sm font-medium text-gray-700">
                          Quantity *
                        </label>
                        <input
                          type="number"
                          name="qty"
                          id="qty"
                          min="0.01"
                          step="0.01"
                          value={formData.qty}
                          onChange={handleChange}
                          className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                          required
                        />
                      </div>

                      {/* Unit Price */}
                      <div className="sm:col-span-2">
                        <label htmlFor="unitPrice" className="block text-sm font-medium text-gray-700">
                          Unit Price (IDR)
                        </label>
                        <input
                          type="number"
                          name="unitPrice"
                          id="unitPrice"
                          min="0"
                          step="0.01"
                          value={formData.unitPrice}
                          onChange={handleChange}
                          className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                          placeholder="Optional"
                        />
                      </div>

                      {/* Reference Number */}
                      <div className="sm:col-span-2">
                        <label htmlFor="referenceNumber" className="block text-sm font-medium text-gray-700">
                          Reference Number
                        </label>
                        <input
                          type="text"
                          name="referenceNumber"
                          id="referenceNumber"
                          value={formData.referenceNumber}
                          onChange={handleChange}
                          className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                          placeholder="e.g., INV-001, ADJ-001"
                        />
                      </div>

                      {/* Description */}
                      <div className="sm:col-span-3">
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                          Description
                        </label>
                        <input
                          type="text"
                          name="description"
                          id="description"
                          value={formData.description}
                          onChange={handleChange}
                          className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                          placeholder="Brief description of movement"
                        />
                      </div>

                      {/* Notes */}
                      <div className="sm:col-span-3">
                        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                          Notes
                        </label>
                        <textarea
                          name="notes"
                          id="notes"
                          rows={2}
                          value={formData.notes}
                          onChange={handleChange}
                          className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                          placeholder="Additional notes"
                        />
                      </div>
                    </div>

                    <div className="mt-5 flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={resetForm}
                        className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        {isSubmitting ? 'Saving...' : (editingMovement ? 'Update' : 'Save')}
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
                {/* Movement Type Filter */}
                <div className="sm:col-span-1">
                  <label htmlFor="typeFilter" className="block text-sm font-medium text-gray-700">
                    Type
                  </label>
                  <select
                    id="typeFilter"
                    name="movementType"
                    value={filter.movementType}
                    onChange={handleFilterChange}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  >
                    <option value="">All Types</option>
                    <option value="MASUK">MASUK</option>
                    <option value="KELUAR">KELUAR</option>
                  </select>
                </div>

                {/* Movement Source Filter */}
                <div className="sm:col-span-1">
                  <label htmlFor="sourceFilter" className="block text-sm font-medium text-gray-700">
                    Source
                  </label>
                  <select
                    id="sourceFilter"
                    name="movementSource"
                    value={filter.movementSource}
                    onChange={handleFilterChange}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  >
                    <option value="">All Sources</option>
                    <option value="purchase">Purchase</option>
                    <option value="manual">Manual</option>
                    <option value="production">Production</option>
                    <option value="adjustment">Adjustment</option>
                  </select>
                </div>

                {/* Material Filter */}
                <div className="sm:col-span-2">
                  <label htmlFor="materialFilter" className="block text-sm font-medium text-gray-700">
                    Material
                  </label>
                  <select
                    id="materialFilter"
                    name="materialId"
                    value={filter.materialId}
                    onChange={handleFilterChange}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  >
                    <option value="">All Materials</option>
                    {materials.map((material) => (
                      <option key={material.id} value={material.id}>
                        {material.name} ({material.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date From */}
                <div className="sm:col-span-1">
                  <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
                    From
                  </label>
                  <input
                    type="date"
                    name="startDate"
                    id="startDate"
                    value={filter.startDate}
                    onChange={handleFilterChange}
                    className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  />
                </div>

                {/* Date To */}
                <div className="sm:col-span-1">
                  <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
                    To
                  </label>
                  <input
                    type="date"
                    name="endDate"
                    id="endDate"
                    value={filter.endDate}
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
                    placeholder="Search by description, notes, or reference number"
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

          {/* Material Movements Table */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="overflow-x-auto">
              {loading ? (
                <div className="py-12 flex justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <>
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Source
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Material
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quantity
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Value
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Reference
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Purchase
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {movements.length === 0 ? (
                        <tr>
                          <td colSpan="9" className="px-6 py-4 text-center text-sm text-gray-500">
                            No material movements found
                          </td>
                        </tr>
                      ) : (
                        movements.map((movement) => (
                          <tr key={movement.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDate(movement.createdAt)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                movement.movementType === 'MASUK' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {movement.movementType}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSourceBadge(movement.movementSource)}`}>
                                {movement.movementSource}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {movement.Material ? (
                                <>
                                  {movement.Material.name}
                                  <span className="text-xs text-gray-500 ml-1">
                                    ({movement.Material.code})
                                  </span>
                                </>
                              ) : (
                                'Unknown Material'
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {movement.qty} {movement.Material ? movement.Material.unit : 'units'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatCurrency(movement.totalValue)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {movement.referenceNumber || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {movement.PurchaseLog ? (
                                <div>
                                  <div className="font-medium">{movement.PurchaseLog.supplier}</div>
                                  <div className="text-xs text-gray-400">
                                    {formatDate(movement.PurchaseLog.purchasedDate)}
                                  </div>
                                </div>
                              ) : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              {movement.movementSource !== 'purchase' ? (
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => handleEdit(movement)}
                                    className="text-blue-600 hover:text-blue-900"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDelete(movement)}
                                    className="text-red-600 hover:text-red-900"
                                  >
                                    Delete
                                  </button>
                                </div>
                              ) : (
                                <span className="text-gray-400">Auto-generated</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>

                  {/* Pagination */}
                  {pagination.pages > 1 && (
                    <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                      <div className="flex-1 flex justify-between sm:hidden">
                        <button
                          onClick={() => handlePageChange(pagination.current - 1)}
                          disabled={pagination.current <= 1}
                          className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => handlePageChange(pagination.current + 1)}
                          disabled={pagination.current >= pagination.pages}
                          className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                        >
                          Next
                        </button>
                      </div>
                      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm text-gray-700">
                            Showing{' '}
                            <span className="font-medium">
                              {((pagination.current - 1) * pagination.limit) + 1}
                            </span>{' '}
                            to{' '}
                            <span className="font-medium">
                              {Math.min(pagination.current * pagination.limit, pagination.total)}
                            </span>{' '}
                            of{' '}
                            <span className="font-medium">{pagination.total}</span>{' '}
                            results
                          </p>
                        </div>
                        <div>
                          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                            <button
                              onClick={() => handlePageChange(pagination.current - 1)}
                              disabled={pagination.current <= 1}
                              className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                            >
                              Previous
                            </button>
                            {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
                              <button
                                key={page}
                                onClick={() => handlePageChange(page)}
                                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                  page === pagination.current
                                    ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                }`}
                              >
                                {page}
                              </button>
                            ))}
                            <button
                              onClick={() => handlePageChange(pagination.current + 1)}
                              disabled={pagination.current >= pagination.pages}
                              className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                            >
                              Next
                            </button>
                          </nav>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </DashboardLayout>
    </AuthWrapper>
  );
} 