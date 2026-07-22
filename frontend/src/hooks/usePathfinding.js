// frontend/src/hooks/usePathfinding.js
// Custom hook for pathfinding – calls the backend API to find routes between nodes

import { useState, useCallback } from 'react';
import api from '../services/api';

export const usePathfinding = () => {
  const [pathResult, setPathResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Find shortest path between two nodes by their IDs
  const findPath = useCallback(async (sourceNodeId, targetNodeId, includeDirections = true) => {
    if (!sourceNodeId || !targetNodeId) {
      setError('Both source and target node IDs are required');
      return null;
    }

    setLoading(true);
    setError(null);
    setPathResult(null);

    try {
      const response = await api.post('/paths/shortest', {
        sourceNodeId,
        targetNodeId,
        includeDirections,
      });
      const result = response.data;
      setPathResult(result);
      return result;
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to find path';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Find path between two rooms by their names and building code
  const findPathByRooms = useCallback(async (sourceRoomName, targetRoomName, buildingCode) => {
    if (!sourceRoomName || !targetRoomName || !buildingCode) {
      setError('Source room, target room, and building code are required');
      return null;
    }

    setLoading(true);
    setError(null);
    setPathResult(null);

    try {
      const response = await api.post('/paths/rooms', {
        sourceRoomName,
        targetRoomName,
        buildingCode: buildingCode.toUpperCase(),
      });
      const result = response.data;
      setPathResult(result);
      return result;
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to find path';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Clear the current path result
  const clearPath = useCallback(() => {
    setPathResult(null);
    setError(null);
  }, []);

  return {
    pathResult,
    loading,
    error,
    findPath,
    findPathByRooms,
    clearPath,
  };
};