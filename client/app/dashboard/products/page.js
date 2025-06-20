'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthWrapper from '../../components/AuthWrapper';
import DashboardLayout from '../../components/DashboardLayout';
import Link from 'next/link';
import Image from 'next/image';

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const router = useRouter();

  // Filter and Search states
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    material: '',
    priceMin: '',
    priceMax: '',
    stockLevel: 'all', // all, inStock, lowStock, outOfStock
    status: 'all', // all, active, inactive
  });

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalProducts, setTotalProducts] = useState(0);

  // View toggle state
  const [viewMode, setViewMode] = useState('table'); // table, grid

  // Sorting state
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('DESC');

  // Bulk operations state
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [bulkAction, setBulkAction] = useState('');

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, productId: null, productName: '' });

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (!token || !storedUser) {
      router.push('/login');
      return;
    }

    try {
      setUser(JSON.parse(storedUser));
    } catch (error) {
      console.error('Error parsing user data:', error);
      router.push('/login');
      return;
    }
  }, [router]);

  // Manual refresh function with cache busting to get latest stock
  const refreshProducts = async () => {
    const timestamp = Date.now();
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        sortBy,
        sortOrder,
        _t: timestamp.toString(), // Cache busting parameter
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value && value !== 'all')
        )
      });

      const response = await fetch(`http://localhost:8080/api/products?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }

      const data = await response.json();

      if (data.success) {
        setProducts(data.products || []);
        setTotalProducts(data.pagination?.total || 0);
      } else {
        setProducts(data.products || data || []);
        setTotalProducts(data.total || data.length || 0);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setError('Failed to load products');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Fetch products with filters and pagination
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        sortBy,
        sortOrder,
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value && value !== 'all')
        )
      });

      const response = await fetch(`http://localhost:8080/api/products?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }

      const data = await response.json();

      if (data.success) {
        setProducts(data.products || []);
        setTotalProducts(data.pagination?.total || 0);
      } else {
        setProducts(data.products || data || []);
        setTotalProducts(data.total || data.length || 0);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setError('Failed to load products');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Fetch materials for filter dropdown
  const fetchMaterials = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8080/api/materials-management?limit=100', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.materials) {
          setMaterials(data.data.materials);
        } else {
          setMaterials(data.materials || data || []);
        }
      }
    } catch (error) {
      console.error('Error fetching materials:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchProducts();
      fetchMaterials();
    }
  }, [user, currentPage, pageSize, sortBy, sortOrder, filters]);

  // Filter handlers
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filtering
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      category: '',
      material: '',
      priceMin: '',
      priceMax: '',
      stockLevel: 'all',
      status: 'all',
    });
    setCurrentPage(1);
  };

  // Bulk operations handlers
  const handleSelectProduct = (productId) => {
    setSelectedProducts(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleSelectAll = () => {
    if (selectedProducts.length === products.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(products.map(p => p.id));
    }
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedProducts.length === 0) return;

    // Handle export separately (placeholder for future implementation)
    if (bulkAction === 'export') {
      alert('Export functionality will be implemented soon');
      setBulkAction('');
      return;
    }

    // For bulk delete, we'll check first
    if (bulkAction === 'delete') {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:8080/api/products/check-bulk-delete`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ productIds: selectedProducts }),
        });

        const data = await response.json();

        if (response.ok && data.canDelete) {
          // If all products can be deleted, show confirmation
          if (confirm(`Are you sure you want to delete ${selectedProducts.length} products? This action cannot be undone.`)) {
            await performBulkAction();
          }
        } else {
          // If some products can't be deleted, show error
          setError('Some products cannot be deleted because they are already used in existing orders. Only products that have never been ordered can be deleted.');
          setTimeout(() => setError(''), 3000);
        }
      } catch (error) {
        console.error('Check bulk delete failed:', error);
        setError('Failed to check if products can be deleted');
        setTimeout(() => setError(''), 3000);
      }
      return;
    }

    // For activate/deactivate actions, show confirmation
    if (bulkAction === 'activate' || bulkAction === 'deactivate') {
      const actionText = bulkAction === 'activate' ? 'activate' : 'deactivate';
      if (confirm(`Are you sure you want to ${actionText} ${selectedProducts.length} products?`)) {
        await performBulkAction();
      }
      return;
    }

    // For other bulk actions, proceed as normal
    await performBulkAction();
  };

  // Separate function for performing bulk delete/action
  const performBulkAction = async () => {
    try {
      const token = localStorage.getItem('token');

      // Determine the correct API endpoint and payload based on action
      let endpoint = '';
      let payload = { productIds: selectedProducts };

      switch (bulkAction) {
        case 'delete':
          endpoint = 'http://localhost:8080/api/products/bulk/delete';
          break;
        case 'activate':
          endpoint = 'http://localhost:8080/api/products/bulk/activate';
          break;
        case 'deactivate':
          endpoint = 'http://localhost:8080/api/products/bulk/deactivate';
          break;
        default:
          endpoint = `http://localhost:8080/api/products/bulk/${bulkAction}`;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        refreshProducts();
        setSelectedProducts([]);
        setBulkAction('');

        // Show success message
        const actionText = bulkAction === 'activate' ? 'activated' :
          bulkAction === 'deactivate' ? 'deactivated' :
            bulkAction === 'delete' ? 'deleted' : bulkAction;
        alert(data.message || `${selectedProducts.length} products ${actionText} successfully`);
      } else {
        setError(data.message || `Failed to ${bulkAction} products`);
        setTimeout(() => setError(''), 3000);
      }
    } catch (error) {
      console.error('Bulk action failed:', error);
      setError(error.message || `Failed to ${bulkAction} products`);
      setTimeout(() => setError(''), 3000);
    }
  };

  // Individual delete function
  const handleDeleteProduct = async (productId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8080/api/products/${productId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        setDeleteConfirm({ show: false, productId: null, productName: '' });
        refreshProducts(); // Use refreshProducts to get latest data
        alert('Product deleted successfully');
      } else {
        // Handle specific error message for products used in orders
        if (data.message?.includes('Cannot delete products that are used in existing orders')) {
          setError('This product cannot be deleted because it is already used in existing orders. Only products that have never been ordered can be deleted.');
          setTimeout(() => setError(''), 3000);
        } else {
          setError(data.message || 'Failed to delete product');
          setTimeout(() => setError(''), 3000);
        }
      }
    } catch (error) {
      console.error('Delete failed:', error);
      setError('Failed to delete product');
      setTimeout(() => setError(''), 3000);
    }
  };

  // Check if product can be deleted
  const checkProductDeletable = async (productId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8080/api/products/${productId}/check-delete`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok && data.canDelete) {
        // If product can be deleted, show confirmation modal
        const product = products.find(p => p.id === productId);
        setDeleteConfirm({
          show: true,
          productId: productId,
          productName: product?.name || 'this product'
        });
      } else {
        // If product cannot be deleted, show error message directly
        setError('This product cannot be deleted because it is already used in existing orders. Only products that have never been ordered can be deleted.');
        setTimeout(() => setError(''), 3000);
      }
    } catch (error) {
      console.error('Check delete failed:', error);
      setError('Failed to check if product can be deleted');
      setTimeout(() => setError(''), 3000);
    }
  };

  // Get unique categories for filter
  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];

  if (!user) return null;

  return (
    <AuthWrapper>
      <DashboardLayout user={user}>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Products</h1>
              <p className="text-gray-600">Manage your product catalog</p>
            </div>
            <div className="flex items-center space-x-3">
              {/* View Toggle */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${viewMode === 'table'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  📋 Table
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${viewMode === 'grid'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  🔲 Grid
                </button>
              </div>

              <button
                onClick={refreshProducts}
                disabled={loading}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 flex items-center space-x-2 disabled:opacity-50"
              >
                <span>🔄</span>
                <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
              </button>
              {/* <Link
                href="/dashboard/products/analytics"
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 flex items-center space-x-2"
              >
                <span>📊</span>
                <span>Analytics</span>
              </Link> */}
              <Link
                href="/dashboard/products/create"
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center space-x-2"
              >
                <span>➕</span>
                <span>Add Product</span>
              </Link>
            </div>
          </div>

          {/* Filters Panel */}
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search
                </label>
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  placeholder="Search products..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Categories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              {/* Material Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Material
                </label>
                <select
                  value={filters.material}
                  onChange={(e) => handleFilterChange('material', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Materials</option>
                  {materials.map(material => (
                    <option key={material.id} value={material.id}>{material.name}</option>
                  ))}
                </select>
              </div>

              {/* Stock Level Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stock Level
                </label>
                <select
                  value={filters.stockLevel}
                  onChange={(e) => handleFilterChange('stockLevel', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Stock</option>
                  <option value="inStock">In Stock</option>
                  <option value="lowStock">Low Stock</option>
                  <option value="outOfStock">Out of Stock</option>
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className=" flex items-end">
                <button
                  type="button"
                  onClick={clearFilters}
                  className="w-full py-2 px-4 border mb-1 border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Clear All
                </button>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-600 border border-red-700 text-white px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Bulk Actions Bar */}
          {!loading && selectedProducts.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium text-blue-900">
                    {selectedProducts.length} product{selectedProducts.length > 1 ? 's' : ''} selected
                  </span>
                  <select
                    value={bulkAction}
                    onChange={(e) => setBulkAction(e.target.value)}
                    className="px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Select Action</option>
                    <option value="delete">Delete Selected</option>
                    <option value="activate">Activate Selected</option>
                    <option value="deactivate">Deactivate Selected</option>
                  </select>
                  <button
                    onClick={handleBulkAction}
                    disabled={!bulkAction}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Apply Action
                  </button>
                </div>
                <button
                  onClick={() => setSelectedProducts([])}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          )}

          {/* Products Content */}
          {!loading && (
            <>
              {viewMode === 'table' ? (
                <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left">
                            <input
                              type="checkbox"
                              checked={selectedProducts.length === products.length && products.length > 0}
                              onChange={handleSelectAll}
                              className="rounded border-gray-300"
                            />
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Photo
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Product
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Category
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Price
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Stock
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
                        {products.map((product) => (
                          <tr key={product.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <input
                                type="checkbox"
                                checked={selectedProducts.includes(product.id)}
                                onChange={() => handleSelectProduct(product.id)}
                                className="rounded border-gray-300"
                              />
                            </td>
                            <td className="px-6 py-4">
                              <div className="h-12 w-12 bg-gray-200 rounded-lg overflow-hidden relative">
                                {product.photos && product.photos.length > 0 ? (
                                  <Image
                                    src={`http://localhost:8080${product.photos.find(p => p.isPrimary)?.thumbnailPath || product.photos[0]?.thumbnailPath || product.photos.find(p => p.isPrimary)?.photoPath || product.photos[0]?.photoPath}`}
                                    alt={product.name}
                                    fill
                                    className="object-cover"
                                    sizes="48px"
                                    unoptimized
                                  />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center text-gray-400">
                                    📷
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {product.name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {product.code}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {product.category || '-'}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {product.price ? `Rp ${Number(product.price).toLocaleString('id-ID')}` : '-'}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              <span className={`inline-flex px-2 py-1 text-xs rounded-full ${product.qtyOnHand === 0
                                ? 'bg-red-600 text-white'
                                : product.qtyOnHand < 10
                                  ? 'bg-yellow-600 text-white'
                                  : 'bg-green-600 text-white'
                                }`}>
                                {product.qtyOnHand} {product.unit}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              <span className={`inline-flex px-2 py-1 text-xs rounded-full ${product.isActive
                                ? 'bg-green-600 text-white'
                                : 'bg-gray-600 text-white'
                                }`}>
                                {product.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm font-medium space-x-2">
                              <Link
                                href={`/dashboard/products/${product.id}`}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                View
                              </Link>
                              <Link
                                href={`/dashboard/products/${product.id}/edit`}
                                className="text-indigo-600 hover:text-indigo-900"
                              >
                                Edit
                              </Link>
                              {user?.role === 'admin' && (
                                <Link
                                  href={`/dashboard/products/${product.id}/stock`}
                                  className="text-green-600 hover:text-green-900"
                                >
                                  Stock
                                </Link>
                              )}
                              <button
                                onClick={() => checkProductDeletable(product.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {products.map((product) => (
                    <div key={product.id} className="bg-white rounded-lg shadow-sm border overflow-hidden">
                      <div className="aspect-square bg-gray-200 relative">
                        {product.photos && product.photos.length > 0 ? (
                          <Image
                            src={`http://localhost:8080${product.photos.find(p => p.isPrimary)?.photoPath || product.photos[0]?.photoPath}`}
                            alt={product.name}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            unoptimized
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-gray-400 text-4xl">
                            📷
                          </div>
                        )}
                        <div className="absolute top-2 right-2">
                          <input
                            type="checkbox"
                            checked={selectedProducts.includes(product.id)}
                            onChange={() => handleSelectProduct(product.id)}
                            className="rounded border-gray-300"
                          />
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="font-medium text-gray-900 truncate">{product.name}</h3>
                        <p className="text-sm text-gray-500">{product.code}</p>
                        <div className="mt-2 flex justify-between items-center">
                          <span className="text-lg font-bold text-gray-900">
                            {product.price ? `Rp ${Number(product.price).toLocaleString('id-ID')}` : '-'}
                          </span>
                          <span className={`px-2 py-1 text-xs rounded-full ${product.qtyOnHand === 0
                            ? 'bg-red-600 text-white'
                            : product.qtyOnHand < 10
                              ? 'bg-yellow-600 text-white'
                              : 'bg-green-600 text-white'
                            }`}>
                            {product.qtyOnHand} {product.unit}
                          </span>
                        </div>
                        <div className="mt-3 flex space-x-2">
                          <Link
                            href={`/dashboard/products/${product.id}`}
                            className="flex-1 px-3 py-2 bg-blue-500 text-white text-center text-sm rounded hover:bg-blue-600"
                          >
                            View
                          </Link>
                          <Link
                            href={`/dashboard/products/${product.id}/edit`}
                            className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 text-center text-sm rounded hover:bg-gray-200"
                          >
                            Edit
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {totalProducts > pageSize && (
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalProducts)} of {totalProducts} products
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <span className="px-3 py-2 text-sm">
                      Page {currentPage} of {Math.ceil(totalProducts / pageSize)}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(totalProducts / pageSize)))}
                      disabled={currentPage >= Math.ceil(totalProducts / pageSize)}
                      className="px-3 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DashboardLayout>

      {/* Delete Confirmation Modal */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Delete Product</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete &quot;{deleteConfirm.productName}&quot;? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setDeleteConfirm({ show: false, productId: null, productName: '' })}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteProduct(deleteConfirm.productId)}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthWrapper>
  );
} 