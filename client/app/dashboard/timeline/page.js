'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/app/components/DashboardLayout';
import AuthWrapper from '@/app/components/AuthWrapper';

export default function TimelinePage() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [timelineData, setTimelineData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch orders
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No authentication token found');
        }

        const response = await fetch('/api/orders-management/list', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch orders');
        }

        const data = await response.json();
        // orders-management returns {orders: [...], pagination: {...}} structure
        const orders = data.orders || [];
        setOrders(Array.isArray(orders) ? orders : []);
        
        // If orders exist, select the first one by default
        if (orders && orders.length > 0) {
          setSelectedOrder(orders[0].id);
          fetchTimelineData(orders[0].id);
        } else {
          setLoading(false);
        }
      } catch (err) {
        setError(err.message);
        console.error('Error fetching orders:', err);
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  // Fetch timeline data for a specific order
  const fetchTimelineData = async (orderId) => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`/api/orders-management/${orderId}/timeline`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch timeline data');
      }

      const data = await response.json();
      
      // Process timeline data - combine and sort events
      let events = [];
      
      // Add order creation
      if (data.order) {
        events.push({
          type: 'ORDER_CREATED',
          date: data.order.createdAt,
          title: 'Order Created',
          description: `Order ${data.order.orderNumber} created`,
          data: data.order
        });
      }
        
      // Add status changes
      if (data.statusChanges && data.statusChanges.length > 0) {
        data.statusChanges.forEach(change => {
          // Skip the initial creation status change since we already added it
          if (change.oldStatus === null && change.newStatus === 'created') {
            return;
          }
          
          events.push({
            type: 'STATUS_CHANGE',
            date: change.createdAt,
            title: `Status Changed to ${change.newStatus}`,
            description: `Order status changed from ${change.oldStatus || 'none'} to ${change.newStatus}`,
            data: change
          });
        });
      }
      
      // Add shipments
      if (data.shipments && data.shipments.length > 0) {
        data.shipments.forEach(shipment => {
          events.push({
            type: 'SHIPMENT',
            date: shipment.createdAt,
            title: 'Shipment Created',
            description: `Tracking Number: ${shipment.trackingNumber}, Courier: ${shipment.courier}`,
            data: shipment
          });
          
          if (shipment.deliveryDate) {
            events.push({
              type: 'DELIVERY',
              date: shipment.deliveryDate,
              title: 'Delivery Date',
              description: `Expected delivery date`,
              data: shipment
            });
          }
        });
      }
      
      // Add progress reports
      if (data.progressReports && data.progressReports.length > 0) {
        data.progressReports.forEach(report => {
          events.push({
            type: 'PROGRESS',
            date: report.reportedAt || report.createdAt,
            title: 'Progress Update',
            description: `${report.pcsFinished} pieces completed${report.User ? ' by ' + report.User.name : ''}`,
            data: report
          });
        });
      }
      
      // Add remaining fabric reports
      if (data.remainingFabrics && data.remainingFabrics.length > 0) {
        data.remainingFabrics.forEach(fabric => {
          events.push({
            type: 'REMAINING_FABRIC',
            date: fabric.createdAt,
            title: 'Remaining Fabric Reported',
            description: `${fabric.qtyRemaining} ${fabric.Material ? fabric.Material.unit : ''} of ${fabric.Material ? fabric.Material.name : 'fabric'} remaining`,
            data: fabric
          });
        });
      }
      
      // Sort events by date
      events.sort((a, b) => new Date(a.date) - new Date(b.date));
      
      setTimelineData(events);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching timeline data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle order selection change
  const handleOrderChange = (e) => {
    const orderId = e.target.value;
    setSelectedOrder(orderId);
    fetchTimelineData(orderId);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get icon for event type
  const getEventIcon = (type) => {
    switch (type) {
      case 'ORDER_CREATED':
        return (
          <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
            <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 2a1 1 0 00-1 1v1a1 1 0 002 0V3a1 1 0 00-1-1zM4 4h3a3 3 0 006 0h3a2 2 0 012 2v9a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zm2.5 7a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm2.45 4a2.5 2.5 0 10-4.9 0h4.9zM12 9a1 1 0 100 2h3a1 1 0 100-2h-3zm-1 4a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1z" clipRule="evenodd"></path>
            </svg>
          </div>
        );
      case 'STATUS_CHANGE':
        return (
          <div className="flex items-center justify-center w-8 h-8 bg-yellow-100 rounded-full">
            <svg className="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path>
            </svg>
          </div>
        );
      case 'SHIPMENT':
        return (
          <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full">
            <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
              <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7h4a1 1 0 011 1v6h-2.05a2.5 2.5 0 01-4.9 0H14V7z" />
            </svg>
          </div>
        );
      case 'DELIVERY':
        return (
          <div className="flex items-center justify-center w-8 h-8 bg-purple-100 rounded-full">
            <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"></path>
            </svg>
          </div>
        );
      case 'PROGRESS':
        return (
          <div className="flex items-center justify-center w-8 h-8 bg-indigo-100 rounded-full">
            <svg className="w-4 h-4 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
            </svg>
          </div>
        );
      case 'REMAINING_FABRIC':
        return (
          <div className="flex items-center justify-center w-8 h-8 bg-pink-100 rounded-full">
            <svg className="w-4 h-4 text-pink-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"></path>
            </svg>
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full">
            <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 14a6 6 0 100-12 6 6 0 000 12z" clipRule="evenodd"></path>
            </svg>
          </div>
        );
    }
  };

  // Get background color class for event type
  const getEventColorClass = (type) => {
    switch (type) {
      case 'ORDER_CREATED':
        return 'bg-blue-50 border-blue-200';
      case 'STATUS_CHANGE':
        return 'bg-yellow-50 border-yellow-200';
      case 'SHIPMENT':
        return 'bg-green-50 border-green-200';
      case 'DELIVERY':
        return 'bg-purple-50 border-purple-200';
      case 'PROGRESS':
        return 'bg-indigo-50 border-indigo-200';
      case 'REMAINING_FABRIC':
        return 'bg-pink-50 border-pink-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <AuthWrapper>
      <DashboardLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Order Timeline</h1>
            <p className="mt-1 text-sm text-gray-600">
              View the timeline of events for an order
            </p>
          </div>

          {/* Order Selection */}
          <div className="bg-white shadow sm:rounded-lg mb-6">
            <div className="px-4 py-5 sm:p-6">
              <label htmlFor="orderSelect" className="block text-sm font-medium text-gray-700">
                Select Order
              </label>
              <select
                id="orderSelect"
                value={selectedOrder || ''}
                onChange={handleOrderChange}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="">Select an order</option>
                {orders.map((order) => (
                  <option key={order.id} value={order.id}>
                    {order.orderNumber} - {order.status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          {/* Timeline */}
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              {loading ? (
                <div className="py-12 flex justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                </div>
              ) : timelineData.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No timeline data</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    No events found for this order.
                  </p>
                </div>
              ) : (
                <div className="flow-root">
                  <ul className="-mb-8">
                    {timelineData.map((event, eventIdx) => (
                      <li key={eventIdx}>
                        <div className="relative pb-8">
                          {eventIdx !== timelineData.length - 1 ? (
                            <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true"></span>
                          ) : null}
                          <div className="relative flex space-x-3">
                            <div>
                              {getEventIcon(event.type)}
                            </div>
                            <div className={`min-w-0 flex-1 p-4 border rounded-lg ${getEventColorClass(event.type)}`}>
                              <div>
                                <div className="flex justify-between">
                                  <p className="text-sm font-medium text-gray-900">
                                    {event.title}
                                  </p>
                                  <p className="text-sm text-gray-500">
                                    {formatDate(event.date)}
                                  </p>
                                </div>
                                <p className="mt-1 text-sm text-gray-600">
                                  {event.description}
                                </p>
                                
                                {/* Event-specific details */}
                                {event.type === 'PROGRESS' && event.data.resiPengiriman && (
                                  <p className="mt-2 text-xs text-gray-500">
                                    Shipping Receipt: {event.data.resiPengiriman}
                                  </p>
                                )}
                                
                                {event.type === 'PROGRESS' && event.data.note && (
                                  <p className="mt-2 text-xs text-gray-500">
                                    Note: {event.data.note}
                                  </p>
                                )}
                                
                                {event.type === 'REMAINING_FABRIC' && event.data.note && (
                                  <p className="mt-2 text-xs text-gray-500">
                                    Note: {event.data.note}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </DashboardLayout>
    </AuthWrapper>
  );
} 