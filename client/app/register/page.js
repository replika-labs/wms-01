'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('penjahit'); // Default role
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); // Clear previous errors
    setSuccess(''); // Clear previous success messages

    try {
      const res = await axios.post('/api/auth/register', { name, email, password, role });
      
      setSuccess('Registration successful! Redirecting to login...');
      // Optionally auto-login or redirect to login page
      setTimeout(() => {
        router.push('/login');
      }, 2000); // Redirect after 2 seconds

    } catch (err) {
      console.error('Registration Error:', err.response ? err.response.data : err.message);
      setError(err.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 w-full max-w-md items-center justify-center font-mono text-sm lg:flex">
        <div className="bg-white p-8 rounded-lg shadow-md w-full">
          <h2 className="text-2xl font-bold mb-6 text-center text-black">Register</h2>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
                Name:
              </label>
              <input
                type="text"
                id="name"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
                Email:
              </label>
              <input
                type="email"
                id="email"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
                Password:
              </label>
              <input
                type="password"
                id="password"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
             <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="role">
                Role:
              </label>
              <select
                id="role"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                required
              >
                <option value="penjahit">Penjahit</option>
                 {/* Admin role should ideally only be creatable via backend or admin panel */}
                {/* <option value="admin">Admin</option> */}
              </select>
            </div>
             {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}
             {success && <p className="text-green-500 text-xs italic mb-4">{success}</p>}
            <div className="flex items-center justify-between">
              <button
                type="submit"
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              >
                Register
              </button>
              <a
                className="inline-block align-baseline font-bold text-sm text-blue-500 hover:text-blue-800"
                href="/login"
              >
                Already have an account? Login
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 