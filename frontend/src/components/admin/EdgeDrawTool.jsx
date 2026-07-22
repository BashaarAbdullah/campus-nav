// frontend/src/components/admin/EdgeDrawTool.jsx
// Helper component that provides visual feedback and controls for drawing edges between nodes

import React, { useState, useEffect } from 'react';

const EdgeDrawTool = ({
  isActive,
  sourceNode,
  targetNode,
  onEdgeComplete,
  onCancel,
  nodes,
}) => {
  const [hoveredNode, setHoveredNode] = useState(null);

  // If not active, don't render anything
  if (!isActive) return null;

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white shadow-lg rounded-lg p-4 border border-gray-200 z-50 min-w-[300px]">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-medium text-sm">Drawing Edge</span>
          <div className="text-xs text-gray-500 mt-1">
            {sourceNode ? (
              <>
                Source: <strong>{sourceNode.label || sourceNode._id}</strong>
                {targetNode ? ` → Target: ${targetNode.label || targetNode._id}` : ' — Click target node'}
              </>
            ) : (
              'Click a source node'
            )}
          </div>
        </div>
        <button
          onClick={onCancel}
          className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
        >
          Cancel
        </button>
      </div>
      {sourceNode && targetNode && (
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => onEdgeComplete(sourceNode, targetNode)}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
          >
            Confirm Edge
          </button>
          <button
            onClick={() => {
              // Reset source, keep target? We'll reset both
              onCancel();
            }}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
          >
            Reset
          </button>
        </div>
      )}
      <div className="text-xs text-gray-400 mt-2">
        Tip: Click a node to select as source, then click another node to set as target.
      </div>
    </div>
  );
};

export default EdgeDrawTool;