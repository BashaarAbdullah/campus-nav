// frontend/src/contexts/MapContext.jsx
// Provides global state for buildings, floors, nodes, and edges across the app

import React, { createContext, useState, useCallback, useEffect } from 'react';
import api from '../services/api';

export const MapContext = createContext(null);

export const MapProvider = ({ children }) => {
  const [buildings, setBuildings] = useState([]);
  const [floors, setFloors] = useState({}); // key: buildingId, value: array of floors
  const [nodes, setNodes] = useState({}); // key: floorId, value: array of nodes
  const [edges, setEdges] = useState({}); // key: floorId, value: array of edges
  const [masterSvg, setMasterSvg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch all buildings
  const fetchBuildings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/buildings');
      setBuildings(response.data.data);
      setError(null);
      return response.data.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch buildings');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch floors for a building
  const fetchFloors = useCallback(async (buildingId) => {
    try {
      const response = await api.get(`/floors/building/${buildingId}`);
      setFloors(prev => ({ ...prev, [buildingId]: response.data.data }));
      return response.data.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch floors');
      return [];
    }
  }, []);

  // Fetch a specific floor (with nodes and edges)
  const fetchFloorData = useCallback(async (buildingId, floorNumber) => {
    try {
      const response = await api.get(`/floors/${buildingId}/${floorNumber}`);
      const { floor, edges: floorEdges } = response.data.data;
      // Store nodes and edges by floorId
      setNodes(prev => ({ ...prev, [floor._id]: floor.nodeIds || [] }));
      setEdges(prev => ({ ...prev, [floor._id]: floorEdges || [] }));
      return { floor, edges: floorEdges };
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch floor data');
      return null;
    }
  }, []);

  // Add a node (optimistic update)
  const addNode = useCallback(async (floorId, nodeData) => {
    try {
      const response = await api.post('/nodes', { floorId, ...nodeData });
      const newNode = response.data.data;
      setNodes(prev => ({
        ...prev,
        [floorId]: [...(prev[floorId] || []), newNode],
      }));
      return newNode;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add node');
      throw err;
    }
  }, []);

  // Update a node
  const updateNode = useCallback(async (nodeId, updates) => {
    try {
      const response = await api.put(`/nodes/${nodeId}`, updates);
      const updatedNode = response.data.data;
      // Find which floor this node belongs to and update it in state
      setNodes(prev => {
        const newNodes = { ...prev };
        for (const floorId in newNodes) {
          const index = newNodes[floorId].findIndex(n => n._id === nodeId);
          if (index !== -1) {
            newNodes[floorId] = [...newNodes[floorId]];
            newNodes[floorId][index] = updatedNode;
            break;
          }
        }
        return newNodes;
      });
      return updatedNode;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update node');
      throw err;
    }
  }, []);

  // Delete a node
  const deleteNode = useCallback(async (nodeId, floorId) => {
    try {
      await api.delete(`/nodes/${nodeId}`);
      setNodes(prev => ({
        ...prev,
        [floorId]: (prev[floorId] || []).filter(n => n._id !== nodeId),
      }));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete node');
      throw err;
    }
  }, []);

  // Add an edge
  const addEdge = useCallback(async (edgeData) => {
    try {
      const response = await api.post('/edges', edgeData);
      const newEdge = response.data.data;
      const { floorId } = edgeData;
      setEdges(prev => ({
        ...prev,
        [floorId]: [...(prev[floorId] || []), newEdge],
      }));
      return newEdge;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add edge');
      throw err;
    }
  }, []);

  // Delete an edge
  const deleteEdge = useCallback(async (edgeId, floorId) => {
    try {
      await api.delete(`/edges/${edgeId}`);
      setEdges(prev => ({
        ...prev,
        [floorId]: (prev[floorId] || []).filter(e => e._id !== edgeId),
      }));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete edge');
      throw err;
    }
  }, []);

  // Delete all edges for a floor
  const deleteEdgesByFloor = useCallback(async (floorId) => {
    try {
      await api.delete(`/edges/floor/${floorId}`);
      setEdges(prev => ({ ...prev, [floorId]: [] }));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete edges');
      throw err;
    }
  }, []);

  // Upload a floor SVG
  const uploadFloor = useCallback(async (buildingId, floorNumber, svgData, metadata = {}) => {
    try {
      const response = await api.post('/floors/upload', {
        buildingId,
        floorNumber,
        svgData,
        metadata,
      });
      const floor = response.data.data;
      // Refresh floors for this building
      await fetchFloors(buildingId);
      return floor;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload floor');
      throw err;
    }
  }, [fetchFloors]);

  // Auto-link staircases
  const autoLinkStaircases = useCallback(async (buildingId, tolerance = 10) => {
    try {
      const response = await api.post(`/staircases/building/${buildingId}/auto-link`, { tolerance });
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to auto-link staircases');
      throw err;
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => setError(null), []);

  // Initial fetch on mount
  useEffect(() => {
    fetchBuildings();
  }, [fetchBuildings]);

  const value = {
    buildings,
    floors,
    nodes,
    edges,
    masterSvg,
    loading,
    error,
    fetchBuildings,
    fetchFloors,
    fetchFloorData,
    addNode,
    updateNode,
    deleteNode,
    addEdge,
    deleteEdge,
    deleteEdgesByFloor,
    uploadFloor,
    autoLinkStaircases,
    clearError,
  };

  return <MapContext.Provider value={value}>{children}</MapContext.Provider>;
};