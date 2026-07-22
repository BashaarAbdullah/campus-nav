// frontend/src/components/admin/FloorSelector.jsx
// Dropdown selector for switching between floors of a building in the editor

import React, { useState, useEffect } from 'react';
import { useMapData } from '../../hooks/useMapData';

const FloorSelector = ({ buildingId, currentFloor, onFloorChange }) => {
  const { floors, fetchFloors, loading } = useMapData();
  const [availableFloors, setAvailableFloors] = useState([]);

  useEffect(() => {
    if (buildingId) {
      fetchFloors(buildingId);
    }
  }, [buildingId]);

  useEffect(() => {
    if (floors[buildingId]) {
      setAvailableFloors(floors[buildingId]);
    }
  }, [floors, buildingId]);

  // Generate floor options from available floors, plus ability to add new floors
  const floorOptions = availableFloors.map(f => f.floorNumber);
  // If currentFloor is not in the list, add it as an option
  if (currentFloor && !floorOptions.includes(currentFloor)) {
    floorOptions.push(currentFloor);
  }
  floorOptions.sort((a, b) => a - b);

  const handleChange = (e) => {
    const newFloor = parseInt(e.target.value, 10);
    if (onFloorChange) {
      onFloorChange(newFloor);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <label htmlFor="floor-select" className="text-sm font-medium text-gray-700">
        Floor:
      </label>
      <select
        id="floor-select"
        value={currentFloor || ''}
        onChange={handleChange}
        className="px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
        disabled={loading}
      >
        {floorOptions.length === 0 ? (
          <option value="">No floors available</option>
        ) : (
          floorOptions.map(f => (
            <option key={f} value={f}>
              Floor {f}
            </option>
          ))
        )}
        {/* Option to create new floor */}
        <option value="__new__">+ New Floor</option>
      </select>
      {loading && <span className="text-sm text-gray-400">Loading...</span>}
    </div>
  );
};

export default FloorSelector;