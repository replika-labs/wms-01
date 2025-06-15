'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import AuthWrapper from '../../../components/AuthWrapper';
import DashboardLayout from '../../../components/DashboardLayout';

export default function EditUserPage({ params }) {
  const userId = use(params).id;
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    whatsappPhone: '',
    password: '',
    confirmPassword: '',
    role: '',
    loginEnabled: true
  });

  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        // Only admin can access this page
        if (parsedUser.role !== 'admin') {
          router.push('/dashboard');
        } else {
          fetchUserData();
        }
      } catch (e) {
        console.error("Failed to parse user from localStorage", e);
        router.push('/login');
      }
    } else {
      router.push('/login');
    }
  }, [router, userId]);

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/auth/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) throw new Error('Failed to fetch user data');

      const userData = await res.json();
      setUserData(userData);

      setFormData({
        name: userData.name || '',
        email: userData.email || '',
        phone: userData.phone || '',
        whatsappPhone: userData.whatsappPhone || '',
        password: '',
        confirmPassword: '',
        role: userData.role || 'penjahit',
        loginEnabled: userData.loginEnabled !== undefined ? userData.loginEnabled : true
      });

    } catch (err) {
      console.error('Failed to fetch user data:', err);
      setError('Failed to load user data. Please try again.');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email is invalid';
    }

    // Password is optional during edit, but if provided, must match confirmation
    if (formData.password && formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.role) {
      errors.role = 'Role is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    // Create update payload - omit password if not provided
    const updatePayload = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      whatsappPhone: formData.whatsappPhone,
      role: formData.role,
      loginEnabled: formData.loginEnabled
    };

    // Only include password if it was entered
    if (formData.password) {
      updatePayload.password = formData.password;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/auth/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatePayload)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to update user');
      }

      setSuccess('User updated successfully');

      // Redirect to users list after a delay
      setTimeout(() => {
        router.push('/dashboard/users');
      }, 2000);

    } catch (err) {
      console.error('Failed to update user:', err);
      setError(err.message || 'Failed to update user');
      setTimeout(() => setError(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <AuthWrapper>
      <DashboardLayout user={user}>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Edit User</h1>
            <button
              onClick={() => router.push('/dashboard/users')}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              Back to Users
            </button>
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {success && (
            <div className="p-4 bg-green-50 text-green-700 rounded-lg">
              {success}
            </div>
          )}

          {loading ? (
            <div className="p-6 bg-white rounded-lg shadow-sm flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    className={`w-full px-4 py-2 border rounded-lg ${formErrors.name ? 'border-red-500' : 'border-gray-300'}`}
                    value={formData.name}
                    onChange={handleChange}
                  />
                  {formErrors.name && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    className={`w-full px-4 py-2 border rounded-lg ${formErrors.email ? 'border-red-500' : 'border-gray-300'}`}
                    value={formData.email}
                    onChange={handleChange}
                  />
                  {formErrors.email && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.email}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    placeholder="e.g., +62812345678"
                    className={`w-full px-4 py-2 border rounded-lg ${formErrors.phone ? 'border-red-500' : 'border-gray-300'}`}
                    value={formData.phone}
                    onChange={handleChange}
                  />
                  {formErrors.phone && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.phone}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="whatsappPhone" className="block text-sm font-medium text-gray-700 mb-1">
                    WhatsApp Number
                  </label>
                  <input
                    type="tel"
                    id="whatsappPhone"
                    name="whatsappPhone"
                    placeholder="e.g., +62812345678"
                    className={`w-full px-4 py-2 border rounded-lg ${formErrors.whatsappPhone ? 'border-red-500' : 'border-gray-300'}`}
                    value={formData.whatsappPhone}
                    onChange={handleChange}
                  />
                  {formErrors.whatsappPhone && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.whatsappPhone}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Include country code (e.g., +62 for Indonesia)
                  </p>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password (leave blank to keep current)
                  </label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    className={`w-full px-4 py-2 border rounded-lg ${formErrors.password ? 'border-red-500' : 'border-gray-300'}`}
                    value={formData.password}
                    onChange={handleChange}
                  />
                  {formErrors.password && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.password}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    className={`w-full px-4 py-2 border rounded-lg ${formErrors.confirmPassword ? 'border-red-500' : 'border-gray-300'}`}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                  />
                  {formErrors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.confirmPassword}</p>
                  )}
                </div>

                <div>                  <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">                    Role                  </label>                  <select id="role" name="role" className={`w-full px-4 py-2 border rounded-lg ${formErrors.role ? 'border-red-500' : 'border-gray-300'}`} value={formData.role} onChange={handleChange}                  >                    <option value="penjahit">Penjahit</option>                    <option value="admin">Admin</option>                  </select>                  {formErrors.role && (<p className="mt-1 text-sm text-red-600">{formErrors.role}</p>)}                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="loginEnabled"
                    name="loginEnabled"
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    checked={formData.loginEnabled}
                    onChange={handleChange}
                  />
                  <label htmlFor="loginEnabled" className="ml-2 block text-sm text-gray-700">
                    Account Active
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => router.push('/dashboard/users')}
                  className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}
        </div>
      </DashboardLayout>
    </AuthWrapper>
  );
} 