// frontend/src/components/common/SVGCanvas.jsx
// Wrapper component that renders an SVG string inside a container with optional overlays and interactivity

import React, { useRef, useEffect, useState } from 'react';

const SVGCanvas = ({
  svgString,
  className = '',
  style = {},
  onClick,
  onMouseMove,
  onMouseLeave,
  overlay = null, // React node to render on top of SVG
  preserveAspectRatio = 'xMidYMid meet',
  fitToContainer = true,
}) => {
  const containerRef = useRef(null);
  const [svgElement, setSvgElement] = useState(null);

  useEffect(() => {
    if (!containerRef.current || !svgString) return;
    // Clear previous content
    containerRef.current.innerHTML = '';
    // Parse and inject SVG
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');
    const svg = doc.documentElement;
    if (svg) {
      // Set attributes for responsive sizing
      if (fitToContainer) {
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.removeAttribute('style');
      }
      containerRef.current.appendChild(svg);
      setSvgElement(svg);
    }
  }, [svgString, fitToContainer]);

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      style={{ ...style, width: '100%', height: '100%' }}
      onClick={onClick}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      {overlay && (
        <div className="absolute inset-0 pointer-events-none">
          {overlay}
        </div>
      )}
    </div>
  );
};

export default SVGCanvas;