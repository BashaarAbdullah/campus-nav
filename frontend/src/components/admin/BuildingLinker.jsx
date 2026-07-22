// frontend/src/components/admin/BuildingLinker.jsx
// Allows admin to select a building and click on a region of the master SVG to link them

import React, { useState, useRef, useEffect } from 'react';
import { extractShapes, getShapeBoundingBox, findBuildingRegions } from '../../services/svgUtils';
import api from '../../services/api';

const BuildingLinker = ({ masterSvg, buildings, onLinkComplete }) => {
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [linkedRegions, setLinkedRegions] = useState([]);
  const [svgShapes, setSvgShapes] = useState([]);
  const [hoveredRegion, setHoveredRegion] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const svgContainerRef = useRef(null);

  // Parse SVG shapes on mount or when masterSvg changes
  useEffect(() => {
    if (masterSvg?.svgData) {
      const shapes = extractShapes(masterSvg.svgData);
      // Filter to likely building regions (rect, path, polygon with id or specific attributes)
      const buildingShapes = shapes.filter(s => 
        s.id?.toLowerCase().includes('building') || 
        s.attributes?.id?.toLowerCase().includes('building') ||
        s.attributes?.class?.toLowerCase().includes('building')
      );
      setSvgShapes(buildingShapes.length > 0 ? buildingShapes : shapes);
      
      // Also load any existing links from masterSvg.regions
      if (masterSvg.regions) {
        setLinkedRegions(masterSvg.regions);
      }
    }
  }, [masterSvg]);

  const handleRegionClick = (shape, e) => {
    if (!selectedBuilding) {
      setMessage('Please select a building first.');
      return;
    }
    const bbox = getShapeBoundingBox(shape);
    const regionId = shape.id || shape.attributes?.id || `region-${Date.now()}`;
    setSelectedRegion({ shape, bbox, regionId });
    setMessage(`Selected region: ${regionId}`);
  };

  const handleConfirmLink = async () => {
    if (!selectedBuilding || !selectedRegion) {
      setMessage('Please select both a building and a region.');
      return;
    }
    setIsLoading(true);
    try {
      const response = await api.post(`/buildings/${selectedBuilding._id}/link-master`, {
        masterSvgId: masterSvg._id,
        regionId: selectedRegion.regionId,
        boundingBox: selectedRegion.bbox,
        metadata: {
          shapeType: selectedRegion.shape.type,
          attributes: selectedRegion.shape.attributes,
        },
      });
      setMessage(`Successfully linked ${selectedBuilding.name} to region!`);
      setLinkedRegions(prev => [...prev, {
        regionId: selectedRegion.regionId,
        buildingId: selectedBuilding._id,
        boundingBox: selectedRegion.bbox,
      }]);
      setSelectedRegion(null);
      if (onLinkComplete) onLinkComplete(response.data);
    } catch (err) {
      setMessage(`Error: ${err.response?.data?.message || err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelLink = () => {
    setSelectedRegion(null);
    setMessage(null);
  };

  const getBuildingName = (buildingId) => {
    const b = buildings.find(b => b._id === buildingId);
    return b ? b.name : 'Unknown';
  };

  // Render SVG with clickable overlays
  const renderSvgWithInteractivity = () => {
    if (!masterSvg?.svgData) return <p>No master SVG loaded.</p>;

    // We'll inject a transparent overlay on each shape
    // But we can't directly modify the SVG string easily without a real DOM.
    // Instead, we'll render the SVG inside a container and use pointer events.
    // For simplicity, we'll render the SVG as-is and use a separate transparent overlay.
    // A more robust approach would use SVG elements with click handlers.

    return (
      <div
        ref={svgContainerRef}
        className="relative cursor-pointer"
        style={{ maxHeight: '500px', overflow: 'auto' }}
        onClick={(e) => {
          // We'll rely on shape detection via coordinates, but this is complex.
          // For now, we'll prompt admin to enter region ID manually.
          const regionId = prompt('Enter the region ID (or element ID) from the SVG:');
          if (regionId) {
            const shape = svgShapes.find(s => (s.id || s.attributes?.id) === regionId);
            if (shape) {
              handleRegionClick(shape, e);
            } else {
              setMessage(`No shape found with ID: ${regionId}`);
            }
          }
        }}
      >
        <div dangerouslySetInnerHTML={{ __html: masterSvg.svgData }} />
        <div className="absolute inset-0 pointer-events-none">
          {/* We could overlay highlighting for linked regions here */}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Link Building to Master SVG Regions</h3>
      <p className="text-sm text-gray-600 mb-4">
        Select a building, then click on a region in the SVG to link them.
        {!svgShapes.length && <span className="text-red-500"> No building-shaped regions detected. You can still link by region ID.</span>}
      </p>

      {/* Building selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Select Building:</label>
        <select
          className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={selectedBuilding?._id || ''}
          onChange={(e) => {
            const b = buildings.find(b => b._id === e.target.value);
            setSelectedBuilding(b || null);
            setMessage(null);
          }}
        >
          <option value="">-- Choose a building --</option>
          {buildings.map(b => (
            <option key={b._id} value={b._id}>{b.name} ({b.code})</option>
          ))}
        </select>
      </div>

      {/* SVG display */}
      <div className="border rounded overflow-hidden">
        {renderSvgWithInteractivity()}
      </div>

      {/* Selected region info */}
      {selectedRegion && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <p><strong>Selected Region:</strong> {selectedRegion.regionId}</p>
          <p className="text-xs text-gray-600">Type: {selectedRegion.shape.type}</p>
          <div className="flex gap-3 mt-2">
            <button
              onClick={handleConfirmLink}
              disabled={isLoading}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition disabled:opacity-50"
            >
              {isLoading ? 'Linking...' : 'Confirm Link'}
            </button>
            <button
              onClick={handleCancelLink}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Existing links */}
      {linkedRegions.length > 0 && (
        <div className="mt-4">
          <h4 className="font-medium text-sm text-gray-700 mb-2">Existing Links:</h4>
          <ul className="text-sm space-y-1">
            {linkedRegions.map((link, idx) => (
              <li key={idx} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                <span>Region: <code>{link.regionId}</code></span>
                <span>→ Building: {getBuildingName(link.buildingId)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Messages */}
      {message && (
        <div className={`mt-4 p-3 rounded ${message.startsWith('Success') ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
          {message}
        </div>
      )}
    </div>
  );
};

export default BuildingLinker;