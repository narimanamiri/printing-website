'use client';

import { Header } from '@/app/components/Header';
import { AdminDashboard } from '@/app/components/AdminDashboard';
import { useState, useEffect } from 'react';

export default function AdminPage() {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if already authorized via localStorage (for demo)
    const auth = localStorage.getItem('admin-auth');
    if (auth === 'true') {
      setIsAuthorized(true);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin') {
      setIsAuthorized(true);
      localStorage.setItem('admin-auth', 'true');
      setError('');
    } else {
      setError('Invalid password');
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      {!isAuthorized ? (
        <div className="flex-1 flex items-center justify-center px-4 py-20">
          <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">
              Admin Login
            </h2>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {error && (
                <p className="text-red-600 text-sm font-medium">{error}</p>
              )}

              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Login
              </button>
            </form>

            <p className="text-center text-gray-600 text-sm mt-4">
              Demo password: <code className="bg-gray-100 px-2 py-1 rounded">admin</code>
            </p>
          </div>
        </div>
      ) : (
        <main className="flex-1 px-4 py-12 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-4xl font-bold text-gray-900">
                Admin Dashboard
              </h1>
              <button
                onClick={() => {
                  localStorage.removeItem('admin-auth');
                  setIsAuthorized(false);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Logout
              </button>
            </div>

            <AdminDashboard />
          </div>
        </main>
      )}
    </div>
  );
}
