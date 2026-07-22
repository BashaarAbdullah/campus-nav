// frontend/src/components/user/NavigationPanel.jsx
// End-user search interface – select source and destination rooms, view path results

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMapData } from '../../hooks/useMapData';
import { usePathfinding } from '../../hooks/usePathfinding';
import LoadingSpinner from '../common/LoadingSpinner';
import DirectionsList from './DirectionsList';
import PathDisplay from './PathDisplay';
import api from '../../services/api';

const NavigationPanel = () => {
  const navigate = useNavigate();
  const { buildings, floors, fetchBuildings, fetchFloors, loading: mapLoading } = useMapData();
  const { findPath, findPathByRooms, pathResult, loading: pathLoading, error: pathError, clearPath } = usePathfinding();

  const [selectedBuildingId, setSelectedBuildingId] = useState('');
  const [sourceRoom, setSourceRoom] = useState('');
  const [targetRoom, setTargetRoom] = useState('');
  const [buildingRooms, setBuildingRooms] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [showResults, setShowResults] = useState(false);

  // Load buildings on mount
  useEffect(() => {
    fetchBuildings();
  }, []);

  // When building changes, load its floors and rooms
  useEffect(() => {
    if (selectedBuildingId) {
      fetchFloors(selectedBuildingId);
      loadRoomsForBuilding(selectedBuildingId);
    } else {
      setBuildingRooms([]);
    }
  }, [selectedBuildingId]);

  const loadRoomsForBuilding = async (buildingId) => {
    try {
      const response = await api.get(`/nodes/building/${buildingId}/rooms`);
      // We need to add this endpoint, but we can simulate by fetching all nodes
      // For now, we'll use a simpler approach: get all floors, then all nodes
      const buildingFloors = floors[buildingId] || [];
      let allRooms = [];
      for (const floor of buildingFloors) {
        const res = await api.get(`/nodes/floor/${floor._id}`);
        const rooms = res.data.data.filter(n => n.type === 'room');
        allRooms = [...allRooms, ...rooms.map(r => ({ ...r, floorNumber: floor.floorNumber }))];
      }
      setBuildingRooms(allRooms);
    } catch (err) {
      console.error('Failed to load rooms:', err);
      setBuildingRooms([]);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setSearchError(null);
    setShowResults(false);
    clearPath();

    if (!selectedBuildingId) {
      setSearchError('Please select a building.');
      return;
    }
    if (!sourceRoom.trim() || !targetRoom.trim()) {
      setSearchError('Please enter both source and destination rooms.');
      return;
    }

    setIsSearching(true);
    const building = buildings.find(b => b._id === selectedBuildingId);
    if (!building) {
      setSearchError('Building not found.');
      setIsSearching(false);
      return;
    }

    const result = await findPathByRooms(sourceRoom.trim(), targetRoom.trim(), building.code);
    setIsSearching(false);

    if (result && result.found) {
      setShowResults(true);
    } else if (result && !result.found) {
      setSearchError('No path found between these rooms.');
    }
  };

  const handleBuildingSelect = (e) => {
    const id = e.target.value;
    setSelectedBuildingId(id);
    setSourceRoom('');
    setTargetRoom('');
    setShowResults(false);
    clearPath();
  };

  // Quick select room from list
  const handleRoomSelect = (field, roomLabel) => {
    if (field === 'source') {
      setSourceRoom(roomLabel);
    } else {
      setTargetRoom(roomLabel);
    }
  };

  const buildingOptions = buildings.map(b => (
    <option key={b._id} value={b._id}>{b.name} ({b.code})</option>
  ));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <Link to="/" className="text-gray-600 hover:text-gray-800">← Campus</Link>
            <h1 className="text-2xl font-bold text-gray-800 mt-1">Find Your Way</h1>
            <p className="text-sm text-gray-500">Navigate between rooms on campus</p>
          </div>
          <button
            onClick={() => navigate('/admin/login')}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Admin
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Search Form */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <form onSubmit={handleSearch}>
            {/* Building selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Building</label>
              <select
                value={selectedBuildingId}
                onChange={handleBuildingSelect}
                className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select a building</option>
                {buildingOptions}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Source */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From (Source Room)</label>
                <input
                  type="text"
                  value={sourceRoom}
                  onChange={(e) => setSourceRoom(e.target.value)}
                  placeholder="e.g., Room 101"
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  list="source-suggestions"
                />
                <datalist id="source-suggestions">
                  {buildingRooms.map(room => (
                    <option key={room._id} value={room.label || ''} />
                  ))}
                </datalist>
                {buildingRooms.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {buildingRooms.slice(0, 5).map(room => (
                      <button
                        key={room._id}
                        type="button"
                        onClick={() => handleRoomSelect('source', room.label)}
                        className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-0.5 rounded"
                      >
                        {room.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Target */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To (Destination Room)</label>
                <input
                  type="text"
                  value={targetRoom}
                  onChange={(e) => setTargetRoom(e.target.value)}
                  placeholder="e.g., Room 305"
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  list="target-suggestions"
                />
                <datalist id="target-suggestions">
                  {buildingRooms.map(room => (
                    <option key={room._id} value={room.label || ''} />
                  ))}
                </datalist>
                {buildingRooms.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {buildingRooms.slice(0, 5).map(room => (
                      <button
                        key={room._id}
                        type="button"
                        onClick={() => handleRoomSelect('target', room.label)}
                        className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-0.5 rounded"
                      >
                        {room.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="submit"
                disabled={isSearching || pathLoading || mapLoading}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50"
              >
                {isSearching || pathLoading ? 'Finding...' : 'Find Path'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSourceRoom('');
                  setTargetRoom('');
                  setShowResults(false);
                  clearPath();
                  setSearchError(null);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
              >
                Clear
              </button>
            </div>
          </form>

          {/* Error messages */}
          {searchError && (
            <div className="mt-4 bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
              {searchError}
            </div>
          )}
          {pathError && (
            <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {pathError}
            </div>
          )}
        </div>

        {/* Results */}
        {showResults && pathResult && pathResult.found && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-semibold">Route Found 🗺️</h2>
                <p className="text-sm text-gray-600">
                  From <strong>{sourceRoom}</strong> to <strong>{targetRoom}</strong>
                </p>
              </div>
              <span className="text-sm bg-green-100 text-green-800 px-3 py-1 rounded-full">
                {pathResult.totalWeight?.toFixed(1)} units
              </span>
            </div>

            {pathResult.floorTransitions && pathResult.floorTransitions.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded p-3 mb-4">
                <p className="text-sm text-orange-700">
                  🪜 This route crosses {pathResult.floorTransitions.length} floor transition(s):
                  {pathResult.floorTransitions.map((t, i) => (
                    <span key={i} className="ml-2 text-xs bg-orange-100 px-2 py-0.5 rounded">
                      {t.fromFloor} → {t.toFloor}
                    </span>
                  ))}
                </p>
              </div>
            )}

            {pathResult.steps && pathResult.steps.length > 0 && (
              <div className="mb-4">
                <DirectionsList steps={pathResult.steps} />
              </div>
            )}

            {pathResult.path && pathResult.path.length > 0 && (
              <div>
                <h3 className="font-medium mb-2">Path Preview</h3>
                <PathDisplay 
                  nodes={pathResult.path} 
                  className="border rounded p-2 bg-gray-50"
                />
              </div>
            )}
          </div>
        )}

        {showResults && pathResult && !pathResult.found && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
              No route found between these rooms. They might be in different buildings or not connected.
            </div>
          </div>
        )}

        {/* Loading state */}
        {mapLoading && <LoadingSpinner text="Loading campus data..." />}
      </main>
    </div>
  );
};

export default NavigationPanel;