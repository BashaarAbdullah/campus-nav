// frontend/src/components/user/CampusMap.jsx
// End-user view – renders the master campus SVG with clickable building regions for navigation

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMapData } from '../../hooks/useMapData';
import { extractShapes, findBuildingRegions, getShapeBoundingBox } from '../../services/svgUtils';
import LoadingSpinner from '../common/LoadingSpinner';
import api from '../../services/api';

const CampusMap = () => {
  const navigate = useNavigate();
  const { buildings, fetchBuildings, loading } = useMapData();
  const [masterSvg, setMasterSvg] = useState(null);
  const [shapes, setShapes] = useState([]);
  const [buildingRegions, setBuildingRegions] = useState([]);
  const [hoveredRegion, setHoveredRegion] = useState(null);
  const [error, setError] = useState(null);
  const svgContainerRef = useRef(null);

  // Fetch buildings and master SVG
  useEffect(() => {
    fetchBuildings();
    fetchMasterSvg();
  }, []);

  const fetchMasterSvg = async () => {
    try {
      const response = await api.get('/master-svg'); // We'll need to add this endpoint
      // For now, we'll use a mock or check if there's a master SVG in the system
      // If not, we'll show a message
      const data = response.data?.data;
      if (data) {
        setMasterSvg(data);
        // Parse shapes
        const parsedShapes = extractShapes(data.svgData);
        setShapes(parsedShapes);
        // Find building regions (by id pattern or linked regions)
        const regions = data.regions || [];
        const linkedRegions = parsedShapes.filter(shape => {
          const regionId = shape.id || shape.attributes?.id;
          return regions.some(r => r.regionId === regionId);
        });
        setBuildingRegions(linkedRegions);
      }
    } catch (err) {
      // If no master SVG exists, that's okay for now
      console.log('No master SVG found:', err.message);
    }
  };

  const handleShapeClick = (shape, e) => {
    e.stopPropagation();
    // Find which building is linked to this region
    const regionId = shape.id || shape.attributes?.id;
    if (!regionId) return;
    const region = masterSvg?.regions?.find(r => r.regionId === regionId);
    if (region?.buildingId) {
      navigate(`/building/${region.buildingId}`);
    } else {
      // Try to find building by name match
      const building = buildings.find(b => 
        shape.id?.toLowerCase().includes(b.code.toLowerCase()) ||
        shape.attributes?.id?.toLowerCase().includes(b.code.toLowerCase())
      );
      if (building) {
        navigate(`/building/${building._id}`);
      } else {
        setError('No building linked to this region');
      }
    }
  };

  const handleShapeMouseEnter = (shape) => {
    setHoveredRegion(shape);
  };

  const handleShapeMouseLeave = () => {
    setHoveredRegion(null);
  };

  // Render SVG with interactive overlays
  const renderInteractiveSvg = () => {
    if (!masterSvg?.svgData) {
      return (
        <div className="text-center py-12">
          <p className="text-gray-500">No campus map available.</p>
          <p className="text-sm text-gray-400 mt-2">Please check back later.</p>
        </div>
      );
    }

    // We'll render the SVG and overlay transparent clickable regions
    return (
      <div
        ref={svgContainerRef}
        className="relative w-full max-w-4xl mx-auto"
        style={{ minHeight: '400px' }}
      >
        <div className="w-full h-full">
          <div dangerouslySetInnerHTML={{ __html: masterSvg.svgData }} />
        </div>
        {/* Overlay for clickable regions */}
        <div className="absolute inset-0 pointer-events-none">
          {buildingRegions.map((shape, idx) => {
            const bbox = getShapeBoundingBox(shape);
            if (!bbox) return null;
            const isHovered = hoveredRegion === shape;
            return (
              <div
                key={shape.id || idx}
                className="absolute cursor-pointer pointer-events-auto transition-opacity"
                style={{
                  left: bbox.x,
                  top: bbox.y,
                  width: bbox.width,
                  height: bbox.height,
                  backgroundColor: isHovered ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.05)',
                  border: isHovered ? '2px solid #3b82f6' : '1px solid transparent',
                  borderRadius: '4px',
                }}
                onClick={(e) => handleShapeClick(shape, e)}
                onMouseEnter={() => handleShapeMouseEnter(shape)}
                onMouseLeave={handleShapeMouseLeave}
                title={`Click to enter ${shape.id || 'building'}`}
              />
            );
          })}
        </div>
        {hoveredRegion && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white shadow-lg rounded-lg px-4 py-2 text-sm pointer-events-none">
            Click to enter {hoveredRegion.id || hoveredRegion.attributes?.id || 'building'}
          </div>
        )}
      </div>
    );
  };

  if (loading && !buildings.length) {
    return <LoadingSpinner fullScreen text="Loading campus map..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">🏫 Campus Navigator</h1>
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
              Admin Login
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Campus Overview</h2>
          <p className="text-gray-600 mb-6">Click on any building to explore its floors and rooms.</p>
          {renderInteractiveSvg()}
        </div>

        {/* Quick building links */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {buildings.map(building => (
            <button
              key={building._id}
              onClick={() => navigate(`/building/${building._id}`)}
              className="p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition text-center border hover:border-blue-500"
            >
              <div className="text-2xl mb-2">🏛️</div>
              <div className="font-semibold">{building.name}</div>
              <div className="text-sm text-gray-500">{building.code}</div>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
};

export default CampusMap;