import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const AuthContext = createContext();

const AUTH_STORAGE_KEY = 'campusca_auth';
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:4000';

// apiRequest will be provided by the AuthProvider so it has access to the
// current session and can automatically attach Authorization headers.

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setUser(parsed.user);
        setSession(parsed.session);
      } catch (err) {
        console.error('Failed to parse stored auth data', err);
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    }
    setLoading(false);
  }, []);

  const persistAuth = (authPayload) => {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authPayload));
    setUser(authPayload.user);
    setSession(authPayload.session);
  };

  const login = async (email, password) => {
    console.log('[Auth] login: sending credentials for', email);
    const data = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    console.log('[Auth] login: response', data);

    const authPayload = {
      user: data.user,
      session: {
        accessToken: data.session?.access_token,
        refreshToken: data.session?.refresh_token,
        expiresAt: data.session?.expires_at
      }
    };

    persistAuth(authPayload);
    console.log('[Auth] login: persisted auth payload', authPayload);
    return data.user;
  };
  const register = async (email, password, name, role) => {
    const data = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name, role })
    });

    // backend returns the created user object
    return data;
  };

  // apiRequest helper that attaches Authorization header if a session exists
  const apiRequest = async (path, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    if (session?.accessToken) {
      headers['Authorization'] = `Bearer ${session.accessToken}`;
    } else {
      // try reading from localStorage in case of a page refresh and session not yet loaded
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.session?.accessToken) headers['Authorization'] = `Bearer ${parsed.session.accessToken}`;
        } catch (e) {
          // ignore
        }
      }
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers
    });

    if (response.status === 204) return null;

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const message = payload?.message || 'Request failed';
      const e = new Error(message);
      if (payload?.details) e.details = payload.details;
      throw e;
    }

    return payload;
  };

  const logout = (clearAllData = false) => {
    setUser(null);
    setSession(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);

    if (clearAllData) {
      localStorage.removeItem('campusca_rooms');
      localStorage.removeItem('campusca_student_rooms');
    }

    window.location.href = '/';
  };

  const clearAllData = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem('campusca_rooms');
    localStorage.removeItem('campusca_student_rooms');
    setUser(null);
    setSession(null);
  };

  const migrateOldData = () => {
    const rooms = JSON.parse(localStorage.getItem('campusca_rooms') || '[]');
    const studentRooms = JSON.parse(localStorage.getItem('campusca_student_rooms') || '[]');
    console.log('Found rooms:', rooms.length);
    console.log('Found student joins:', studentRooms.length);
    return { rooms, studentRooms };
  };

  const value = useMemo(
    () => ({
      user,
      session,
      apiRequest,
      login,
      register,
      logout,
      clearAllData,
      migrateOldData,
      loading,
      apiBaseUrl: API_BASE_URL
    }),
    [user, session, loading]
  );

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
