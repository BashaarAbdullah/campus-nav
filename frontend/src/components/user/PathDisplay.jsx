// frontend/src/components/user/PathDisplay.jsx
// Renders the highlighted path on an SVG map – overlays polyline and markers for start/end

import React, { useRef, useEffect } from 'react';
import { addPathOverlay } from '../../services/svgUtils';

const PathDisplay = ({ nodes, svgString, className = '', highlightColor = '#ff0000' }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !nodes || nodes.length < 2) return;

    // If we have an SVG string, overlay the path on it
    if (svgString) {
      const modifiedSvg = addPathOverlay(svgString, nodes, { highlightColor });
      containerRef.current.innerHTML = modifiedSvg;
    } else {
      // If no SVG, just render a simple polyline
      const points = nodes.map(n => `${n.x},${n.y}`).join(' ');
      containerRef.current.innerHTML = `
        <svg viewBox="0 0 1000 800" style="width:100%;height:100%;min-height:300px;background:#f9f9f9;">
          <polyline points="${points}" fill="none" stroke="${highlightColor}" stroke-width="4" stroke-opacity="0.8" />
          <circle cx="${nodes[0].x}" cy="${nodes[0].y}" r="6" fill="green" stroke="white" stroke-width="2" />
          <circle cx="${nodes[nodes.length-1].x}" cy="${nodes[nodes.length-1].y}" r="6" fill="red" stroke="white" stroke-width="2" />
          ${nodes.map((n, i) => `
            <circle cx="${n.x}" cy="${n.y}" r="2" fill="#333" />
            ${n.label ? `<text x="${n.x + 6}" y="${n.y + 4}" font-size="8" fill="#333">${n.label}</text>` : ''}
          `).join('')}
        </svg>
      `;
    }
  }, [nodes, svgString, highlightColor]);

  return (
    <div
      ref={containerRef}
      className={`w-full overflow-auto ${className}`}
      style={{ minHeight: '200px' }}
    />
  );
};

export default PathDisplay;