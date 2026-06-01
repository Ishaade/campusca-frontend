import React from 'react';
import { Link } from 'react-router-dom';

function Register() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            Registration Disabled
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            For security, self-registration is turned off.
          </p>
        </div>
        <div className="card text-center">
          <p className="text-gray-700">
            Please contact your administrator. Admins can create teacher and student accounts from the admin panel.
          </p>
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/auth/login" className="text-blue-600 hover:text-blue-500 font-medium">
              Sign in here
            </Link>
          </p>
          <p className="text-sm text-gray-600 mt-2">
            <Link to="/" className="text-blue-600 hover:text-blue-500 font-medium">
              ← Back to Home
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;
