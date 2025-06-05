'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/app/components/DashboardLayout';
import AuthWrapper from '@/app/components/AuthWrapper';

export default function MaterialMovementAnalyticsPage() {
  const router = useRouter();
  const [analytics, setAnalytics] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filter state
  const [filter, setFilter] = useState({
    materialId: '',
    startDate: '',
    endDate: '',
    movementSource: ''
  });
  
  // Chart data state
  const [chartData, setChartData] = useState({
    movementTrends: [],
    sourceDistribution: [],
    materialBreakdown: []
  });

  // Fetch analytics data
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No authentication token found');
        }

        // Build query params
        const queryParams = new URLSearchParams();
        Object.keys(filter).forEach(key => {
          if (filter[key]) queryParams.append(key, filter[key]);
        });

        // Fetch analytics
        const analyticsResponse = await fetch(`/api/material-movements/analytics?${queryParams.toString()}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!analyticsResponse.ok) {
          throw new Error('Failed to fetch analytics');
        }

        const analyticsData = await analyticsResponse.json();
        setAnalytics(analyticsData);

        // Fetch materials for filter
        const materialsResponse = await fetch('/api/materials', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (materialsResponse.ok) {
          const materialsData = await materialsResponse.json();
          setMaterials(Array.isArray(materialsData) ? materialsData : []);
        }

        // Process chart data
        processChartData(analyticsData);

      } catch (err) {
        setError(err.message);
        console.error('Error fetching analytics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [filter]);

  // Process data for charts
  const processChartData = (data) => {
    // Process movement trends (mock data for now - would need time-series endpoint)
    const movementTrends = [
      { date: '2025-01-01', masuk: 50, keluar: 30 },
      { date: '2025-01-02', masuk: 75, keluar: 45 },
      { date: '2025-01-03', masuk: 60, keluar: 35 },
      { date: '2025-01-04', masuk: 90, keluar: 55 },
      { date: '2025-01-05', masuk: 80, keluar: 40 }
    ];

    // Process source distribution
    const sourceDistribution = data.movementsBySource?.map(source => ({
      name: source.movementSource,
      value: source.dataValues?.count || 0,
      qty: source.dataValues?.totalQty || 0
    })) || [];

    setChartData({
      movementTrends,
      sourceDistribution,
      materialBreakdown: []
    });
  };

  // Handle filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilter({
      ...filter,
      [name]: value
    });
  };

  // Reset filters
  const resetFilters = () => {
    setFilter({
      materialId: '',
      startDate: '',
      endDate: '',
      movementSource: ''
    });
  };

  // Format currency
  const formatCurrency = (amount) => {
    if (!amount) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(amount);
  };

  // Format number
  const formatNumber = (num) => {
    if (!num) return '0';
    return new Intl.NumberFormat('id-ID').format(num);
  };

  // Get percentage
  const getPercentage = (part, total) => {
    if (!total) return 0;
    return ((part / total) * 100).toFixed(1);
  };

  return (
    <AuthWrapper>
      <DashboardLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Material Movement Analytics</h1>
              <p className="mt-1 text-sm text-gray-600">
                Comprehensive insights into material movements and purchase integration
              </p>
            </div>
            <button
              onClick={() => router.push('/dashboard/material-movement')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              ← Back to Movements
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Analytics Filters
              </h3>
              <div className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-5">
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

                {/* Source Filter */}
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
              </div>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Reset Filters
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="py-12 flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : analytics ? (
            <>
              {/* Key Metrics */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-6">
                <div className="bg-white overflow-hidden shadow rounded-lg">
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
                            {formatNumber(analytics.totalMovements)}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                {analytics.summary && analytics.summary.map((item, index) => (
                  <div key={index} className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className={`w-8 h-8 rounded-md flex items-center justify-center ${
                            item.movementType === 'MASUK' ? 'bg-green-500' : 'bg-red-500'
                          }`}>
                            <span className="text-white text-sm font-medium">
                              {item.movementType === 'MASUK' ? '📈' : '📉'}
                            </span>
                          </div>
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 truncate">
                              {item.movementType} ({item.movementSource})
                            </dt>
                            <dd className="text-lg font-medium text-gray-900">
                              {formatNumber(item.dataValues?.count || 0)}
                            </dd>
                            <dd className="text-sm text-gray-500">
                              Qty: {formatNumber(item.dataValues?.totalQty || 0)}
                            </dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Movement Source Distribution */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                      Movement Sources Distribution
                    </h3>
                    {chartData.sourceDistribution.length > 0 ? (
                      <div className="space-y-4">
                        {chartData.sourceDistribution.map((source, index) => {
                          const total = chartData.sourceDistribution.reduce((sum, s) => sum + s.value, 0);
                          const percentage = getPercentage(source.value, total);
                          
                          return (
                            <div key={index} className="flex items-center justify-between">
                              <div className="flex items-center">
                                <div className={`w-4 h-4 rounded-full mr-3 ${
                                  source.name === 'purchase' ? 'bg-blue-500' :
                                  source.name === 'manual' ? 'bg-gray-500' :
                                  source.name === 'production' ? 'bg-purple-500' :
                                  'bg-yellow-500'
                                }`}></div>
                                <span className="text-sm font-medium text-gray-900 capitalize">
                                  {source.name}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="text-sm text-gray-500">
                                  {formatNumber(source.value)} ({percentage}%)
                                </span>
                                <div className="w-20 bg-gray-200 rounded-full h-2">
                                  <div 
                                    className={`h-2 rounded-full ${
                                      source.name === 'purchase' ? 'bg-blue-500' :
                                      source.name === 'manual' ? 'bg-gray-500' :
                                      source.name === 'production' ? 'bg-purple-500' :
                                      'bg-yellow-500'
                                    }`}
                                    style={{ width: `${percentage}%` }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-8">No movement data available</p>
                    )}
                  </div>
                </div>

                {/* Purchase Integration Insights */}
                <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                      Purchase Integration Insights
                    </h3>
                    <div className="space-y-4">
                      {analytics.movementsBySource?.map((source, index) => (
                        <div key={index} className="border-l-4 border-blue-400 pl-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-sm font-medium text-gray-900 capitalize">
                                {source.movementSource} Movements
                              </p>
                              <p className="text-sm text-gray-500">
                                {formatNumber(source.dataValues?.count || 0)} movements
                              </p>
                              <p className="text-sm text-gray-500">
                                Total Qty: {formatNumber(source.dataValues?.totalQty || 0)}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                source.movementSource === 'purchase' ? 'bg-blue-100 text-blue-800' :
                                source.movementSource === 'manual' ? 'bg-gray-100 text-gray-800' :
                                source.movementSource === 'production' ? 'bg-purple-100 text-purple-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {source.movementSource}
                              </span>
                            </div>
                          </div>
                        </div>
                      )) || (
                        <p className="text-gray-500 text-center py-8">No source data available</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Movement Trends (Mock Chart) */}
              <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Movement Trends (Last 5 Days)
                  </h3>
                  <div className="space-y-4">
                    {chartData.movementTrends.map((trend, index) => (
                      <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                        <div className="text-sm font-medium text-gray-900">
                          {new Date(trend.date).toLocaleDateString('id-ID', { 
                            weekday: 'short', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                            <span className="text-sm text-gray-600">Masuk: {trend.masuk}</span>
                          </div>
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                            <span className="text-sm text-gray-600">Keluar: {trend.keluar}</span>
                          </div>
                          <div className="text-sm font-medium text-gray-900">
                            Net: {trend.masuk - trend.keluar > 0 ? '+' : ''}{trend.masuk - trend.keluar}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Summary Statistics */}
              <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Summary Statistics
                  </h3>
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                    <div className="text-center">
                      <dt className="text-sm font-medium text-gray-500">
                        Purchase Automation Rate
                      </dt>
                      <dd className="mt-1 text-3xl font-semibold text-blue-600">
                        {analytics.movementsBySource?.find(s => s.movementSource === 'purchase') ? 
                          getPercentage(
                            analytics.movementsBySource.find(s => s.movementSource === 'purchase').dataValues?.count || 0,
                            analytics.totalMovements
                          ) : 0}%
                      </dd>
                    </div>
                    <div className="text-center">
                      <dt className="text-sm font-medium text-gray-500">
                        Manual Movements
                      </dt>
                      <dd className="mt-1 text-3xl font-semibold text-gray-600">
                        {analytics.movementsBySource?.find(s => s.movementSource === 'manual')?.dataValues?.count || 0}
                      </dd>
                    </div>
                    <div className="text-center">
                      <dt className="text-sm font-medium text-gray-500">
                        Total Movements Today
                      </dt>
                      <dd className="mt-1 text-3xl font-semibold text-green-600">
                        {analytics.totalMovements || 0}
                      </dd>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">No analytics data available</p>
            </div>
          )}
        </div>
      </DashboardLayout>
    </AuthWrapper>
  );
} 