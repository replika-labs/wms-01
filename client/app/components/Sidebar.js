'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

export default function Sidebar({ user }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const menuItems = [
    { 
      label: 'Dashboard', 
      href: '/dashboard',
      icon: '📊',
      adminOnly: false 
    },
    // { 
    //   label: 'Users', 
    //   href: '/dashboard/users',
    //   icon: '👥',
    //   adminOnly: true 
    // },
    // { 
    //   label: 'Inventory', 
    //   href: '/dashboard/inventory',
    //   icon: '📦',
    //   adminOnly: false 
    // },
    { 
      label: 'Materials Management', 
      href: '/dashboard/materials',
      icon: '🧵',
      adminOnly: false 
    },
    { 
      label: 'Purchase Logs', 
      href: '/dashboard/purchase-logs',
      icon: '💰',
      adminOnly: false 
    },
    { 
      label: 'Contact Management', 
      href: '/dashboard/contacts',
      icon: '📇',
      adminOnly: false 
    },
    { 
      label: 'Products', 
      href: '/dashboard/products',
      icon: '🛍️',
      adminOnly: false 
    },
    // { 
    //   label: 'Orders', 
    //   href: '/dashboard/orders',
    //   icon: '📋',
    //   adminOnly: false 
    // },
    { 
      label: 'Orders Management', 
      href: '/dashboard/orders-management',
      icon: '🎯',
      adminOnly: false 
    },
    { 
      label: 'Progress Reports', 
      href: '/dashboard/progress',
      icon: '📝',
      adminOnly: false 
    },
    { 
      label: 'Recurring Plans', 
      href: '/dashboard/recurring-plans',
      icon: '🔄',
      adminOnly: true 
    },
    { 
      label: 'Material Movement', 
      href: '/dashboard/material-movement',
      icon: '📤',
      adminOnly: true 
    },
    { 
      label: 'Shipments', 
      href: '/dashboard/shipments',
      icon: '🚚',
      adminOnly: true 
    },
    { 
      label: 'Timeline', 
      href: '/dashboard/timeline',
      icon: '⏱️',
      adminOnly: false 
    },
    { 
      label: 'Reports', 
      href: '/dashboard/reports',
      icon: '📊',
      adminOnly: true 
    }
  ];

  // Filter menu items based on user role
  const filteredMenuItems = menuItems.filter(item => 
    !item.adminOnly || (item.adminOnly && user?.role === 'ADMIN')
  );

  return (
    <div className={`bg-white border-r border-gray-200 h-screen transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          {!isCollapsed && (
            <h2 className="text-xl font-semibold text-gray-800">WMS</h2>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            {isCollapsed ? '→' : '←'}
          </button>
        </div>

        {/* User Info */}
        {!isCollapsed && user && (
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-blue-600 font-semibold">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500">{user.role}</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-2">
            {filteredMenuItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center px-3 py-2 rounded-lg transition-colors ${
                      isActive 
                        ? 'bg-blue-50 text-blue-600' 
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-xl mr-3">{item.icon}</span>
                    {!isCollapsed && (
                      <span className="text-sm font-medium">{item.label}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className={`w-full flex items-center px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors ${
              isCollapsed ? 'justify-center' : ''
            }`}
          >
            <span className="text-xl mr-3">🚪</span>
            {!isCollapsed && (
              <span className="text-sm font-medium">Logout</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
} 