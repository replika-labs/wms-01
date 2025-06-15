'use client';

import { useState, useEffect } from 'react';
import AuthWrapper from '../components/AuthWrapper';
import DashboardLayout from '../components/DashboardLayout';
import Link from 'next/link';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [summaryData, setSummaryData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);

        // Fetch summary data
        const fetchSummary = async () => {
          try {
            setLoading(true);
            const token = localStorage.getItem('token');
            if (!token) {
              throw new Error('No authentication token found');
            }

            console.log('Fetching dashboard summary...');
            const res = await fetch('/api/dashboard/summary', {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });

            if (!res.ok) {
              const errorData = await res.json().catch(() => ({}));
              console.error('API Error Response:', { status: res.status, statusText: res.statusText, data: errorData });
              throw new Error(`Failed to fetch summary: ${res.status} ${res.statusText}`);
            }

            const data = await res.json();
            console.log('Dashboard data loaded successfully');
            setSummaryData(data);
          } catch (err) {
            console.error('Failed to fetch summary:', err);
            setError(`Failed to load summary data: ${err.message}`);
            setTimeout(() => setError(''), 3000);
          } finally {
            setLoading(false);
          }
        };
        fetchSummary();
      } catch (e) {
        console.error("Failed to parse user from localStorage", e);
        setError('Failed to parse user information');
        setTimeout(() => setError(''), 3000);
      }
    }
  }, []);

  // Format date to readable format
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('id-ID', options);
  };

  // Helper function untuk mengecek apakah data tersedia
  const isValidData = (data) => {
    return data !== undefined && data !== null;
  };

  // Fallback component jika data tidak tersedia
  const DataUnavailable = ({ title, message = "Data tidak tersedia" }) => (
    <div className="p-4 bg-gray-50 rounded-lg text-center">
      <h3 className="font-medium text-gray-700">{title}</h3>
      <p className="text-gray-500 text-sm mt-1">{message}</p>
    </div>
  );

  // Render chart hanya jika data tersedia
  const renderOrderTrendChart = () => {
    if (!isValidData(summaryData?.orderTrend) || summaryData.orderTrend.length === 0) {
      return <DataUnavailable title="Order Trend" message="Tidak ada data tren order" />;
    }

    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={summaryData.orderTrend}
          margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#e5e7eb"
            strokeWidth={1}
          />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12, fill: '#374151' }}
            tickLine={{ stroke: '#6b7280' }}
            axisLine={{ stroke: '#6b7280' }}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis
            tick={{ fontSize: 12, fill: '#374151' }}
            tickLine={{ stroke: '#6b7280' }}
            axisLine={{ stroke: '#6b7280' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              color: '#374151'
            }}
            labelStyle={{ color: '#374151', fontWeight: 'bold' }}
          />
          <Legend
            wrapperStyle={{ color: '#374151', fontWeight: '500' }}
          />
          <Line
            type="monotone"
            dataKey="count"
            name="Orders"
            stroke="#2563eb"
            activeDot={{ r: 6, fill: '#2563eb', stroke: '#ffffff', strokeWidth: 2 }}
            strokeWidth={3}
            dot={{ fill: '#2563eb', strokeWidth: 2, stroke: '#ffffff', r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  // Render chart hanya jika data tersedia
  const renderProductionTrendChart = () => {
    if (!isValidData(summaryData?.productionTrend) || summaryData.productionTrend.length === 0) {
      return <DataUnavailable title="Production Trend" message="Tidak ada data tren produksi" />;
    }

    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={summaryData.productionTrend}
          margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#e5e7eb"
            strokeWidth={1}
          />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12, fill: '#374151' }}
            tickLine={{ stroke: '#6b7280' }}
            axisLine={{ stroke: '#6b7280' }}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis
            tick={{ fontSize: 12, fill: '#374151' }}
            tickLine={{ stroke: '#6b7280' }}
            axisLine={{ stroke: '#6b7280' }}
            label={{
              value: 'Completion Rate (%)',
              angle: -90,
              position: 'insideLeft',
              style: { textAnchor: 'middle', fill: '#374151', fontSize: '12px' }
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              color: '#374151'
            }}
            labelStyle={{ color: '#374151', fontWeight: 'bold' }}
            formatter={(value) => [`${value}%`, 'Completion Rate']}
          />
          <Legend
            wrapperStyle={{ color: '#374151', fontWeight: '500' }}
          />
          <Bar
            dataKey="completionRate"
            name="Completion Rate %"
            fill="#059669"
            stroke="#047857"
            strokeWidth={1}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  if (!user) return null;

  return (
    <AuthWrapper>
      <DashboardLayout user={user}>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Welcome, {user.name}!</h1>
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-medium">Error Loading Dashboard</h3>
                  <p className="mt-1">{error}</p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={async () => {
                      try {
                        setError('');
                        setLoading(true);
                        const token = localStorage.getItem('token');
                        const res = await fetch('/api/health/db', {
                          headers: { 'Authorization': `Bearer ${token}` }
                        });
                        const data = await res.json();
                        console.log('Database status:', data);
                        alert('Check console for database status');
                      } catch (err) {
                        console.error('Error checking database:', err);
                        setError(`Database check failed: ${err.message}`);
                        setTimeout(() => setError(''), 3000);
                      } finally {
                        setLoading(false);
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Check Database
                  </button>
                  <button
                    onClick={() => {
                      setError('');
                      setLoading(true);
                      const storedUser = localStorage.getItem('user');
                      if (storedUser) {
                        try {
                          const parsedUser = JSON.parse(storedUser);
                          const token = localStorage.getItem('token');
                          fetch('/api/dashboard/summary', {
                            headers: { 'Authorization': `Bearer ${token}` }
                          })
                            .then(res => {
                              if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
                              return res.json();
                            })
                            .then(data => {
                              setSummaryData(data);
                              setLoading(false);
                            })
                            .catch(err => {
                              console.error('Error refreshing data:', err);
                              setError(`Failed to refresh data: ${err.message}`);
                              setTimeout(() => setError(''), 3000);
                            });
                        } catch (e) {
                          console.error("Failed to parse user from localStorage", e);
                          setError('Failed to parse user information');
                          setTimeout(() => setError(''), 3000);
                        }
                      } else {
                        setError('No user data found');
                        setTimeout(() => setError(''), 3000);
                      }
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Refresh Data
                  </button>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="p-4 bg-gray-50 rounded-lg text-center">
              <div className="animate-pulse flex justify-center">
                <div className="h-8 w-8 bg-gray-300 rounded-full"></div>
              </div>
              <p className="mt-2 text-gray-600">Loading dashboard data...</p>
            </div>
          ) : (
            <>
              {/* Critical Material Stock Alerts */}
              {summaryData && summaryData.criticalMaterials && summaryData.criticalMaterials.length > 0 && (
                <div className="p-6 bg-white border-l-4 border-red-600 rounded-xl shadow-lg">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 p-2 bg-red-100 rounded-lg">
                      <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-xl font-semibold text-gray-900">Critical Material Stock Alert</h3>
                      <p className="text-sm text-gray-700 mt-1 font-medium">
                        <span className="text-red-600 font-bold">{summaryData.materialStats.criticalCount}</span> materials are below minimum stock levels
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Material</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Current Stock</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Min Stock</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Shortage</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {summaryData.criticalMaterials.map((material, index) => {
                          const shortage = Number(material.minStock) - Number(material.qtyOnHand);
                          const percent = Math.round((Number(material.qtyOnHand) / Number(material.minStock)) * 100);

                          return (
                            <tr key={material.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                                {material.name} <span className="text-gray-600">({material.code})</span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {Number(material.qtyOnHand)} {material.unit}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {Number(material.minStock)} {material.unit}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <span className="text-sm text-white font-bold bg-red-600 px-2 py-1 rounded">
                                    {shortage} {material.unit}
                                  </span>
                                  <div className="ml-4 w-24 bg-gray-300 rounded-full h-3">
                                    <div
                                      className={`h-3 rounded-full ${percent < 30 ? 'bg-red-600' :
                                        percent < 70 ? 'bg-yellow-500' :
                                          'bg-green-600'
                                        }`}
                                      style={{ width: `${Math.min(percent, 100)}%` }}
                                    ></div>
                                  </div>
                                  <span className="ml-2 text-xs font-medium text-gray-700">
                                    {Math.min(percent, 100)}%
                                  </span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    <div className="mt-4 flex justify-end">
                      <Link
                        href="/dashboard/purchase-logs"
                        className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-red-600 hover:bg-red-700 transition-colors shadow-md"
                      >
                        Manage Critical Materials
                        <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {/* Upcoming Deadlines */}
              {summaryData && summaryData.upcomingDeadlines && summaryData.upcomingDeadlines.length > 0 && (
                <div className="p-6 bg-white border-l-4 border-amber-600 rounded-xl shadow-lg">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 p-2 bg-amber-100 rounded-lg">
                      <svg className="h-6 w-6 text-amber-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-xl font-semibold text-gray-900">Upcoming Deadlines</h3>
                      <p className="text-sm text-gray-700 mt-1 font-medium">
                        <span className="text-amber-600 font-bold">{summaryData.upcomingDeadlines.length}</span> orders due in the next 3 days
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full divide-y divide-amber-200">
                      <thead className="bg-amber-100">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-amber-800 uppercase tracking-wider">Order</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-amber-800 uppercase tracking-wider">Due Date</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-amber-800 uppercase tracking-wider">Status</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-amber-800 uppercase tracking-wider">Progress</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-amber-200">
                        {summaryData.upcomingDeadlines.map((order) => {
                          const percent = order.targetPcs > 0 ? Math.round((order.completedPcs / order.targetPcs) * 100) : 0;

                          return (
                            <tr key={order.id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                <Link href={`/dashboard/orders/${order.id}`} className="text-blue-600 hover:text-blue-900">
                                  {order.orderNumber}
                                </Link>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                {formatDate(order.dueDate)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${order.status === 'CREATED' ? 'bg-blue-600 text-white' :
                                  order.status === 'PROCESSING' ? 'bg-amber-600 text-white' :
                                    'bg-gray-600 text-white'
                                  }`}>
                                  {order.status.toLowerCase()}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <span className="text-sm text-gray-700 font-medium mr-2">
                                    {percent}%
                                  </span>
                                  <div className="w-24 bg-gray-200 rounded-full h-2.5">
                                    <div
                                      className={`h-2.5 rounded-full ${percent < 30 ? 'bg-red-600' :
                                        percent < 70 ? 'bg-yellow-400' :
                                          'bg-green-500'
                                        }`}
                                      style={{ width: `${percent}%` }}
                                    ></div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    <div className="mt-3 flex justify-end">
                      <Link
                        href="/dashboard/orders?filter=urgent"
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-amber-600 hover:bg-amber-700"
                      >
                        View All Urgent Orders
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Order Stats */}
                <div className="p-6 bg-white border border-blue-200 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-gray-900">Order Summary</h3>
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-4xl font-bold text-gray-900 mb-6">{summaryData?.orderStats?.total || 0}</p>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Created/Pending:</span>
                      <span className="text-sm font-bold text-white bg-blue-600 px-2 py-1 rounded">{summaryData?.orderStats?.pending || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Processing:</span>
                      <span className="text-sm font-bold text-white bg-amber-600 px-2 py-1 rounded">{summaryData?.orderStats?.processing || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Completed:</span>
                      <span className="text-sm font-bold text-white bg-green-600 px-2 py-1 rounded">{summaryData?.orderStats?.completed || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Delivered:</span>
                      <span className="text-sm font-bold text-white bg-indigo-600 px-2 py-1 rounded">{summaryData?.orderStats?.delivered || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Cancelled:</span>
                      <span className="text-sm font-bold text-white bg-red-600 px-2 py-1 rounded">{summaryData?.orderStats?.cancelled || 0}</span>
                    </div>
                    {summaryData?.orderStats?.processing > 0 && (
                      <div className="flex justify-between items-center border-t border-gray-200 pt-3 mt-3">
                        <span className="text-sm font-medium text-gray-700">Avg. Completion:</span>
                        <span className="text-sm font-bold text-white bg-blue-600 px-2 py-1 rounded">{summaryData?.orderStats?.avgCompletionPercentage || 0}%</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-6">
                    <Link href="/dashboard/orders-management" className="inline-flex items-center text-sm font-medium text-blue-700 hover:text-blue-900 transition-colors">
                      View all orders
                      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>

                {/* Materials & Products Stats */}
                <div className="p-6 bg-white border border-green-200 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-gray-900">Inventory Summary</h3>
                    <div className="p-2 bg-green-100 rounded-lg">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                  </div>
                  <div className="space-y-6">
                    {/* Materials Section */}
                    <div>
                      <h4 className="text-lg font-semibold text-gray-800 mb-2">Materials</h4>
                      <p className="text-3xl font-bold text-gray-900 mb-3">{summaryData?.materialStats?.total || 0} <span className="text-lg font-normal text-gray-600">items</span></p>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">Total Stock:</span>
                          <span className="text-sm font-bold text-gray-900 bg-gray-50 px-2 py-1 rounded">{summaryData?.materialStats?.totalQty || 0} units</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">Critical Stock:</span>
                          <span className="text-sm font-bold text-white bg-amber-600 px-2 py-1 rounded">{summaryData?.materialStats?.criticalCount || 0} items</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">Out of Stock:</span>
                          <span className="text-sm font-bold text-white bg-red-600 px-2 py-1 rounded">{summaryData?.materialStats?.outOfStockCount || 0} items</span>
                        </div>
                      </div>
                    </div>

                    {/* Products Section */}
                    <div className="border-t border-gray-200 pt-4">
                      <h4 className="text-lg font-semibold text-gray-800 mb-2">Products</h4>
                      <p className="text-3xl font-bold text-gray-900 mb-3">{summaryData?.productStats?.total || 0} <span className="text-lg font-normal text-gray-600">items</span></p>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">Total Stock:</span>
                          <span className="text-sm font-bold text-gray-900 bg-gray-50 px-2 py-1 rounded">{summaryData?.productStats?.totalQty || 0} pcs</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">Out of Stock:</span>
                          <span className="text-sm font-bold text-white bg-red-600 px-2 py-1 rounded">{summaryData?.productStats?.outOfStockCount || 0} items</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 flex space-x-4">
                    <Link href="/dashboard/materials" className="inline-flex items-center text-sm font-medium text-green-700 hover:text-green-900 transition-colors">
                      Manage materials
                      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                    <Link href="/dashboard/products" className="inline-flex items-center text-sm font-medium text-green-700 hover:text-green-900 transition-colors">
                      Manage products
                      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>

                {/* Users & Progress Stats */}
                <div className="p-6 bg-white border border-purple-200 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-gray-900">Users & Progress</h3>
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-1a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {/* Users Section */}
                    <div>
                      <h4 className="text-lg font-semibold text-gray-800 mb-2">Users</h4>
                      <p className="text-3xl font-bold text-gray-900 mb-3">{summaryData?.userStats?.total || 0} <span className="text-lg font-normal text-gray-600">users</span></p>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">Active Users:</span>
                          <span className="text-sm font-bold text-gray-900 bg-gray-50 px-2 py-1 rounded">{summaryData?.userStats?.active || 0}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">Admin:</span>
                          <span className="text-sm font-bold text-white bg-purple-600 px-2 py-1 rounded">{summaryData?.userStats?.admin || 0}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">Operators:</span>
                          <span className="text-sm font-bold text-white bg-blue-600 px-2 py-1 rounded">{summaryData?.userStats?.operator || 0}</span>
                        </div>
                      </div>
                    </div>

                    {/* Progress Reports Section */}
                    <div className="border-t border-gray-200 pt-4">
                      <h4 className="text-lg font-semibold text-gray-800 mb-2">Progress Reports</h4>
                      <p className="text-3xl font-bold text-gray-900 mb-3">{summaryData?.progressStats?.totalReports || 0} <span className="text-lg font-normal text-gray-600">reports</span></p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              {/* <div className="mt-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  <Link href="/dashboard/orders/create" className="p-4 bg-white border rounded-lg hover:bg-gray-50 flex flex-col items-center text-center">
                    <div className="text-2xl mb-2">📝</div>
                    <h3 className="font-medium text-gray-900">Create Order</h3>
                    <p className="text-sm text-gray-500">Add new production order</p>
                  </Link>

                  <Link href="/dashboard/inventory?tab=materials" className="p-4 bg-white border rounded-lg hover:bg-gray-50 flex flex-col items-center text-center">
                    <div className="text-2xl mb-2">🧵</div>
                    <h3 className="font-medium text-gray-900">Add Material</h3>
                    <p className="text-sm text-gray-500">Add new material to stock</p>
                  </Link>

                  <Link href="/dashboard/inventory?tab=products" className="p-4 bg-white border rounded-lg hover:bg-gray-50 flex flex-col items-center text-center">
                    <div className="text-2xl mb-2">👕</div>
                    <h3 className="font-medium text-gray-900">Add Product</h3>
                    <p className="text-sm text-gray-500">Create new product</p>
                  </Link>

                  <Link href="/dashboard/orders?filter=urgent" className="p-4 bg-white border rounded-lg hover:bg-gray-50 flex flex-col items-center text-center">
                    <div className="text-2xl mb-2">⚠️</div>
                    <h3 className="font-medium text-gray-900">Urgent Orders</h3>
                    <p className="text-sm text-gray-500">View urgent/deadline orders</p>
                  </Link>

                  <Link href="/dashboard/inventory?tab=materials&filter=critical" className="p-4 bg-white border rounded-lg hover:bg-gray-50 flex flex-col items-center text-center">
                    <div className="text-2xl mb-2">📉</div>
                    <h3 className="font-medium text-gray-900">Critical Stock</h3>
                    <p className="text-sm text-gray-500">Manage critical stock</p>
                  </Link>

                  <Link href="/dashboard/material-movement" className="p-4 bg-white border rounded-lg hover:bg-gray-50 flex flex-col items-center text-center">
                    <div className="text-2xl mb-2">🔄</div>
                    <h3 className="font-medium text-gray-900">Material Movement</h3>
                    <p className="text-sm text-gray-500">Add/remove material stock</p>
                  </Link>

                  <Link href="/dashboard/progress" className="p-4 bg-white border rounded-lg hover:bg-gray-50 flex flex-col items-center text-center">
                    <div className="text-2xl mb-2">📊</div>
                    <h3 className="font-medium text-gray-900">Update Progress</h3>
                    <p className="text-sm text-gray-500">Report production progress</p>
                  </Link>

                  <Link href="/dashboard/reports" className="p-4 bg-white border rounded-lg hover:bg-gray-50 flex flex-col items-center text-center">
                    <div className="text-2xl mb-2">📑</div>
                    <h3 className="font-medium text-gray-900">Generate Report</h3>
                    <p className="text-sm text-gray-500">Create & export reports</p>
                  </Link>
                </div>
              </div> */}

              {/* Charts Section */}
              <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Order Trend Chart */}
                <div className="bg-white p-4 rounded-lg shadow">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Order Trend (Last 7 Days)</h3>
                  <div className="h-80">
                    {renderOrderTrendChart()}
                  </div>
                </div>

                {/* Production Trend Chart */}
                <div className="bg-white p-4 rounded-lg shadow">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Production Trend (Last 7 Days)</h3>
                  <div className="h-80">
                    {renderProductionTrendChart()}
                  </div>
                </div>
              </div>

              {/* Recent Activities Section */}
              <div className="mt-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activities</h2>
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <ul className="divide-y divide-gray-200">
                    {summaryData?.recentActivities?.map((activity, index) => (
                      <li key={`${activity.type}-${activity.id}`} className="p-4 hover:bg-gray-50">
                        <div className="flex items-start">
                          <div className="flex-shrink-0">
                            {activity.type === 'order' && (
                              <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-500">
                                📦
                              </span>
                            )}
                            {activity.type === 'status_changed' && (
                              <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-yellow-100 text-yellow-500">
                                🔄
                              </span>
                            )}
                            {activity.type === 'material_movement' && (
                              <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-green-100 text-green-500">
                                {activity.movementType === 'IN' ? '📥' : '📤'}
                              </span>
                            )}
                          </div>
                          <div className="ml-4 flex-1">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-gray-900">
                                {activity.description}
                              </p>
                              <p className="text-sm text-gray-500">
                                {new Date(activity.timestamp).toLocaleTimeString('id-ID', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  day: 'numeric',
                                  month: 'short'
                                })}
                              </p>
                            </div>
                            <div className="mt-1">
                              {activity.type === 'order' && (
                                <Link href={`/dashboard/orders-management/${activity.id}`} className="text-sm text-blue-600 hover:text-blue-800">
                                  View order details
                                </Link>
                              )}
                              {activity.type === 'status_changed' && (
                                <Link href={`/dashboard/orders-management/${activity.orderId}`} className="text-sm text-blue-600 hover:text-blue-800">
                                  View order details
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}

                    {(!summaryData?.recentActivities || summaryData.recentActivities.length === 0) && (
                      <li className="p-4 text-center text-gray-500">
                        No recent activities found
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </>
          )}
        </div>
      </DashboardLayout>
    </AuthWrapper>
  );
} 