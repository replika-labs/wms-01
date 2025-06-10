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
    quantity: '',
    movementType: 'IN',
    notes: '',
    costPerUnit: '',
    movementDate: ''
  });

  // Filter state
  const [filter, setFilter] = useState({
    movementType: '',
    materialId: '',
    startDate: '',
    endDate: '',
    search: '',
    page: 1,
    limit: 10
  });

  // View state
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

        if (movementsData.success) {
          setMovements(movementsData.data.movements || []);
          setPagination(movementsData.data.pagination || {});
        } else {
          throw new Error(movementsData.message || 'Failed to fetch movements');
        }

        // Fetch materials for dropdown
        const materialsResponse = await fetch('/api/materials-management', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!materialsResponse.ok) {
          console.warn('Failed to fetch materials, using empty array');
          setMaterials([]);
        } else {
          const materialsData = await materialsResponse.json();

          if (materialsData.success && materialsData.data && Array.isArray(materialsData.data.materials)) {
            setMaterials(materialsData.data.materials);
          } else if (materialsData.success && Array.isArray(materialsData.data)) {
            setMaterials(materialsData.data);
          } else if (Array.isArray(materialsData)) {
            // Handle case where API returns array directly
            setMaterials(materialsData);
          } else {
            console.warn('Materials data is not in expected format:', materialsData);
            setMaterials([]);
          }
        }

        // Fetch analytics if tab is active
        if (showAnalytics) {
          const analyticsResponse = await fetch(`/api/material-movements/analytics?${queryParams.toString()}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (analyticsResponse.ok) {
            const analyticsData = await analyticsResponse.json();
            if (analyticsData.success) {
              setAnalytics(analyticsData.data);
            }
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
      quantity: '',
      movementType: 'IN',
      notes: '',
      costPerUnit: '',
      movementDate: ''
    });
    setEditingMovement(null);
    setShowForm(false);
  };

  // Handle edit movement
  const handleEdit = (movement) => {
    if (movement.purchaseLogId) {
      setError('Cannot edit purchase-generated movements');
      return;
    }

    setFormData({
      materialId: movement.materialId,
      quantity: movement.quantity,
      movementType: movement.movementType,
      notes: movement.notes || '',
      costPerUnit: movement.costPerUnit || '',
      movementDate: movement.movementDate ? new Date(movement.movementDate).toISOString().split('T')[0] : ''
    });
    setEditingMovement(movement);
    setShowForm(true);
  };

  // Handle delete movement
  const handleDelete = async (movement) => {
    if (movement.purchaseLogId) {
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
        throw new Error(errorData.message || 'Failed to delete movement');
      }

      const result = await response.json();
      if (result.success) {
        setSuccess('Movement deleted successfully');
        // Refresh data
        setFilter({ ...filter });
      } else {
        throw new Error(result.message || 'Failed to delete movement');
      }

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
      if (!formData.materialId || !formData.quantity || !formData.movementType) {
        throw new Error('Material, quantity, and movement type are required');
      }

      if (formData.quantity <= 0) {
        throw new Error('Quantity must be greater than 0');
      }

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Prepare submission data
      const submitData = {
        materialId: parseInt(formData.materialId),
        quantity: parseFloat(formData.quantity),
        movementType: formData.movementType,
        notes: formData.notes,
        costPerUnit: formData.costPerUnit ? parseFloat(formData.costPerUnit) : null,
        movementDate: formData.movementDate ? formData.movementDate : null
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

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || `Failed to ${editingMovement ? 'update' : 'create'} movement`);
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

  // Get movement type badge
  const getMovementTypeBadge = (movementType) => {
    const badges = {
      IN: 'bg-green-100 text-green-800',
      OUT: 'bg-red-100 text-red-800',
      // ADJUST: 'bg-yellow-100 text-yellow-800'
    };

    return badges[movementType] || 'bg-gray-100 text-gray-800';
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
            {/* <div className="flex space-x-3">
              <button
                onClick={() => setShowAnalytics(!showAnalytics)}
                className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium ${showAnalytics
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
            </div> */}
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

                  {analytics.movementsByType && analytics.movementsByType.map((typeData, index) => (
                    <div key={index} className="bg-gray-50 overflow-hidden shadow rounded-lg">
                      <div className="p-5">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-gray-500 rounded-md flex items-center justify-center">
                              <span className="text-white text-sm font-medium">
                                {typeData.movementType === 'IN' ? '⬇️' : typeData.movementType === 'OUT' ? '⬆️' : '🔄'}
                              </span>
                            </div>
                          </div>
                          <div className="ml-5 w-0 flex-1">
                            <dl>
                              <dt className="text-sm font-medium text-gray-500 truncate">
                                {typeData.movementType} Movements
                              </dt>
                              <dd className="text-lg font-medium text-gray-900">
                                {typeData._count.id || 0}
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
                    <option value="IN">IN</option>
                    <option value="OUT">OUT</option>
                    {/* <option value="ADJUST">ADJUST</option> */}
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
                    {Array.isArray(materials) && materials.map((material) => (
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

                {/* Reset Button */}
                <div className="sm:col-span-1 flex items-end">
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Reset
                  </button>
                </div>

                {/* Search */}
                <div className="sm:col-span-6">
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
                    placeholder="Search by notes, material name, or code"
                  />
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
                          Material
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quantity
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Stock After
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Cost
                        </th>
                        {/* <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User
                        </th> */}
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Description
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
                              {formatDate(movement.movementDate)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getMovementTypeBadge(movement.movementType)}`}>
                                {movement.movementType}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {movement.material ? (
                                <>
                                  {movement.material.name}
                                  <span className="text-xs text-gray-500 ml-1">
                                    ({movement.material.code})
                                  </span>
                                </>
                              ) : (
                                'Unknown Material'
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {movement.quantity} {movement.unit}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {movement.qtyAfter} {movement.unit}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatCurrency(movement.totalCost)}
                            </td>
                            {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {movement.user ? movement.user.name : 'System'}
                            </td> */}
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {movement.purchaseLog ? (
                                <div>
                                  <div className="font-medium">{movement.purchaseLog.supplier}</div>
                                  <div className="text-xs text-gray-400">
                                    {formatDate(movement.purchaseLog.purchaseDate)}
                                  </div>
                                </div>
                              ) : '-'}
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
                                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${page === pagination.current
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