import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

function AdminUserManagement() {
  const { apiRequest, logout, user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeRole, setActiveRole] = useState('teacher');
  const [listLoading, setListLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [listError, setListError] = useState('');

  const roleTitle = useMemo(
    () => (activeRole === 'teacher' ? 'Teachers' : 'Students'),
    [activeRole]
  );

  const loadUsers = useCallback(async (role) => {
    setListLoading(true);
    setListError('');
    try {
      const response = await apiRequest(`/api/auth/admin/users?role=${role}`);
      setUsers(response?.users || []);
    } catch (err) {
      setListError(err?.message || 'Failed to load users.');
    } finally {
      setListLoading(false);
    }
  }, [apiRequest]);

  useEffect(() => {
    loadUsers(activeRole);
  }, [activeRole, loadUsers]);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await apiRequest('/api/auth/admin/register-user', {
        method: 'POST',
        body: JSON.stringify(formData)
      });

      setSuccess(`Created ${response?.user?.role || formData.role} account for ${response?.user?.email || formData.email}.`);
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'student'
      });
      loadUsers(activeRole);
    } catch (err) {
      setError(err?.message || 'Failed to create user account.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (targetUser) => {
    const confirmed = window.confirm(`Delete ${targetUser.role} account: ${targetUser.email}?`);
    if (!confirmed) return;

    setListError('');
    try {
      await apiRequest(`/api/auth/admin/users/${targetUser.id}`, { method: 'DELETE' });
      setUsers((prev) => prev.filter((item) => item.id !== targetUser.id));
    } catch (err) {
      setListError(err?.message || 'Failed to delete user.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="card mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin User Provisioning</h1>
              <p className="text-sm text-gray-600 mt-1">
                Logged in as {user?.email}
              </p>
            </div>
            <button className="btn btn-secondary" onClick={() => logout(false)}>
              Logout
            </button>
          </div>
        </div>

        <form className="card space-y-4" onSubmit={handleSubmit}>
          <h2 className="text-lg font-semibold text-gray-900">Create Teacher/Student Account</h2>

          {error && (
            <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 bg-green-100 border border-green-400 text-green-700 rounded">
              {success}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="role" className="form-label">Account Type</label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="form-input"
              required
            >
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="name" className="form-label">Full Name</label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email" className="form-label">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">Temporary Password</label>
            <input
              id="password"
              name="password"
              type="password"
              minLength={6}
              value={formData.password}
              onChange={handleChange}
              className="form-input"
              required
            />
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary w-full">
            {loading ? 'Creating account...' : 'Create account'}
          </button>

          <p className="text-center text-sm text-gray-600">
            <Link to="/" className="text-blue-600 hover:text-blue-500 font-medium">
              Back to Home
            </Link>
          </p>
        </form>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">User Directory</h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveRole('teacher')}
                className={`px-3 py-1 rounded text-sm font-medium ${activeRole === 'teacher' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`}
              >
                Teachers
              </button>
              <button
                type="button"
                onClick={() => setActiveRole('student')}
                className={`px-3 py-1 rounded text-sm font-medium ${activeRole === 'student' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`}
              >
                Students
              </button>
            </div>
          </div>

          {listError && (
            <div className="mb-3 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {listError}
            </div>
          )}

          {listLoading ? (
            <p className="text-sm text-gray-600">Loading {roleTitle.toLowerCase()}...</p>
          ) : users.length === 0 ? (
            <p className="text-sm text-gray-600">No {roleTitle.toLowerCase()} found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-200 rounded">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700">Name</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700">Email</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700">Created</th>
                    <th className="text-right p-3 text-sm font-semibold text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((item) => (
                    <tr key={item.id} className="border-t border-gray-200">
                      <td className="p-3 text-sm text-gray-800">{item.name}</td>
                      <td className="p-3 text-sm text-gray-800">{item.email}</td>
                      <td className="p-3 text-sm text-gray-600">
                        {item.created_at ? new Date(item.created_at).toLocaleString() : '-'}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
                          className="px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-white text-sm"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminUserManagement;
