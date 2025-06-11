'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AuthWrapper from '../../../components/AuthWrapper';
import DashboardLayout from '../../../components/DashboardLayout';
import Link from 'next/link';

export default function ProductDetailPage() {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const router = useRouter();
  const params = useParams();
  const productId = params.id;

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

  // Fetch product details
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');

        const response = await fetch(`http://localhost:8080/api/products/${productId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch product details');
        }

        const data = await response.json();
        if (data.success && data.product) {
          setProduct(data.product);
        } else {
          setProduct(data);
        }
      } catch (error) {
        console.error('Error fetching product:', error);
        setError('Failed to load product details');
      } finally {
        setLoading(false);
      }
    };

    if (user && productId) {
      fetchProduct();
    }
  }, [user, productId]);

  // Handle product deletion
  const handleDelete = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8080/api/products/${productId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        router.push('/dashboard/products');
      } else {
        throw new Error('Failed to delete product');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      setError('Failed to delete product');
    }
  };

  // Handle status toggle
  const handleStatusToggle = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8080/api/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isActive: !product.isActive
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const updatedProduct = data.success && data.product ? data.product : data;
        setProduct(updatedProduct);
      } else {
        throw new Error('Failed to update product status');
      }
    } catch (error) {
      console.error('Error updating product status:', error);
      setError('Failed to update product status');
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <AuthWrapper>
        <DashboardLayout user={user}>
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </DashboardLayout>
      </AuthWrapper>
    );
  }

  if (error || !product) {
    return (
      <AuthWrapper>
        <DashboardLayout user={user}>
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error || 'Product not found'}
            </div>
            <Link
              href="/dashboard/products"
              className="inline-block px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              ← Back to Products
            </Link>
          </div>
        </DashboardLayout>
      </AuthWrapper>
    );
  }

  return (
    <AuthWrapper>
      <DashboardLayout user={user}>
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <Link
                href="/dashboard/products"
                className="text-blue-600 hover:text-blue-700 text-sm mb-2 inline-block"
              >
                ← Back to Products
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
              <p className="text-gray-600">Product Code: {product.code}</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleStatusToggle}
                className={`px-4 py-2 rounded-lg text-sm font-medium cursor-pointer ${product.isActive
                  ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                  : 'bg-green-100 text-green-800 hover:bg-green-200'
                  }`}
              >
                {product.isActive ? 'Deactivate' : 'Activate'}
              </button>
              <Link
                href={`/dashboard/products/${product.id}/edit`}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Edit Product
              </Link>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Photo Gallery */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Photos</h2>

              {product.photos && product.photos.length > 0 ? (
                <div className="space-y-4">
                  {/* Main Photo */}
                  <div className="aspect-square bg-gray-200 rounded-lg overflow-hidden">
                    <img
                      src={`http://localhost:8080${product.photos[currentPhotoIndex]?.photoPath}`}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Thumbnail Navigation */}
                  {product.photos.length > 1 && (
                    <div className="grid grid-cols-6 gap-2">
                      {product.photos.map((photo, index) => (
                        <button
                          key={photo.id}
                          onClick={() => setCurrentPhotoIndex(index)}
                          className={`aspect-square bg-gray-200 rounded-lg overflow-hidden border-2 ${index === currentPhotoIndex ? 'border-blue-500' : 'border-transparent'
                            }`}
                        >
                          <img
                            src={`http://localhost:8080${photo.thumbnailPath || photo.photoPath}`}
                            alt={`${product.name} ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="aspect-square bg-gray-200 rounded-lg flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <div className="text-4xl mb-2">📷</div>
                    <p>No photos available</p>
                  </div>
                </div>
              )}
            </div>

            {/* Product Information */}
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Product Name</label>
                      <p className="text-gray-900">{product.name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Product Code</label>
                      <p className="text-gray-900 font-mono">{product.code}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Category</label>
                      <p className="text-gray-900">{product.category || '-'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Status</label>
                      <span className={`inline-flex px-2 py-1 text-xs rounded-full ${product.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                        }`}>
                        {product.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>

                  {product.baseMaterial && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Base Material</label>
                      <p className="text-gray-900">{product.baseMaterial.name} ({product.baseMaterial.code})</p>
                    </div>
                  )}

                  {product.description && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Description</label>
                      <p className="text-gray-900">{product.description}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Pricing & Inventory */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Pricing & Inventory</h2>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Base Price</label>
                    <p className="text-lg font-semibold text-gray-900">
                      {product.price ? `Rp ${Number(product.price).toLocaleString('id-ID')}` : '-'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Final Price</label>
                    <p className="text-2xl font-bold text-blue-600">
                      {product.finalPrice ? `Rp ${Number(product.finalPrice).toLocaleString('id-ID')}` : '-'}
                    </p>
                    {product.productVariation?.priceAdjustment && (
                      <p className="text-sm text-green-600">
                        +Rp {Number(product.productVariation.priceAdjustment).toLocaleString('id-ID')} variation
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Current Stock</label>
                    <p className="text-2xl font-bold text-gray-900">
                      {product.qtyOnHand} {product.unit}
                    </p>
                  </div>
                </div>

                {/* Stock Level Indicator */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-500 mb-2">Stock Level</label>
                  <div className={`px-3 py-2 rounded-lg text-sm ${product.qtyOnHand === 0
                    ? 'bg-red-100 text-red-800'
                    : product.qtyOnHand < 10
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-green-100 text-green-800'
                    }`}>
                    {product.qtyOnHand === 0
                      ? 'Out of Stock'
                      : product.qtyOnHand < 10
                        ? 'Low Stock'
                        : 'In Stock'
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Product Variation */}
          {product.productVariation && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Product Variation</h2>

              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-gray-900">{product.productVariation.variationType}: {product.productVariation.variationValue}</h3>
                    {product.productVariation.priceAdjustment && (
                      <p className="text-sm text-gray-500">
                        Price Adjustment: {product.productVariation.priceAdjustment > 0 ? '+' : ''}
                        Rp {Number(product.productVariation.priceAdjustment).toLocaleString('id-ID')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Product Color */}
          {product.productColor && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Product Color</h2>

              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-gray-900">{product.productColor.colorName}</h3>
                    {product.productColor.colorCode && (
                      <p className="text-sm text-gray-500">Code: {product.productColor.colorCode}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Record Information</h2>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <label className="block text-sm font-medium text-gray-500">Created At</label>
                <p className="text-gray-900">
                  {new Date(product.createdAt).toLocaleString('id-ID')}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Last Updated</label>
                <p className="text-gray-900">
                  {new Date(product.updatedAt).toLocaleString('id-ID')}
                </p>
              </div>
            </div>
          </div>

          {/* Delete Confirmation Modal */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Delete Product</h3>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to delete &quot;{product.name}&quot;? This action cannot be undone.
                </p>
                <div className="flex justify-end space-x-4">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    Delete
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