'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/app/components/DashboardLayout';
import AuthWrapper from '@/app/components/AuthWrapper';

export default function ReportsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Report options state
  const [reportType, setReportType] = useState('stock');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [format, setFormat] = useState('pdf');
  const [additionalOptions, setAdditionalOptions] = useState({
    includeCompletedOrders: true,
    includeCancelledOrders: false,
    groupByProduct: true,
    includeCharts: true
  });

  // Set default date range to current month
  useEffect(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    setDateRange({
      startDate: firstDay.toISOString().split('T')[0],
      endDate: lastDay.toISOString().split('T')[0]
    });
  }, []);

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'reportType') {
      setReportType(value);
    } else if (name === 'format') {
      setFormat(value);
    } else if (name === 'startDate' || name === 'endDate') {
      setDateRange({
        ...dateRange,
        [name]: value
      });
    } else {
      // Handle checkbox options
      setAdditionalOptions({
        ...additionalOptions,
        [name]: checked
      });
    }
  };

  // Generate report
  const handleGenerateReport = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      // Build query parameters
      const queryParams = new URLSearchParams({
        type: reportType,
        format: format,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        includeCompletedOrders: additionalOptions.includeCompletedOrders,
        includeCancelledOrders: additionalOptions.includeCancelledOrders,
        groupByProduct: additionalOptions.groupByProduct,
        includeCharts: additionalOptions.includeCharts
      });
      
      // Make API request
      const response = await fetch(`/api/reports/generate?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate report');
      }
      
      // Handle success - either open PDF or download Excel file
      const data = await response.json();
      
      if (data.url) {
        // Open report URL in new tab
        window.open(data.url, '_blank');
        setSuccess('Report generated successfully! Opening in new tab.');
      } else {
        setSuccess('Report generated successfully!');
      }
      
    } catch (err) {
      setError(err.message);
      console.error('Error generating report:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthWrapper>
      <DashboardLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
            <p className="mt-1 text-sm text-gray-600">
              Generate and export reports for stock, production, and shipments
            </p>
          </div>

          {/* Error and Success Messages */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
              <span className="block sm:inline">{error}</span>
            </div>
          )}
          
          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4">
              <span className="block sm:inline">{success}</span>
            </div>
          )}

          {/* Report Options Form */}
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <form onSubmit={handleGenerateReport}>
                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                  {/* Report Type */}
                  <div className="sm:col-span-3">
                    <label htmlFor="reportType" className="block text-sm font-medium text-gray-700">
                      Report Type
                    </label>
                    <select
                      id="reportType"
                      name="reportType"
                      value={reportType}
                      onChange={handleInputChange}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    >
                      <option value="stock">Stock Report</option>
                      <option value="production">Production Report</option>
                      <option value="shipment">Shipment Report</option>
                      <option value="comprehensive">Comprehensive Report</option>
                    </select>
                  </div>

                  {/* Export Format */}
                  <div className="sm:col-span-3">
                    <label htmlFor="format" className="block text-sm font-medium text-gray-700">
                      Format
                    </label>
                    <select
                      id="format"
                      name="format"
                      value={format}
                      onChange={handleInputChange}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    >
                      <option value="pdf">PDF</option>
                      <option value="excel">Excel</option>
                      <option value="csv">CSV</option>
                    </select>
                  </div>

                  {/* Date Range - Start */}
                  <div className="sm:col-span-3">
                    <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
                      Start Date
                    </label>
                    <input
                      type="date"
                      name="startDate"
                      id="startDate"
                      value={dateRange.startDate}
                      onChange={handleInputChange}
                      className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>

                  {/* Date Range - End */}
                  <div className="sm:col-span-3">
                    <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
                      End Date
                    </label>
                    <input
                      type="date"
                      name="endDate"
                      id="endDate"
                      value={dateRange.endDate}
                      onChange={handleInputChange}
                      className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>

                  {/* Additional Options */}
                  <div className="sm:col-span-6">
                    <fieldset>
                      <legend className="text-base font-medium text-gray-900">Additional Options</legend>
                      <div className="mt-4 space-y-4">
                        <div className="relative flex items-start">
                          <div className="flex items-center h-5">
                            <input
                              id="includeCompletedOrders"
                              name="includeCompletedOrders"
                              type="checkbox"
                              checked={additionalOptions.includeCompletedOrders}
                              onChange={handleInputChange}
                              className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                            />
                          </div>
                          <div className="ml-3 text-sm">
                            <label htmlFor="includeCompletedOrders" className="font-medium text-gray-700">Include Completed Orders</label>
                            <p className="text-gray-500">Include orders with &apos;completed&apos; status in the report.</p>
                          </div>
                        </div>
                        <div className="relative flex items-start">
                          <div className="flex items-center h-5">
                            <input
                              id="includeCancelledOrders"
                              name="includeCancelledOrders"
                              type="checkbox"
                              checked={additionalOptions.includeCancelledOrders}
                              onChange={handleInputChange}
                              className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                            />
                          </div>
                          <div className="ml-3 text-sm">
                            <label htmlFor="includeCancelledOrders" className="font-medium text-gray-700">Include Cancelled Orders</label>
                            <p className="text-gray-500">Include orders with &apos;cancelled&apos; status in the report.</p>
                          </div>
                        </div>
                        <div className="relative flex items-start">
                          <div className="flex items-center h-5">
                            <input
                              id="groupByProduct"
                              name="groupByProduct"
                              type="checkbox"
                              checked={additionalOptions.groupByProduct}
                              onChange={handleInputChange}
                              className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                            />
                          </div>
                          <div className="ml-3 text-sm">
                            <label htmlFor="groupByProduct" className="font-medium text-gray-700">Group by Product</label>
                            <p className="text-gray-500">Group data by product instead of showing individual order items.</p>
                          </div>
                        </div>
                        <div className="relative flex items-start">
                          <div className="flex items-center h-5">
                            <input
                              id="includeCharts"
                              name="includeCharts"
                              type="checkbox"
                              checked={additionalOptions.includeCharts}
                              onChange={handleInputChange}
                              className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                            />
                          </div>
                          <div className="ml-3 text-sm">
                            <label htmlFor="includeCharts" className="font-medium text-gray-700">Include Charts</label>
                            <p className="text-gray-500">Include visual charts and graphs in the report (PDF only).</p>
                          </div>
                        </div>
                      </div>
                    </fieldset>
                  </div>
                </div>

                <div className="mt-6">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Generating Report...
                      </>
                    ) : (
                      'Generate Report'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Report Description */}
          <div className="mt-6 bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Report Types
              </h3>
              <div className="mt-5 border-t border-gray-200 pt-5">
                <dl className="divide-y divide-gray-200">
                  <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4">
                    <dt className="text-sm font-medium text-gray-500">Stock Report</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      Provides an overview of material inventory including current stock levels, materials below safety stock, and material movement history.
                    </dd>
                  </div>
                  <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4">
                    <dt className="text-sm font-medium text-gray-500">Production Report</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      Summarizes production data including completed orders, in-progress orders, production efficiency, and remaining fabric statistics.
                    </dd>
                  </div>
                  <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4">
                    <dt className="text-sm font-medium text-gray-500">Shipment Report</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      Details all shipments including tracking information, courier data, delivery status, and order relationships.
                    </dd>
                  </div>
                  <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4">
                    <dt className="text-sm font-medium text-gray-500">Comprehensive Report</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      Combines all of the above reports into a complete business overview with additional KPIs and trend analysis.
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>

          {/* Recent Reports List - In a real implementation, you would fetch this from the API */}
          <div className="mt-6 bg-white shadow sm:rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Recently Generated Reports
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Your most recently generated reports.
              </p>
            </div>
            <div className="bg-white overflow-hidden">
              <ul className="divide-y divide-gray-200">
                <li className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-blue-600 truncate">
                      Stock Report - April 2023
                    </p>
                    <div className="ml-2 flex-shrink-0 flex">
                      <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        PDF
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 sm:flex sm:justify-between">
                    <div className="sm:flex">
                      <p className="flex items-center text-sm text-gray-500">
                        Generated on April 30, 2023
                      </p>
                    </div>
                    <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                      <button className="text-blue-600 hover:text-blue-900">
                        Download
                      </button>
                    </div>
                  </div>
                </li>
                <li className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-blue-600 truncate">
                      Production Report - Q1 2023
                    </p>
                    <div className="ml-2 flex-shrink-0 flex">
                      <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Excel
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 sm:flex sm:justify-between">
                    <div className="sm:flex">
                      <p className="flex items-center text-sm text-gray-500">
                        Generated on March 31, 2023
                      </p>
                    </div>
                    <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                      <button className="text-blue-600 hover:text-blue-900">
                        Download
                      </button>
                    </div>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </AuthWrapper>
  );
} 