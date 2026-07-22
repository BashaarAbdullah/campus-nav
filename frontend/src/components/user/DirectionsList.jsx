// frontend/src/components/user/DirectionsList.jsx
// Renders turn-by-turn directions from pathfinding result with step indicators and floor changes

import React, { useState } from 'react';

const DirectionsList = ({ steps, compact = false }) => {
  const [expanded, setExpanded] = useState(!compact);

  if (!steps || steps.length === 0) {
    return <p className="text-gray-500 text-sm">No directions available.</p>;
  }

  const toggleExpanded = () => setExpanded(!expanded);

  return (
    <div className="border rounded-lg overflow-hidden">
      <div 
        className="flex justify-between items-center px-4 py-2 bg-gray-50 cursor-pointer hover:bg-gray-100"
        onClick={toggleExpanded}
      >
        <h4 className="font-medium text-sm">Directions ({steps.length} steps)</h4>
        <span className="text-gray-400">{expanded ? '▼' : '▶'}</span>
      </div>
      {expanded && (
        <ol className="divide-y divide-gray-100">
          {steps.map((step, index) => {
            const isFloorChange = step.floorChange && step.floorChange.length > 0;
            return (
              <li key={index} className={`px-4 py-2.5 flex items-start gap-3 ${isFloorChange ? 'bg-orange-50' : ''}`}>
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold flex items-center justify-center">
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="font-medium text-sm">{step.from}</span>
                    <span className="text-gray-400 text-sm">→</span>
                    <span className="text-sm">{step.to}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-500">
                      {step.direction || 'Continue straight'}
                    </span>
                    {isFloorChange && (
                      <span className="text-xs bg-orange-200 text-orange-800 px-2 py-0.5 rounded-full">
                        🪜 {step.floorChange}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
};

export default DirectionsList;