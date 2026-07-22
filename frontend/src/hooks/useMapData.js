// frontend/src/hooks/useMapData.js
// Custom hook to access map data state and methods from MapContext

import { useContext } from 'react';
import { MapContext } from '../contexts/MapContext';

export const useMapData = () => {
  const context = useContext(MapContext);
  if (!context) {
    throw new Error('useMapData must be used within a MapProvider');
  }
  return context;
};