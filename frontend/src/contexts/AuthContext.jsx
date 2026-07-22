// frontend/src/contexts/AuthContext.jsx
// Provides authentication state (admin login status, user data, token) to the entire app

import React, { createContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('adminToken') || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if token exists and validate it on mount
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        // Set token in API headers
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        const response = await api.get('/auth/me');
        setUser(response.data.admin);
        setError(null);
      } catch (err) {
        // Token invalid or expired
        console.error('Auth validation error:', err);
        localStorage.removeItem('adminToken');
        setToken(null);
        setUser(null);
        delete api.defaults.headers.common['Authorization'];
        setError('Session expired. Please log in again.');
      } finally {
        setLoading(false);
      }
    };

    validateToken();
  }, [token]);

  // Login function
  const login = useCallback(async (username, password) => {
    try {
      setLoading(true);
      const response = await api.post('/auth/login', { username, password });
      const { token: newToken, admin } = response.data;

      // Store token
      localStorage.setItem('adminToken', newToken);
      setToken(newToken);
      setUser(admin);
      api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      setError(null);
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed. Please try again.';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Logout function
  const logout = useCallback(async () => {
    try {
      // Optionally call logout endpoint
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      // Clear local state regardless
      localStorage.removeItem('adminToken');
      setToken(null);
      setUser(null);
      delete api.defaults.headers.common['Authorization'];
      setError(null);
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => setError(null), []);

  const value = {
    user,
    token,
    loading,
    error,
    isAuthenticated: !!user && !!token,
    login,
    logout,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};