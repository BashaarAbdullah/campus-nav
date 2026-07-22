// frontend/src/services/svgUtils.js
// Utility functions for parsing and manipulating SVG strings in the browser

/**
 * Parse an SVG string and extract basic metadata (viewBox, width, height).
 * @param {string} svgString - Raw SVG content
 * @returns {Object} { viewBox, width, height, isValid }
 */
export function parseSvgMetadata(svgString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');
  const svgElement = doc.querySelector('svg');
  if (!svgElement) {
    return { isValid: false, error: 'No SVG element found' };
  }

  const viewBox = svgElement.getAttribute('viewBox') || '';
  const width = svgElement.getAttribute('width') || null;
  const height = svgElement.getAttribute('height') || null;

  return {
    isValid: true,
    viewBox,
    width: width ? parseFloat(width) : null,
    height: height ? parseFloat(height) : null,
    svgElement,
  };
}

/**
 * Get all shape elements (rect, path, circle, polygon, etc.) from an SVG string.
 * @param {string} svgString - Raw SVG content
 * @returns {Array} Array of shape objects with type, id, attributes, and bounding box info
 */
export function extractShapes(svgString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');
  const svg = doc.querySelector('svg');
  if (!svg) return [];

  const shapes = [];
  const shapeTags = ['rect', 'path', 'circle', 'ellipse', 'polygon', 'polyline', 'line'];

  // Recursive function to traverse all children
  function traverse(element) {
    if (shapeTags.includes(element.tagName)) {
      const shape = {
        type: element.tagName,
        id: element.getAttribute('id') || undefined,
        attributes: {},
        boundingBox: null,
      };
      // Copy all attributes
      for (const attr of element.attributes) {
        shape.attributes[attr.name] = attr.value;
      }
      // Extract position/size info
      if (element.tagName === 'rect') {
        const x = parseFloat(element.getAttribute('x')) || 0;
        const y = parseFloat(element.getAttribute('y')) || 0;
        const w = parseFloat(element.getAttribute('width')) || 0;
        const h = parseFloat(element.getAttribute('height')) || 0;
        shape.boundingBox = { x, y, width: w, height: h };
        shape.x = x;
        shape.y = y;
        shape.width = w;
        shape.height = h;
      } else if (element.tagName === 'circle') {
        const cx = parseFloat(element.getAttribute('cx')) || 0;
        const cy = parseFloat(element.getAttribute('cy')) || 0;
        const r = parseFloat(element.getAttribute('r')) || 0;
        shape.boundingBox = { x: cx - r, y: cy - r, width: r * 2, height: r * 2 };
        shape.cx = cx;
        shape.cy = cy;
        shape.r = r;
      } else if (element.tagName === 'path') {
        // For paths, we can't easily compute bounding box without complex parsing,
        // but we can store the d attribute.
        shape.d = element.getAttribute('d') || '';
        // We'll approximate bounding box later if needed
      } else if (element.tagName === 'polygon' || element.tagName === 'polyline') {
        shape.points = element.getAttribute('points') || '';
        // Could compute bounding box from points
      }
      shapes.push(shape);
    }
    // Traverse children
    for (const child of element.children) {
      traverse(child);
    }
  }

  traverse(svg);
  return shapes;
}

/**
 * Find shapes with a specific attribute value (e.g., id="building-a").
 */
export function findShapesByAttribute(shapes, attr, value) {
  return shapes.filter(s => s.attributes[attr] === value || s.id === value);
}

/**
 * Find shapes that are likely building regions (based on id pattern).
 */
export function findBuildingRegions(shapes, pattern = /^building/i) {
  return shapes.filter(s => {
    const id = s.id || s.attributes.id || '';
    return pattern.test(id);
  });
}

/**
 * Get bounding box of a shape in SVG coordinates.
 * For complex shapes (path, polygon), this returns a conservative estimate.
 */
export function getShapeBoundingBox(shape) {
  if (shape.boundingBox) return shape.boundingBox;
  // Try to compute from points for polygon/polyline
  if (shape.type === 'polygon' || shape.type === 'polyline') {
    if (shape.points) {
      const pts = shape.points.trim().split(/[\s,]+/).map(Number);
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (let i = 0; i < pts.length; i += 2) {
        const x = pts[i];
        const y = pts[i+1];
        if (!isNaN(x) && !isNaN(y)) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
      if (isFinite(minX)) {
        return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
      }
    }
  }
  // For path, we could use getBBox() but we need DOM element.
  return null;
}

/**
 * Add a path overlay (polyline and markers) to an SVG string.
 * @param {string} svgString - Original SVG
 * @param {Array} pathNodes - Array of {x, y} points
 * @param {Object} options - { highlightColor, strokeWidth, startColor, endColor }
 * @returns {string} Modified SVG string
 */
export function addPathOverlay(svgString, pathNodes, options = {}) {
  if (!pathNodes || pathNodes.length < 2) return svgString;

  const {
    highlightColor = '#ff0000',
    strokeWidth = 4,
    startColor = '#00ff00',
    endColor = '#ff0000',
  } = options;

  const points = pathNodes.map(n => `${n.x},${n.y}`).join(' ');
  const polyline = `<polyline points="${points}" fill="none" stroke="${highlightColor}" stroke-width="${strokeWidth}" stroke-opacity="0.8" />`;

  const first = pathNodes[0];
  const last = pathNodes[pathNodes.length - 1];
  const markers = `
    <circle cx="${first.x}" cy="${first.y}" r="6" fill="${startColor}" stroke="white" stroke-width="2" />
    <circle cx="${last.x}" cy="${last.y}" r="6" fill="${endColor}" stroke="white" stroke-width="2" />
  `;

  // Insert before closing </svg>
  const closingIndex = svgString.lastIndexOf('</svg>');
  if (closingIndex === -1) return svgString;
  return svgString.slice(0, closingIndex) + polyline + markers + svgString.slice(closingIndex);
}

/**
 * Clear all path overlays from an SVG (remove any added polyline/markers).
 * This is simple: we assume our added elements have specific classes or IDs.
 * We'll just remove any polyline and circle elements that are direct children of SVG.
 * For safety, we can use a more robust approach with DOMParser.
 */
export function clearPathOverlays(svgString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');
  const svg = doc.querySelector('svg');
  if (!svg) return svgString;

  // Remove any polyline elements (our path)
  const polylines = svg.querySelectorAll('polyline');
  polylines.forEach(el => el.remove());
  // Remove any circle elements that might be markers (we'll rely on attributes)
  // But we might remove other circles, so be careful.
  // We can remove circles that have specific attributes (e.g., fill="green" or "red" with stroke="white").
  const circles = svg.querySelectorAll('circle[stroke="white"]');
  circles.forEach(el => {
    const fill = el.getAttribute('fill');
    if (fill === '#00ff00' || fill === '#ff0000' || fill === 'green' || fill === 'red') {
      el.remove();
    }
  });

  return new XMLSerializer().serializeToString(svg);
}

/**
 * Convert SVG string to data URL for embedding in img tags.
 */
export function svgToDataUrl(svgString) {
  const encoded = encodeURIComponent(svgString);
  return `data:image/svg+xml;charset=utf-8,${encoded}`;
}

/**
 * Get the SVG viewBox dimensions as { minX, minY, width, height }.
 */
export function getViewBoxDimensions(svgString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');
  const svg = doc.querySelector('svg');
  if (!svg) return null;
  const viewBox = svg.getAttribute('viewBox');
  if (viewBox) {
    const parts = viewBox.trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4) {
      return { minX: parts[0], minY: parts[1], width: parts[2], height: parts[3] };
    }
  }
  // Fallback to width/height
  const w = parseFloat(svg.getAttribute('width')) || 0;
  const h = parseFloat(svg.getAttribute('height')) || 0;
  return { minX: 0, minY: 0, width: w, height: h };
}