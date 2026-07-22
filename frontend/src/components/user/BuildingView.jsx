// frontend/src/components/user/BuildingView.jsx
// End-user view – displays a building's floors with clickable nodes, and allows room selection for navigation

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useMapData } from '../../hooks/useMapData';
import { usePathfinding } from '../../hooks/usePathfinding';
import LoadingSpinner from '../common/LoadingSpinner';
import PathDisplay from './PathDisplay';
import DirectionsList from './DirectionsList';
import api from '../../services/api';

const BuildingView = () => {
  const { buildingId } = useParams();
  const navigate = useNavigate();
  const { buildings, floors, fetchFloors, loading } = useMapData();
  const { findPath, pathResult, loading: pathLoading, error: pathError, clearPath } = usePathfinding();

  const [building, setBuilding] = useState(null);
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [floorNodes, setFloorNodes] = useState([]);
  const [floorEdges, setFloorEdges] = useState([]);
  const [floorSvg, setFloorSvg] = useState(null);
  const [selectedSource, setSelectedSource] = useState(null);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [showPath, setShowPath] = useState(false);
  const [localError, setLocalError] = useState(null);

  // Load building and floors
  useEffect(() => {
    if (buildingId) {
      const found = buildings.find(b => b._id === buildingId);
      if (found) setBuilding(found);
      fetchFloors(buildingId);
    }
  }, [buildingId, buildings]);

  // Set first floor as default when floors load
  useEffect(() => {
    const buildingFloors = floors[buildingId] || [];
    if (buildingFloors.length > 0 && !selectedFloor) {
      setSelectedFloor(buildingFloors[0]);
      loadFloorData(buildingFloors[0]);
    }
  }, [floors, buildingId]);

  const loadFloorData = async (floor) => {
    if (!floor) return;
    try {
      const response = await api.get(`/floors/${buildingId}/${floor.floorNumber}`);
      const { floor: floorData, edges } = response.data.data;
      setFloorSvg(floorData.svgData);
      setFloorNodes(floorData.nodeIds || []);
      setFloorEdges(edges || []);
      // Reset path when floor changes
      clearPath();
      setShowPath(false);
      setSelectedSource(null);
      setSelectedTarget(null);
    } catch (err) {
      setLocalError('Failed to load floor data');
      console.error(err);
    }
  };

  const handleFloorChange = (floorNumber) => {
    const floor = floors[buildingId]?.find(f => f.floorNumber === floorNumber);
    if (floor) {
      setSelectedFloor(floor);
      loadFloorData(floor);
    }
  };

  const handleNodeClick = (node) => {
    if (node.type === 'junction') return; // Can't select junctions as source/target
    if (!selectedSource) {
      setSelectedSource(node);
      setSelectedTarget(null);
      setShowPath(false);
      clearPath();
    } else if (!selectedTarget && node._id !== selectedSource._id) {
      setSelectedTarget(node);
      // Trigger pathfinding
      findPath(selectedSource._id, node._id, true);
      setShowPath(true);
    } else {
      // Reset selection
      setSelectedSource(node);
      setSelectedTarget(null);
      setShowPath(false);
      clearPath();
    }
  };

  const handleClearSelection = () => {
    setSelectedSource(null);
    setSelectedTarget(null);
    setShowPath(false);
    clearPath();
  };

  // Render nodes on SVG with click handlers
  const renderFloorWithNodes = () => {
    if (!floorSvg) return <div className="text-gray-500">No floor map available.</div>;

    return (
      <div className="relative w-full" style={{ minHeight: '400px' }}>
        <div dangerouslySetInnerHTML={{ __html: floorSvg }} />
        {/* Overlay for clickable nodes */}
        <svg
          className="absolute top-0 left-0 w-full h-full pointer-events-none"
          viewBox="0 0 1000 800"
        >
          {floorNodes.map(node => {
            if (node.type === 'junction') return null;
            const isSource = selectedSource?._id === node._id;
            const isTarget = selectedTarget?._id === node._id;
            const isStaircase = node.type === 'staircase';
            const color = isSource ? '#00cc44' : isTarget ? '#ff3333' : isStaircase ? '#ff8800' : '#0066cc';
            const radius = isSource || isTarget ? 8 : 5;
            return (
              <g
                key={node._id}
                className="pointer-events-auto cursor-pointer"
                onClick={() => handleNodeClick(node)}
                style={{ pointerEvents: 'auto' }}
              >
                <circle cx={node.x} cy={node.y} r={radius} fill={color} stroke="#fff" strokeWidth="2" />
                {node.label && (
                  <text x={node.x + radius + 4} y={node.y + 4} fontSize="10" fill="#333">
                    {node.label}
                  </text>
                )}
                {isStaircase && (
                  <text x={node.x - 8} y={node.y - 10} fontSize="12">🔗</text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  if (loading && !building) {
    return <LoadingSpinner fullScreen text="Loading building..." />;
  }

  if (!building) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Building not found.</p>
          <Link to="/" className="text-blue-600 hover:underline mt-2 inline-block">← Back to Campus</Link>
        </div>
      </div>
    );
  }

  const buildingFloors = floors[buildingId] || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center flex-wrap gap-2">
          <div>
            <Link to="/" className="text-gray-600 hover:text-gray-800">← Campus</Link>
            <h1 className="text-2xl font-bold text-gray-800 mt-1">{building.name}</h1>
            <p className="text-sm text-gray-500">{building.code}</p>
          </div>
          <nav className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/navigate')}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
              Find Path
            </button>
            <button
              onClick={() => navigate('/admin/login')}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Admin
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Error display */}
        {(localError || pathError) && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {localError || pathError}
          </div>
        )}

        {/* Floor selector */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex items-center flex-wrap gap-4">
            <span className="font-medium">Floor:</span>
            {buildingFloors.length === 0 ? (
              <span className="text-gray-500">No floors available</span>
            ) : (
              buildingFloors
                .sort((a, b) => a.floorNumber - b.floorNumber)
                .map(floor => (
                  <button
                    key={floor._id}
                    onClick={() => handleFloorChange(floor.floorNumber)}
                    className={`px-4 py-2 rounded transition ${
                      selectedFloor?.floorNumber === floor.floorNumber
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    Floor {floor.floorNumber}
                    <span className="text-xs ml-1 text-gray-500">
                      ({floor.nodeIds?.length || 0} rooms)
                    </span>
                  </button>
                ))
            )}
          </div>
        </div>

        {/* Map display */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">
              Floor {selectedFloor?.floorNumber}
              {selectedSource && (
                <span className="ml-4 text-sm font-normal text-green-600">
                  Source: {selectedSource.label || selectedSource._id}
                </span>
              )}
              {selectedTarget && (
                <span className="ml-4 text-sm font-normal text-red-600">
                  Target: {selectedTarget.label || selectedTarget._id}
                </span>
              )}
            </h2>
            {(selectedSource || selectedTarget) && (
              <button
                onClick={handleClearSelection}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Clear Selection
              </button>
            )}
          </div>
          {renderFloorWithNodes()}
        </div>

        {/* Path results */}
        {pathResult && pathResult.found && (
          <div className="bg-white rounded-lg shadow-md p-4">
            <h3 className="font-semibold mb-2">Path Found! 🗺️</h3>
            <p className="text-sm text-gray-600 mb-3">
              Total distance: {pathResult.totalWeight?.toFixed(1)} units
              {pathResult.floorTransitions?.length > 0 && (
                <span className="ml-2 text-orange-600">
                  (Crosses {pathResult.floorTransitions.length} floor{pathResult.floorTransitions.length > 1 ? 's' : ''})
                </span>
              )}
            </p>
            {pathResult.steps && pathResult.steps.length > 0 && (
              <DirectionsList steps={pathResult.steps} />
            )}
            {pathResult.path && (
              <PathDisplay 
                nodes={pathResult.path} 
                svgString={floorSvg}
                className="mt-4"
              />
            )}
          </div>
        )}

        {pathResult && !pathResult.found && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
            No path found between the selected points.
          </div>
        )}

        {/* Room list */}
        <div className="mt-6 bg-white rounded-lg shadow-md p-4">
          <h3 className="font-semibold mb-2">Rooms on this floor</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {floorNodes
              .filter(n => n.type === 'room')
              .map(node => (
                <button
                  key={node._id}
                  onClick={() => handleNodeClick(node)}
                  className={`p-2 text-left text-sm border rounded hover:bg-blue-50 transition ${
                    selectedSource?._id === node._id ? 'border-green-500 bg-green-50' :
                    selectedTarget?._id === node._id ? 'border-red-500 bg-red-50' :
                    'border-gray-200'
                  }`}
                >
                  <div className="font-medium">{node.label || 'Unnamed'}</div>
                  <div className="text-xs text-gray-400">x:{node.x.toFixed(0)} y:{node.y.toFixed(0)}</div>
                </button>
              ))}
            {floorNodes.filter(n => n.type === 'room').length === 0 && (
              <p className="text-gray-500 col-span-full">No rooms marked on this floor.</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default BuildingView;