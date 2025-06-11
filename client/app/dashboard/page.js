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
          } finally {
            setLoading(false);
          }
        };
        fetchSummary();
      } catch (e) {
        console.error("Failed to parse user from localStorage", e);
        setError('Failed to parse user information');
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
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="count"
            name="Orders"
            stroke="#3b82f6"
            activeDot={{ r: 8 }}
            strokeWidth={2}
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
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar
            dataKey="completionRate"
            name="Completion Rate %"
            fill="#10b981"
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
                              setLoading(false);
                            });
                        } catch (e) {
                          console.error("Failed to parse user from localStorage", e);
                          setError('Failed to parse user information');
                          setLoading(false);
                        }
                      } else {
                        setError('No user data found');
                        setLoading(false);
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
                <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-lg shadow-sm">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-lg font-medium text-red-800">Critical Material Stock Alert</h3>
                      <p className="text-sm text-red-700 mt-1">
                        {summaryData.materialStats.criticalCount} materials are below minimum stock levels
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full divide-y divide-red-200">
                      <thead className="bg-red-100">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-red-800 uppercase tracking-wider">Material</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-red-800 uppercase tracking-wider">Current Stock</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-red-800 uppercase tracking-wider">Min Stock</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-red-800 uppercase tracking-wider">Shortage</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-red-200">
                        {summaryData.criticalMaterials.map((material) => {
                          const shortage = Number(material.minStock) - Number(material.qtyOnHand);
                          const percent = Math.round((Number(material.qtyOnHand) / Number(material.minStock)) * 100);

                          return (
                            <tr key={material.id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {material.name} ({material.code})
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                {Number(material.qtyOnHand)} {material.unit}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                {Number(material.minStock)} {material.unit}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <span className="text-sm text-red-700 font-medium">
                                    {shortage} {material.unit}
                                  </span>
                                  <div className="ml-4 w-24 bg-gray-200 rounded-full h-2.5">
                                    <div
                                      className={`h-2.5 rounded-full ${percent < 30 ? 'bg-red-600' :
                                          percent < 70 ? 'bg-yellow-400' :
                                            'bg-green-500'
                                        }`}
                                      style={{ width: `${Math.min(percent, 100)}%` }}
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
                        href="/dashboard/inventory?tab=materials&filter=critical"
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                      >
                        Manage Critical Materials
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {/* Upcoming Deadlines */}
              {summaryData && summaryData.upcomingDeadlines && summaryData.upcomingDeadlines.length > 0 && (
                <div className="p-4 bg-amber-50 border-l-4 border-amber-500 rounded-lg shadow-sm">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-amber-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-lg font-medium text-amber-800">Upcoming Deadlines</h3>
                      <p className="text-sm text-amber-700 mt-1">
                        {summaryData.upcomingDeadlines.length} orders due in the next 3 days
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
                                <span className={`px-2 py-1 text-xs rounded-full ${order.status === 'CREATED' ? 'bg-blue-100 text-blue-800' :
                                    order.status === 'PROCESSING' ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-gray-100 text-gray-800'
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Order Stats */}
                <div className="p-4 bg-blue-50 rounded-lg shadow">
                  <h3 className="text-lg font-medium text-blue-900">Order Summary</h3>
                  <p className="text-3xl font-bold text-blue-700">{summaryData?.orderStats?.total || 0}</p>
                  <div className="mt-3 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Created/Pending:</span>
                      <span className="text-sm font-medium text-blue-600">{summaryData?.orderStats?.pending || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Processing:</span>
                      <span className="text-sm font-medium text-yellow-600">{summaryData?.orderStats?.processing || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Completed:</span>
                      <span className="text-sm font-medium text-green-600">{summaryData?.orderStats?.completed || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Delivered:</span>
                      <span className="text-sm font-medium text-indigo-600">{summaryData?.orderStats?.delivered || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Cancelled:</span>
                      <span className="text-sm font-medium text-red-600">{summaryData?.orderStats?.cancelled || 0}</span>
                    </div>
                    {summaryData?.orderStats?.processing > 0 && (
                      <div className="flex justify-between border-t border-blue-200 pt-2 mt-2">
                        <span className="text-sm text-gray-600">Avg. Completion:</span>
                        <span className="text-sm font-medium text-blue-600">{summaryData?.orderStats?.avgCompletionPercentage || 0}%</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-4">
                    <Link href="/dashboard/orders-management" className="text-sm text-blue-600 hover:text-blue-800">
                      View all orders →
                    </Link>
                  </div>
                </div>

                {/* Materials & Products Stats */}
                <div className="p-4 bg-green-50 rounded-lg shadow">
                  <h3 className="text-lg font-medium text-green-900">Inventory Summary</h3>
                  <div className="mt-3 space-y-4">
                    {/* Materials Section */}
                    <div>
                      <h4 className="text-md font-medium text-green-800">Materials</h4>
                      <p className="text-2xl font-bold text-green-700">{summaryData?.materialStats?.total || 0} <span className="text-sm font-normal">items</span></p>
                      <div className="mt-2 space-y-1">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Total Stock:</span>
                          <span className="text-sm font-medium">{summaryData?.materialStats?.totalQty || 0} units</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Critical Stock:</span>
                          <span className="text-sm font-medium text-amber-600">{summaryData?.materialStats?.criticalCount || 0} items</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Out of Stock:</span>
                          <span className="text-sm font-medium text-red-600">{summaryData?.materialStats?.outOfStockCount || 0} items</span>
                        </div>
                      </div>
                    </div>

                    {/* Products Section */}
                    <div className="border-t border-green-200 pt-3">
                      <h4 className="text-md font-medium text-green-800">Products</h4>
                      <p className="text-2xl font-bold text-green-700">{summaryData?.productStats?.total || 0} <span className="text-sm font-normal">items</span></p>
                      <div className="mt-2 space-y-1">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Total Stock:</span>
                          <span className="text-sm font-medium">{summaryData?.productStats?.totalQty || 0} pcs</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Out of Stock:</span>
                          <span className="text-sm font-medium text-red-600">{summaryData?.productStats?.outOfStockCount || 0} items</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex space-x-4">
                    <Link href="/dashboard/inventory?tab=materials" className="text-sm text-green-600 hover:text-green-800">
                      Manage materials →
                    </Link>
                    <Link href="/dashboard/inventory?tab=products" className="text-sm text-green-600 hover:text-green-800">
                      Manage products →
                    </Link>
                  </div>
                </div>

                {/* Users & Progress Stats */}
                <div className="p-4 bg-purple-50 rounded-lg shadow">
                  <h3 className="text-lg font-medium text-purple-900">Users & Progress</h3>

                  {/* Users Section */}
                  <div className="mt-3">
                    <h4 className="text-md font-medium text-purple-800">Users</h4>
                    <p className="text-2xl font-bold text-purple-700">{summaryData?.userStats?.total || 0} <span className="text-sm font-normal">users</span></p>
                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Active Users:</span>
                        <span className="text-sm font-medium">{summaryData?.userStats?.active || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Admin:</span>
                        <span className="text-sm font-medium">{summaryData?.userStats?.admin || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Operators:</span>
                        <span className="text-sm font-medium">{summaryData?.userStats?.operator || 0}</span>
                      </div>
                    </div>
                  </div>

                  {/* Progress Reports Section */}
                  <div className="border-t border-purple-200 pt-3 mt-3">
                    <h4 className="text-md font-medium text-purple-800">Progress Reports</h4>
                    <p className="text-2xl font-bold text-purple-700">{summaryData?.progressStats?.totalReports || 0} <span className="text-sm font-normal">reports</span></p>
                  </div>

                  <div className="mt-4 flex space-x-4">
                    <Link href="/dashboard/users" className="text-sm text-purple-600 hover:text-purple-800">
                      Manage users →
                    </Link>
                    <Link href="/dashboard/progress" className="text-sm text-purple-600 hover:text-purple-800">
                      View progress →
                    </Link>
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