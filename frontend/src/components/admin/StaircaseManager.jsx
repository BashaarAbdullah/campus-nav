// frontend/src/components/admin/StaircaseManager.jsx
// Admin panel to view, create, and manage staircases across floors

import React, { useState, useEffect } from 'react';
import { useMapData } from '../../hooks/useMapData';
import api from '../../services/api';

const StaircaseManager = ({ buildingId, onClose, onRefresh }) => {
  const { buildings, floors, fetchFloors } = useMapData();
  const [staircases, setStaircases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newStaircaseName, setNewStaircaseName] = useState('');
  const [selectedNodes, setSelectedNodes] = useState({}); // floorId -> nodeId

  // Fetch all staircases for this building
  const fetchStaircases = async () => {
    if (!buildingId) return;
    setLoading(true);
    try {
      const response = await api.get(`/staircases/building/${buildingId}`);
      setStaircases(response.data.data || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch staircases');
    } finally {
      setLoading(false);
    }
  };

  // Fetch floors if not already loaded
  useEffect(() => {
    if (buildingId) {
      fetchFloors(buildingId);
      fetchStaircases();
    }
  }, [buildingId]);

  // Get all nodes for a floor
  const getFloorNodes = (floorId) => {
    // We need nodes from MapContext, but we don't have them directly.
    // We'll use a simpler approach: fetch nodes via API when needed.
    // For this component, we'll just show existing staircase info.
    return [];
  };

  const handleAutoLink = async () => {
    try {
      const result = await api.post(`/staircases/building/${buildingId}/auto-link`);
      alert(`Auto-linked ${result.data.linked} staircases.`);
      await fetchStaircases();
      if (onRefresh) onRefresh();
    } catch (err) {
      alert('Auto-link failed: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDeleteStaircase = async (staircaseId) => {
    if (!window.confirm('Delete this staircase? This will unlink all associated nodes.')) return;
    try {
      await api.delete(`/staircases/${staircaseId}`);
      await fetchStaircases();
    } catch (err) {
      alert('Delete failed: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleCreateStaircase = async (e) => {
    e.preventDefault();
    if (!newStaircaseName.trim()) {
      alert('Please enter a name for the staircase.');
      return;
    }
    // Build nodeIdsPerFloor from selectedNodes
    const nodeIdsPerFloor = {};
    for (const [floorId, nodeId] of Object.entries(selectedNodes)) {
      if (nodeId) {
        nodeIdsPerFloor[floorId] = nodeId;
      }
    }
    if (Object.keys(nodeIdsPerFloor).length < 2) {
      alert('Please select at least two nodes from different floors.');
      return;
    }
    try {
      await api.post('/staircases', {
        buildingId,
        name: newStaircaseName.trim(),
        nodeIdsPerFloor,
      });
      setShowCreateForm(false);
      setNewStaircaseName('');
      setSelectedNodes({});
      await fetchStaircases();
      if (onRefresh) onRefresh();
    } catch (err) {
      alert('Creation failed: ' + (err.response?.data?.message || err.message));
    }
  };

  // Render floor nodes for selection in create form
  const renderFloorNodeSelect = (floor) => {
    // We need to fetch nodes for this floor to populate dropdown.
    // Since we don't have them in context, we'll fetch on demand.
    const [nodes, setNodes] = useState([]);
    const [loadingNodes, setLoadingNodes] = useState(false);

    useEffect(() => {
      const fetchNodes = async () => {
        if (!floor?._id) return;
        setLoadingNodes(true);
        try {
          const res = await api.get(`/nodes/floor/${floor._id}`);
          setNodes(res.data.data || []);
        } catch (err) {
          console.error('Failed to fetch nodes:', err);
        } finally {
          setLoadingNodes(false);
        }
      };
      fetchNodes();
    }, [floor]);

    return (
      <select
        value={selectedNodes[floor._id] || ''}
        onChange={(e) => setSelectedNodes(prev => ({ ...prev, [floor._id]: e.target.value }))}
        className="w-full p-1 border rounded text-sm"
        disabled={loadingNodes}
      >
        <option value="">-- Select node --</option>
        {nodes.filter(n => n.type === 'staircase').map(n => (
          <option key={n._id} value={n._id}>
            {n.label || n._id} (x:{n.x.toFixed(0)}, y:{n.y.toFixed(0)})
          </option>
        ))}
        {nodes.filter(n => n.type !== 'staircase').map(n => (
          <option key={n._id} value={n._id}>
            {n.label || n._id} (non-staircase)
          </option>
        ))}
      </select>
    );
  };

  return (
    <div className="bg-white rounded-lg p-4 max-h-[80vh] overflow-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Staircase Manager</h2>
        <button
          onClick={onClose}
          className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
        >
          Close
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4">
          {error}
        </div>
      )}

      <div className="flex gap-2 mb-4">
        <button
          onClick={handleAutoLink}
          className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
        >
          Auto-Link Staircases
        </button>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {showCreateForm ? 'Cancel' : 'Create Manual'}
        </button>
      </div>

      {showCreateForm && (
        <form onSubmit={handleCreateStaircase} className="bg-gray-50 p-4 rounded border mb-4">
          <h3 className="font-medium mb-2">Create New Staircase</h3>
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={newStaircaseName}
              onChange={(e) => setNewStaircaseName(e.target.value)}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., North Staircase"
              required
            />
          </div>
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Nodes (one per floor)</label>
            <div className="space-y-2 max-h-48 overflow-auto">
              {floors[buildingId]?.map(floor => (
                <div key={floor._id} className="flex items-center gap-2">
                  <span className="text-sm font-medium w-20">Floor {floor.floorNumber}</span>
                  {/* We need a node dropdown; we'll fetch per floor but in a real component we'd use a hook */}
                  {/* For brevity, we'll use a simplified version; we'll just let admin enter node IDs manually */}
                  <input
                    type="text"
                    placeholder="Node ID"
                    value={selectedNodes[floor._id] || ''}
                    onChange={(e) => setSelectedNodes(prev => ({ ...prev, [floor._id]: e.target.value }))}
                    className="flex-1 p-1 border rounded text-sm"
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1">Enter the Node ID for each floor's staircase node.</p>
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Create Staircase
          </button>
        </form>
      )}

      {/* List existing staircases */}
      {loading ? (
        <div className="text-center py-4">Loading staircases...</div>
      ) : staircases.length === 0 ? (
        <div className="text-center py-4 text-gray-500">No staircases defined yet.</div>
      ) : (
        <div className="space-y-3">
          {staircases.map(staircase => (
            <div key={staircase._id} className="border rounded p-3 bg-white">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-semibold">{staircase.name}</h4>
                  <p className="text-sm text-gray-600">
                    Floors: {Array.from(staircase.nodeIdsPerFloor?.keys() || []).join(', ')}
                  </p>
                  <p className="text-xs text-gray-400">
                    Tolerance: {staircase.tolerance} | ID: {staircase._id}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteStaircase(staircase._id)}
                  className="px-2 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StaircaseManager;