// frontend/src/services/api.js
// Axios instance with base URL, interceptors for auth token and error handling

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
});

// Request interceptor: attach token if present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle common errors (401, 403, 500)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const { response } = error;
    if (response) {
      // 401 Unauthorized - clear token and redirect to login (handled in AuthContext)
      if (response.status === 401) {
        localStorage.removeItem('adminToken');
        // Optionally redirect, but AuthContext will handle this
      }
      // 403 Forbidden - user lacks permission
      if (response.status === 403) {
        console.error('Forbidden: You do not have permission to perform this action.');
      }
      // 500 Server error
      if (response.status >= 500) {
        console.error('Server error:', response.data?.message || 'Internal server error');
      }
    } else if (error.code === 'ECONNABORTED') {
      console.error('Request timeout - please check your network connection.');
    } else {
      console.error('Network error - please check your connection.');
    }
    return Promise.reject(error);
  }
);

export default api;