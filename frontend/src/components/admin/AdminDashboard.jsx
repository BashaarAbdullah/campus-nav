// frontend/src/components/admin/AdminDashboard.jsx
// Admin dashboard – overview of buildings, upload master SVG, and navigate to floor editors

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useMapData } from '../../hooks/useMapData';
import SVGUploader from './SVGUploader';
import BuildingLinker from './BuildingLinker';
import LoadingSpinner from '../common/LoadingSpinner';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const {
    buildings,
    floors,
    loading,
    fetchBuildings,
    fetchFloors,
    uploadFloor,
    masterSvg,
    fetchMasterSvg,
    error,
    clearError,
  } = useMapData();

  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [showUploader, setShowUploader] = useState(false);
  const [showLinker, setShowLinker] = useState(false);
  const [expandedBuilding, setExpandedBuilding] = useState(null);

  useEffect(() => {
    fetchBuildings();
  }, []);

  const handleBuildingClick = (buildingId) => {
    setExpandedBuilding(expandedBuilding === buildingId ? null : buildingId);
    if (!floors[buildingId]) {
      fetchFloors(buildingId);
    }
  };

  const handleUploadFloor = async (buildingId, floorNumber, svgData) => {
    try {
      await uploadFloor(buildingId, floorNumber, svgData);
      // Refresh floors
      await fetchFloors(buildingId);
      setShowUploader(false);
    } catch (err) {
      console.error('Upload failed:', err);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  if (loading && buildings.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
          <div className="flex items-center space-x-4">
            <span className="text-gray-600">Welcome, {user?.username}</span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Error display */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 flex justify-between">
            <span>{error}</span>
            <button onClick={clearError} className="text-red-700 font-bold">×</button>
          </div>
        )}

        {/* Master SVG Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Campus Master SVG</h2>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => setShowUploader(!showUploader)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
              {masterSvg ? 'Replace Master SVG' : 'Upload Master SVG'}
            </button>
            {masterSvg && (
              <button
                onClick={() => setShowLinker(!showLinker)}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
              >
                Link Building Regions
              </button>
            )}
          </div>
          {showUploader && (
            <div className="mt-4">
              <SVGUploader
                onUpload={(svgData) => {
                  // TODO: handle master SVG upload via API
                  console.log('Master SVG uploaded:', svgData);
                  setShowUploader(false);
                }}
                label="Upload Campus Master SVG"
              />
            </div>
          )}
          {showLinker && masterSvg && (
            <div className="mt-4">
              <BuildingLinker
                masterSvg={masterSvg}
                buildings={buildings}
                onLinkComplete={() => {
                  setShowLinker(false);
                  // Optionally refresh
                }}
              />
            </div>
          )}
          {masterSvg && (
            <div className="mt-4 p-4 bg-gray-50 rounded border">
              <p className="text-sm text-gray-600">Master SVG uploaded: {masterSvg.name || 'Campus Map'}</p>
              <div className="mt-2 w-full max-h-64 overflow-auto border">
                <div dangerouslySetInnerHTML={{ __html: masterSvg.svgData }} />
              </div>
            </div>
          )}
        </div>

        {/* Buildings List */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Buildings</h2>
            <button
              onClick={() => {
                // TODO: Add building creation modal
                const name = prompt('Enter building name:');
                if (name) {
                  const code = prompt('Enter building code (e.g., A):');
                  if (code) {
                    // Call API to create building
                    fetch('/api/buildings', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ name, code: code.toUpperCase() }),
                    })
                      .then(res => res.json())
                      .then(() => fetchBuildings())
                      .catch(err => console.error(err));
                  }
                }
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
              + Add Building
            </button>
          </div>

          {buildings.length === 0 ? (
            <p className="text-gray-500">No buildings yet. Create one to get started.</p>
          ) : (
            <div className="space-y-4">
              {buildings.map((building) => (
                <div key={building._id} className="border rounded-lg overflow-hidden">
                  <div
                    className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50"
                    onClick={() => handleBuildingClick(building._id)}
                  >
                    <div>
                      <h3 className="font-semibold text-lg">{building.name}</h3>
                      <p className="text-sm text-gray-600">Code: {building.code}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Link
                        to={`/admin/editor/${building._id}/1`}
                        className="px-3 py-1 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 transition"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Edit Map
                      </Link>
                      <span className="text-gray-400">
                        {expandedBuilding === building._id ? '▼' : '▶'}
                      </span>
                    </div>
                  </div>

                  {expandedBuilding === building._id && (
                    <div className="p-4 border-t bg-gray-50">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-medium">Floors</h4>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBuilding(building._id);
                            setShowUploader(true);
                          }}
                          className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition"
                        >
                          Upload Floor SVG
                        </button>
                      </div>

                      {loading && !floors[building._id] ? (
                        <LoadingSpinner />
                      ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                          {floors[building._id]?.map((floor) => (
                            <Link
                              key={floor._id}
                              to={`/admin/editor/${building._id}/${floor.floorNumber}`}
                              className="p-2 bg-white border rounded text-center hover:bg-blue-50 transition"
                            >
                              <div className="font-medium">Floor {floor.floorNumber}</div>
                              <div className="text-xs text-gray-500">
                                {floor.nodeIds?.length || 0} nodes
                              </div>
                            </Link>
                          ))}
                          {(!floors[building._id] || floors[building._id].length === 0) && (
                            <p className="text-gray-500 col-span-full">No floors uploaded yet</p>
                          )}
                        </div>
                      )}

                      {showUploader && selectedBuilding === building._id && (
                        <div className="mt-4 p-4 bg-white border rounded">
                          <SVGUploader
                            onUpload={async (svgData, fileName) => {
                              // Try to parse floor number from filename
                              const match = fileName.match(/floor[_\s]?(\d+)/i);
                              const floorNumber = match ? parseInt(match[1], 10) : prompt('Enter floor number:');
                              if (floorNumber) {
                                await handleUploadFloor(building._id, parseInt(floorNumber, 10), svgData);
                              }
                            }}
                            label="Upload Floor SVG"
                          />
                          <button
                            onClick={() => setShowUploader(false)}
                            className="mt-2 text-sm text-gray-500 hover:text-gray-700"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;