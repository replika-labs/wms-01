'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthWrapper from '../../../components/AuthWrapper';
import DashboardLayout from '../../../components/DashboardLayout';
import Link from 'next/link';

export default function ProductAnalyticsPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [analytics, setAnalytics] = useState({
    overview: {},
    categories: [],
    stockLevels: {},
    lowStockProducts: [],
    recentProducts: [],
    priceAnalysis: {}
  });
  const router = useRouter();

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

  // Fetch analytics data
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        // Fetch all products for analysis
        const response = await fetch('http://localhost:8080/api/products', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch products data');
        }

        const products = await response.json();
        
        // Process analytics data
        const processedAnalytics = processProductsData(products);
        setAnalytics(processedAnalytics);
        
      } catch (error) {
        console.error('Error fetching analytics:', error);
        setError('Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchAnalytics();
    }
  }, [user]);

  // Process products data for analytics
  const processProductsData = (products) => {
    const activeProducts = products.filter(p => p.isActive);
    const totalProducts = products.length;
    const totalActiveProducts = activeProducts.length;
    const totalValue = activeProducts.reduce((sum, p) => sum + (p.price * p.qtyOnHand), 0);
    const totalStock = activeProducts.reduce((sum, p) => sum + p.qtyOnHand, 0);
    const avgPrice = activeProducts.length > 0 ? activeProducts.reduce((sum, p) => sum + Number(p.price || 0), 0) / activeProducts.length : 0;

    // Category analysis
    const categoryData = {};
    activeProducts.forEach(product => {
      const category = product.category || 'Uncategorized';
      if (!categoryData[category]) {
        categoryData[category] = {
          count: 0,
          totalValue: 0,
          totalStock: 0,
          avgPrice: 0
        };
      }
      categoryData[category].count++;
      categoryData[category].totalValue += (product.price * product.qtyOnHand);
      categoryData[category].totalStock += product.qtyOnHand;
    });

    // Calculate average prices for categories
    Object.keys(categoryData).forEach(category => {
      const categoryProducts = activeProducts.filter(p => (p.category || 'Uncategorized') === category);
      categoryData[category].avgPrice = categoryProducts.reduce((sum, p) => sum + Number(p.price || 0), 0) / categoryProducts.length;
    });

    const categories = Object.entries(categoryData).map(([name, data]) => ({
      name,
      ...data,
      percentage: (data.count / totalActiveProducts) * 100
    })).sort((a, b) => b.count - a.count);

    // Stock level analysis
    const stockLevels = {
      inStock: activeProducts.filter(p => p.qtyOnHand > 10).length,
      lowStock: activeProducts.filter(p => p.qtyOnHand > 0 && p.qtyOnHand <= 10).length,
      outOfStock: activeProducts.filter(p => p.qtyOnHand === 0).length
    };

    // Low stock products (≤ 10 items)
    const lowStockProducts = activeProducts
      .filter(p => p.qtyOnHand <= 10)
      .sort((a, b) => a.qtyOnHand - b.qtyOnHand)
      .slice(0, 10);

    // Recent products (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentProducts = products
      .filter(p => new Date(p.createdAt) >= thirtyDaysAgo)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);

    // Price analysis
    const prices = activeProducts.map(p => Number(p.price || 0)).filter(p => p > 0);
    const priceAnalysis = {
      min: prices.length > 0 ? Math.min(...prices) : 0,
      max: prices.length > 0 ? Math.max(...prices) : 0,
      avg: avgPrice,
      median: prices.length > 0 ? prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)] : 0
    };

    return {
      overview: {
        totalProducts,
        totalActiveProducts,
        totalValue,
        totalStock,
        avgPrice: priceAnalysis.avg
      },
      categories,
      stockLevels,
      lowStockProducts,
      recentProducts,
      priceAnalysis
    };
  };

  // Format currency
  const formatCurrency = (amount) => {
    return `Rp ${Number(amount).toLocaleString('id-ID')}`;
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

  return (
    <AuthWrapper>
      <DashboardLayout user={user}>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Product Analytics</h1>
              <p className="text-gray-600">Insights and statistics about your product catalog</p>
            </div>
            <Link
              href="/dashboard/products"
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              ← Back to Products
            </Link>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center">
                <div className="text-2xl mr-3">📦</div>
                <div>
                  <p className="text-sm text-gray-600">Total Products</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics.overview.totalProducts}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center">
                <div className="text-2xl mr-3">✅</div>
                <div>
                  <p className="text-sm text-gray-600">Active Products</p>
                  <p className="text-2xl font-bold text-green-600">{analytics.overview.totalActiveProducts}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center">
                <div className="text-2xl mr-3">💰</div>
                <div>
                  <p className="text-sm text-gray-600">Total Inventory Value</p>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(analytics.overview.totalValue)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center">
                <div className="text-2xl mr-3">📊</div>
                <div>
                  <p className="text-sm text-gray-600">Total Stock Units</p>
                  <p className="text-2xl font-bold text-purple-600">{analytics.overview.totalStock}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Distribution */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Category Distribution</h2>
              
              <div className="space-y-4">
                {analytics.categories.slice(0, 5).map((category, index) => (
                  <div key={category.name} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-3 ${
                        index === 0 ? 'bg-blue-500' :
                        index === 1 ? 'bg-green-500' :
                        index === 2 ? 'bg-purple-500' :
                        index === 3 ? 'bg-yellow-500' : 'bg-gray-500'
                      }`}></div>
                      <span className="text-sm font-medium text-gray-900">{category.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-900">{category.count} products</div>
                      <div className="text-xs text-gray-500">{category.percentage.toFixed(1)}%</div>
                    </div>
                  </div>
                ))}
              </div>

              {analytics.categories.length > 5 && (
                <div className="mt-4 text-sm text-gray-500">
                  +{analytics.categories.length - 5} more categories
                </div>
              )}
            </div>

            {/* Stock Level Distribution */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Stock Level Distribution</h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-green-500 mr-3"></div>
                    <span className="text-sm font-medium text-gray-900">In Stock (&gt;10)</span>
                  </div>
                  <div className="text-sm font-semibold text-gray-900">{analytics.stockLevels.inStock} products</div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-yellow-500 mr-3"></div>
                    <span className="text-sm font-medium text-gray-900">Low Stock (1-10)</span>
                  </div>
                  <div className="text-sm font-semibold text-gray-900">{analytics.stockLevels.lowStock} products</div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-red-500 mr-3"></div>
                    <span className="text-sm font-medium text-gray-900">Out of Stock (0)</span>
                  </div>
                  <div className="text-sm font-semibold text-gray-900">{analytics.stockLevels.outOfStock} products</div>
                </div>
              </div>

              {/* Stock Level Alert */}
              {analytics.stockLevels.lowStock + analytics.stockLevels.outOfStock > 0 && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    ⚠️ {analytics.stockLevels.lowStock + analytics.stockLevels.outOfStock} products need attention
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Low Stock Alert */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Low Stock Alert</h2>
              
              {analytics.lowStockProducts.length > 0 ? (
                <div className="space-y-3">
                  {analytics.lowStockProducts.map((product) => (
                    <div key={product.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div className="flex items-center">
                        <div className="h-10 w-10 bg-gray-200 rounded-lg overflow-hidden mr-3">
                          {product.photos && product.photos.length > 0 ? (
                            <img
                              src={`http://localhost:8080${product.photos.find(p => p.isMainPhoto)?.thumbnailUrl || product.photos[0]?.thumbnailUrl}`}
                              alt={product.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-gray-400">
                              📷
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{product.name}</p>
                          <p className="text-xs text-gray-500">{product.code}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                          product.qtyOnHand === 0 
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {product.qtyOnHand} {product.unit}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">✅</div>
                  <p>All products are well stocked!</p>
                </div>
              )}
            </div>

            {/* Recent Products */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Recently Added Products</h2>
              
              {analytics.recentProducts.length > 0 ? (
                <div className="space-y-3">
                  {analytics.recentProducts.map((product) => (
                    <div key={product.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div className="flex items-center">
                        <div className="h-10 w-10 bg-gray-200 rounded-lg overflow-hidden mr-3">
                          {product.photos && product.photos.length > 0 ? (
                            <img
                              src={`http://localhost:8080${product.photos.find(p => p.isMainPhoto)?.thumbnailUrl || product.photos[0]?.thumbnailUrl}`}
                              alt={product.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-gray-400">
                              📷
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{product.name}</p>
                          <p className="text-xs text-gray-500">
                            Added {new Date(product.createdAt).toLocaleDateString('id-ID')}
                          </p>
                        </div>
                      </div>
                      <Link
                        href={`/dashboard/products/${product.id}`}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        View
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">📦</div>
                  <p>No recent products added</p>
                </div>
              )}
            </div>
          </div>

          {/* Price Analysis */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Price Analysis</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Minimum Price</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(analytics.priceAnalysis.min)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Average Price</p>
                <p className="text-xl font-bold text-blue-600">{formatCurrency(analytics.priceAnalysis.avg)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Median Price</p>
                <p className="text-xl font-bold text-purple-600">{formatCurrency(analytics.priceAnalysis.median)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Maximum Price</p>
                <p className="text-xl font-bold text-red-600">{formatCurrency(analytics.priceAnalysis.max)}</p>
              </div>
            </div>
          </div>

          {/* Category Details */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Category Performance</h2>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Products
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Stock
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Avg Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Value
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {analytics.categories.map((category) => (
                    <tr key={category.name}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {category.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {category.count}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {category.totalStock}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatCurrency(category.avgPrice)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatCurrency(category.totalValue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </AuthWrapper>
  );
} 