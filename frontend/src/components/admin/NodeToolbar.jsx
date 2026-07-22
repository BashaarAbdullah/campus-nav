// frontend/src/components/admin/NodeToolbar.jsx
// Toolbar for selecting node placement mode, drawing edges, and managing staircases

import React from 'react';

const NodeToolbar = ({
  toolMode,
  onToolChange,
  onAutoLink,
  onOpenStaircaseManager,
}) => {
  const tools = [
    { id: 'select', label: 'Select', icon: '🖱️' },
    { id: 'place-room', label: 'Place Room', icon: '🚪' },
    { id: 'place-staircase', label: 'Place Staircase', icon: '🪜' },
    { id: 'place-junction', label: 'Place Junction', icon: '🔗' },
    { id: 'draw-edge', label: 'Draw Edge', icon: '✏️' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1 bg-gray-100 rounded-lg p-1">
      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => onToolChange(tool.id)}
          className={`px-3 py-1.5 rounded text-sm transition-colors flex items-center gap-1 ${
            toolMode === tool.id
              ? 'bg-blue-600 text-white'
              : 'bg-transparent hover:bg-gray-200 text-gray-700'
          }`}
        >
          <span>{tool.icon}</span>
          <span className="hidden sm:inline">{tool.label}</span>
        </button>
      ))}
      <div className="w-px h-6 bg-gray-300 mx-1" />
      <button
        onClick={onAutoLink}
        className="px-3 py-1.5 bg-orange-500 text-white rounded text-sm hover:bg-orange-600 transition-colors"
        title="Auto-link staircases across floors"
      >
        🔄 Auto-Link
      </button>
      <button
        onClick={onOpenStaircaseManager}
        className="px-3 py-1.5 bg-purple-500 text-white rounded text-sm hover:bg-purple-600 transition-colors"
        title="Manage staircases"
      >
        📋 Stairs
      </button>
    </div>
  );
};

export default NodeToolbar;