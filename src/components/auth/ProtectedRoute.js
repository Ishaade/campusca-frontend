import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

function ProtectedRoute({ children, role }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (role && user.role !== role) {
    // Redirect to appropriate dashboard based on user role
    const redirectPath = user.role === 'teacher' ? '/teacher' : user.role === 'admin' ? '/admin/users' : '/student';
    return <Navigate to={redirectPath} replace />;
  }

  return children;
}

export default ProtectedRoute;
