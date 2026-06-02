import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

function ChangePassword() {
  const { apiRequest, user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [limitInfo, setLimitInfo] = useState(null);

  const fetchLimitInfo = async () => {
    try {
      const data = await apiRequest('/api/auth/student/password-change-info');
      setLimitInfo(data);
    } catch {
      setLimitInfo(null);
    }
  };

  useEffect(() => {
    fetchLimitInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (limitInfo && !limitInfo.canChange) {
      setError(`You have used all ${limitInfo.maxChanges} password changes. Contact your administrator.`);
      setLoading(false);
      return;
    }

    try {
      const data = await apiRequest('/api/auth/student/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword })
      });
      setSuccess(data?.message || 'Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      await fetchLimitInfo();
    } catch (err) {
      setError(err?.message || 'Could not change password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">Change password</h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Students only. Logged in as {user?.email}.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="card">
            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
                {success}
              </div>
            )}

            {limitInfo && (
              <div className={`mb-4 p-3 rounded border ${limitInfo.canChange ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-yellow-50 border-yellow-200 text-yellow-800'}`}>
                Password changes used: {limitInfo.usedChanges} / {limitInfo.maxChanges}
                {limitInfo.canChange
                  ? ` (${limitInfo.remainingChanges} remaining)`
                  : ' — limit reached'}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="currentPassword" className="form-label">Current password</label>
              <input
                id="currentPassword"
                name="currentPassword"
                type="password"
                minLength={6}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="form-input"
                placeholder="Enter current password"
              />
            </div>

            <div className="form-group">
              <label htmlFor="newPassword" className="form-label">New password</label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                minLength={6}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="form-input"
                placeholder="At least 6 characters"
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label">Confirm new password</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                minLength={6}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="form-input"
                placeholder="Repeat new password"
              />
            </div>

            <div className="mt-6">
              <button
                type="submit"
                disabled={loading || (limitInfo && !limitInfo.canChange)}
                className="btn btn-primary w-full"
              >
                {loading ? 'Saving...' : 'Change password'}
              </button>
            </div>
          </div>
        </form>

        <div className="text-center text-sm text-gray-600">
          <Link to="/auth/login" className="text-blue-600 hover:text-blue-500 font-medium">
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ChangePassword;
