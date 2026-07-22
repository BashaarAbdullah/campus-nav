// frontend/src/components/admin/MapEditor.jsx
// Interactive map editor – renders floor SVG, allows admin to place/edit nodes and draw edges

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMapData } from '../../hooks/useMapData';
import NodeToolbar from './NodeToolbar';
import EdgeDrawTool from './EdgeDrawTool';
import StaircaseManager from './StaircaseManager';
import FloorSelector from './FloorSelector';
import LoadingSpinner from '../common/LoadingSpinner';
import { addPathOverlay } from '../../services/svgUtils';
import api from '../../services/api';

const MapEditor = () => {
  const { buildingId, floorNumber } = useParams();
  const navigate = useNavigate();
  const {
    buildings,
    floors,
    nodes,
    edges,
    loading,
    fetchBuildings,
    fetchFloors,
    fetchFloorData,
    addNode,
    updateNode,
    deleteNode,
    addEdge,
    deleteEdge,
    autoLinkStaircases,
    clearError,
    error,
  } = useMapData();

  const [currentFloor, setCurrentFloor] = useState(null);
  const [svgData, setSvgData] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [toolMode, setToolMode] = useState('select'); // 'select', 'place-room', 'place-staircase', 'place-junction', 'draw-edge'
  const [isDrawingEdge, setIsDrawingEdge] = useState(false);
  const [edgeSource, setEdgeSource] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [svgContainer, setSvgContainer] = useState(null);
  const [svgDimensions, setSvgDimensions] = useState({ width: 0, height: 0 });
  const [localNodes, setLocalNodes] = useState([]);
  const [localEdges, setLocalEdges] = useState([]);
  const [showStaircaseManager, setShowStaircaseManager] = useState(false);

  const svgRef = useRef(null);
  const containerRef = useRef(null);

  // Load building and floor data
  useEffect(() => {
    fetchBuildings();
    if (buildingId) {
      fetchFloors(buildingId);
    }
  }, [buildingId]);

  useEffect(() => {
    if (buildingId && floorNumber) {
      loadFloorData(buildingId, parseInt(floorNumber));
    }
  }, [buildingId, floorNumber]);

  const loadFloorData = async (bId, fNum) => {
    const result = await fetchFloorData(bId, fNum);
    if (result) {
      setCurrentFloor(result.floor);
      setSvgData(result.floor.svgData);
      setLocalNodes(result.floor.nodeIds || []);
      setLocalEdges(result.edges || []);
    }
  };

  // Handle floor change via FloorSelector
  const handleFloorChange = (newFloorNumber) => {
    navigate(`/admin/editor/${buildingId}/${newFloorNumber}`);
  };

  // Get node position from click event relative to SVG
  const getNodePosition = (e) => {
    if (!svgRef.current) return null;
    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    // Scale if viewBox is set
    const viewBox = svg.getAttribute('viewBox');
    if (viewBox) {
      const [, , vbWidth, vbHeight] = viewBox.split(' ').map(Number);
      if (vbWidth && vbHeight) {
        const scaleX = vbWidth / rect.width;
        const scaleY = vbHeight / rect.height;
        return { x: x * scaleX, y: y * scaleY };
      }
    }
    return { x, y };
  };

  const handleSvgClick = async (e) => {
    if (toolMode === 'select' || toolMode === 'draw-edge') return;
    const pos = getNodePosition(e);
    if (!pos) return;

    if (toolMode === 'place-room' || toolMode === 'place-staircase' || toolMode === 'place-junction') {
      const nodeType = toolMode.replace('place-', '');
      const label = prompt(`Enter label for ${nodeType}:`, nodeType === 'staircase' ? 'Staircase' : '');
      if (label === null) return; // cancelled
      try {
        const newNode = await addNode(currentFloor._id, {
          type: nodeType,
          label: label || `${nodeType}-${Date.now()}`,
          x: pos.x,
          y: pos.y,
          properties: {},
        });
        setLocalNodes(prev => [...prev, newNode]);
        if (nodeType === 'staircase') {
          // Trigger auto-link after placing staircase? Maybe admin does manually.
          // We'll just prompt to run auto-link later.
        }
      } catch (err) {
        console.error('Failed to add node:', err);
      }
    }
  };

  const handleNodeClick = (node, e) => {
    e.stopPropagation();
    if (toolMode === 'select') {
      setSelectedNode(node);
    } else if (toolMode === 'draw-edge') {
      if (!edgeSource) {
        setEdgeSource(node);
        setIsDrawingEdge(true);
      } else if (edgeSource._id !== node._id) {
        // Create edge
        createEdge(edgeSource, node);
        setEdgeSource(null);
        setIsDrawingEdge(false);
      } else {
        // Clicked same node, cancel
        setEdgeSource(null);
        setIsDrawingEdge(false);
      }
    }
  };

  const createEdge = async (source, target) => {
    try {
      const newEdge = await addEdge({
        sourceNodeId: source._id,
        targetNodeId: target._id,
        floorId: currentFloor._id,
        weight: 1.0,
        bidirectional: true,
      });
      setLocalEdges(prev => [...prev, newEdge]);
    } catch (err) {
      console.error('Failed to add edge:', err);
    }
  };

  const handleDeleteNode = async (node) => {
    if (window.confirm(`Delete node "${node.label}"?`)) {
      try {
        await deleteNode(node._id, currentFloor._id);
        setLocalNodes(prev => prev.filter(n => n._id !== node._id));
        setSelectedNode(null);
      } catch (err) {
        console.error('Failed to delete node:', err);
      }
    }
  };

  const handleDeleteEdge = async (edge) => {
    if (window.confirm('Delete this edge?')) {
      try {
        await deleteEdge(edge._id, currentFloor._id);
        setLocalEdges(prev => prev.filter(e => e._id !== edge._id));
      } catch (err) {
        console.error('Failed to delete edge:', err);
      }
    }
  };

  const handleUpdateNode = async (nodeId, updates) => {
    try {
      const updated = await updateNode(nodeId, updates);
      setLocalNodes(prev => prev.map(n => n._id === nodeId ? updated : n));
      setSelectedNode(updated);
    } catch (err) {
      console.error('Failed to update node:', err);
    }
  };

  const handleAutoLinkStaircases = async () => {
    if (!buildingId) return;
    try {
      await autoLinkStaircases(buildingId);
      // Refresh floor data to get updated node staircaseIds
      await loadFloorData(buildingId, parseInt(floorNumber));
      alert('Staircases auto-linked successfully!');
    } catch (err) {
      console.error('Auto-link failed:', err);
      alert('Auto-link failed: ' + err.message);
    }
  };

  // Render SVG with nodes and edges overlaid
  const renderSvg = () => {
    if (!svgData) return <div className="text-gray-500">No SVG loaded for this floor.</div>;

    // We'll embed the SVG in a div and overlay nodes/edges using absolute positioning.
    // However, to keep it simple, we'll render the SVG as-is and overlay via an SVG overlay.
    // For better interactivity, we'll use a single SVG container with both the floor plan and overlays.
    // Since we have the SVG as string, we can parse and inject additional elements.
    // But a simpler approach: use an iframe or object? Better to use a div with SVG directly.
    // We'll combine by rendering the SVG string directly, then adding overlay elements.

    // For now, we'll use a wrapper div and place overlay elements in a separate SVG on top.
    // Let's wrap the SVG in a container and overlay nodes/edges with a transparent SVG overlay.

    return (
      <div
        ref={containerRef}
        className="relative"
        style={{ width: '100%', height: '100%', minHeight: '500px', overflow: 'auto' }}
      >
        <div
          ref={svgRef}
          className="w-full h-full"
          dangerouslySetInnerHTML={{ __html: svgData }}
          onClick={handleSvgClick}
        />
        {/* Overlay for nodes and edges */}
        <svg
          className="absolute top-0 left-0 w-full h-full pointer-events-none"
          style={{ pointerEvents: 'none' }}
          viewBox="0 0 1000 800" // We should derive from SVG, but we'll use a fixed or computed viewBox
        >
          {/* Draw edges */}
          {localEdges.map(edge => {
            const source = localNodes.find(n => n._id === edge.sourceNodeId);
            const target = localNodes.find(n => n._id === edge.targetNodeId);
            if (!source || !target) return null;
            return (
              <line
                key={edge._id}
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke="#333"
                strokeWidth="2"
                strokeDasharray={edge.sourceNodeId === edge.targetNodeId ? '4,4' : ''}
                className="pointer-events-auto"
                onClick={(e) => {
                  e.stopPropagation();
                  if (toolMode === 'select') handleDeleteEdge(edge);
                }}
                style={{ cursor: 'pointer' }}
              />
            );
          })}
          {/* Draw nodes */}
          {localNodes.map(node => {
            const isSelected = selectedNode && selectedNode._id === node._id;
            const isHovered = hoveredNode && hoveredNode._id === node._id;
            const isStaircase = node.type === 'staircase';
            const isJunction = node.type === 'junction';
            const color = isStaircase ? '#ff8800' : isJunction ? '#888' : '#0066cc';
            const radius = isSelected ? 8 : isStaircase ? 7 : 5;
            return (
              <g
                key={node._id}
                className="pointer-events-auto"
                onClick={(e) => handleNodeClick(node, e)}
                onMouseEnter={() => setHoveredNode(node)}
                onMouseLeave={() => setHoveredNode(null)}
                style={{ cursor: 'pointer' }}
              >
                <circle cx={node.x} cy={node.y} r={radius} fill={color} stroke="#fff" strokeWidth="2" />
                {node.label && (
                  <text x={node.x + radius + 4} y={node.y + 4} fontSize="10" fill="#333">
                    {node.label}
                  </text>
                )}
                {isSelected && (
                  <circle cx={node.x} cy={node.y} r={radius + 4} fill="none" stroke="#ff0000" strokeWidth="2" strokeDasharray="4,2" />
                )}
              </g>
            );
          })}
          {/* Show edge drawing source */}
          {edgeSource && (
            <circle cx={edgeSource.x} cy={edgeSource.y} r={10} fill="none" stroke="#00ff00" strokeWidth="3" />
          )}
        </svg>
      </div>
    );
  };

  if (loading && !currentFloor) {
    return <LoadingSpinner />;
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="bg-white shadow-md px-4 py-2 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/admin')}
            className="text-gray-600 hover:text-gray-800"
          >
            ← Dashboard
          </button>
          <h1 className="text-xl font-semibold">
            {buildings.find(b => b._id === buildingId)?.name || 'Building'} - Floor {floorNumber}
          </h1>
          <FloorSelector
            buildingId={buildingId}
            currentFloor={parseInt(floorNumber)}
            onFloorChange={handleFloorChange}
          />
        </div>
        <div className="flex items-center space-x-2">
          <NodeToolbar
            toolMode={toolMode}
            onToolChange={setToolMode}
            onAutoLink={handleAutoLinkStaircases}
            onOpenStaircaseManager={() => setShowStaircaseManager(true)}
          />
          <button
            onClick={() => {
              // Save/export node/edge data
              console.log('Nodes:', localNodes);
              console.log('Edges:', localEdges);
              alert('Data saved to server automatically.');
            }}
            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Save
          </button>
        </div>
      </header>

      {/* Error display */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 flex justify-between">
          <span>{error}</span>
          <button onClick={clearError} className="text-red-700 font-bold">×</button>
        </div>
      )}

      {/* Main editor area */}
      <div className="flex-1 overflow-auto bg-gray-100 p-4">
        {svgData ? (
          renderSvg()
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-gray-500">No SVG uploaded for this floor.</p>
              <button
                onClick={() => navigate(`/admin?upload=${buildingId}`)}
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Upload SVG
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Node details panel */}
      {selectedNode && (
        <div className="bg-white border-t p-4 flex justify-between items-center">
          <div>
            <strong>{selectedNode.label}</strong> ({selectedNode.type})
            <span className="ml-4 text-sm text-gray-500">
              x: {selectedNode.x.toFixed(1)}, y: {selectedNode.y.toFixed(1)}
            </span>
            {selectedNode.staircaseId && (
              <span className="ml-4 text-sm text-orange-600">🔗 Staircase linked</span>
            )}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => {
                const newLabel = prompt('Enter new label:', selectedNode.label);
                if (newLabel !== null) {
                  handleUpdateNode(selectedNode._id, { label: newLabel });
                }
              }}
              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Edit
            </button>
            <button
              onClick={() => handleDeleteNode(selectedNode)}
              className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Delete
            </button>
            <button
              onClick={() => setSelectedNode(null)}
              className="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Staircase Manager modal */}
      {showStaircaseManager && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-screen overflow-auto">
            <StaircaseManager
              buildingId={buildingId}
              onClose={() => setShowStaircaseManager(false)}
              onRefresh={async () => {
                await loadFloorData(buildingId, parseInt(floorNumber));
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MapEditor;