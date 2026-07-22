// frontend/src/App.jsx
// Root component – sets up routing, authentication context, and global providers

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { MapProvider } from './contexts/MapContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import AdminLogin from './components/admin/AdminLogin';
import AdminDashboard from './components/admin/AdminDashboard';
import MapEditor from './components/admin/MapEditor';
import CampusMap from './components/user/CampusMap';
import BuildingView from './components/user/BuildingView';
import NavigationPanel from './components/user/NavigationPanel';

function App() {
  return (
    <AuthProvider>
      <MapProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<CampusMap />} />
          <Route path="/building/:buildingId" element={<BuildingView />} />
          <Route path="/navigate" element={<NavigationPanel />} />
          
          {/* Admin routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/editor/:buildingId/:floorNumber" element={<ProtectedRoute><MapEditor /></ProtectedRoute>} />
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </MapProvider>
    </AuthProvider>
  );
}

export default App;