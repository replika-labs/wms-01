'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './Sidebar';

export default function DashboardLayout({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
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
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center dark-theme">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null; // Router will handle redirect
  }

  return (
    <div className="min-h-screen bg-gray-50 flex dark-theme">
      <Sidebar user={user} />
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="bg-white border-b border-gray-200">
          <div className="px-6 py-4">
            <h1 className="text-2xl font-semibold text-gray-800">Warehouse Management System</h1>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-6">
                {children}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
} 