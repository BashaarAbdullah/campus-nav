// backend/src/services/svgParser.js
// Utility to parse uploaded SVG files, extract elements, bounding boxes, and region data

const { parseString } = require('xml2js');
const { promisify } = require('util');
const parseXml = promisify(parseString);

/**
 * Parse an SVG string and extract basic metadata and region shapes.
 * @param {string} svgString - Raw SVG content
 * @returns {Promise<Object>} { metadata, elements, shapes }
 */
async function parseSvg(svgString) {
  try {
    const result = await parseXml(svgString, { explicitArray: false, mergeAttrs: true });
    const svg = result.svg;

    // Extract viewBox or width/height
    const viewBox = svg.viewBox || '';
    const width = svg.width ? parseFloat(svg.width) : null;
    const height = svg.height ? parseFloat(svg.height) : null;

    // Collect all shape elements (rect, path, circle, polygon, etc.)
    const shapes = extractShapes(svg);

    return {
      metadata: {
        viewBox,
        width,
        height,
      },
      elements: svg,
      shapes,
    };
  } catch (error) {
    throw new Error(`Failed to parse SVG: ${error.message}`);
  }
}

/**
 * Recursively extract shape elements from SVG object.
 */
function extractShapes(obj, path = []) {
  const shapes = [];
  if (!obj || typeof obj !== 'object') return shapes;

  // Look for common shape keys
  const shapeKeys = ['rect', 'path', 'circle', 'ellipse', 'polygon', 'polyline', 'line'];
  for (const key of shapeKeys) {
    if (obj[key]) {
      let items = obj[key];
      if (!Array.isArray(items)) items = [items];
      for (const item of items) {
        shapes.push({
          type: key,
          id: item.id || item['$']?.id || null,
          attributes: item.$ || {},
          // For path, we might store the d attribute
          d: item.d || null,
          // For rect: x, y, width, height
          x: parseFloat(item.x) || null,
          y: parseFloat(item.y) || null,
          width: parseFloat(item.width) || null,
          height: parseFloat(item.height) || null,
          // For circle: cx, cy, r
          cx: parseFloat(item.cx) || null,
          cy: parseFloat(item.cy) || null,
          r: parseFloat(item.r) || null,
          // For polygon: points
          points: item.points || null,
          // Original raw object for reference
          raw: item,
        });
      }
    }
  }

  // Recursively check child elements (e.g., within <g> groups)
  if (obj.g) {
    let groups = obj.g;
    if (!Array.isArray(groups)) groups = [groups];
    for (const group of groups) {
      const children = extractShapes(group, [...path, 'g']);
      shapes.push(...children);
    }
  }

  return shapes;
}

/**
 * Get bounding box of a shape element.
 * @param {Object} shape - Shape object from extractShapes
 * @returns {Object|null} { x, y, width, height } or null if not possible
 */
function getShapeBoundingBox(shape) {
  if (shape.type === 'rect' && shape.x !== null && shape.y !== null && shape.width !== null && shape.height !== null) {
    return { x: shape.x, y: shape.y, width: shape.width, height: shape.height };
  }
  if (shape.type === 'circle' && shape.cx !== null && shape.cy !== null && shape.r !== null) {
    return { x: shape.cx - shape.r, y: shape.cy - shape.r, width: shape.r * 2, height: shape.r * 2 };
  }
  if (shape.type === 'ellipse' && shape.cx !== null && shape.cy !== null && shape.rx && shape.ry) {
    return { x: shape.cx - shape.rx, y: shape.cy - shape.ry, width: shape.rx * 2, height: shape.ry * 2 };
  }
  // For path/polygon, we could compute approximate bounding box, but we'll skip for now
  return null;
}

/**
 * Find shapes with a given ID or attribute.
 */
function findShapesByAttribute(shapes, attr, value) {
  return shapes.filter(s => s.attributes[attr] === value || s.id === value);
}

/**
 * Extract all shapes that could represent building regions (for master SVG linking).
 * Typically these are rect or path elements with specific IDs.
 */
function findBuildingRegions(shapes, buildingIdPattern = /^building/i) {
  return shapes.filter(s => {
    const id = s.id || s.attributes.id || '';
    return buildingIdPattern.test(id);
  });
}

/**
 * Get the SVG string with a highlighted path overlay (for frontend use).
 * @param {string} svgString - Original floor SVG
 * @param {Array} pathNodes - Array of node objects with x,y coordinates
 * @param {string} highlightColor - Color for the path overlay
 * @returns {string} Modified SVG string with path added
 */
function addPathOverlay(svgString, pathNodes, highlightColor = '#ff0000') {
  if (!pathNodes || pathNodes.length < 2) return svgString;

  // Build a polyline points string
  const points = pathNodes.map(n => `${n.x},${n.y}`).join(' ');
  const polyline = `<polyline points="${points}" fill="none" stroke="${highlightColor}" stroke-width="4" stroke-opacity="0.8" />`;

  // Also add markers at start and end
  const first = pathNodes[0];
  const last = pathNodes[pathNodes.length - 1];
  const markers = `
    <circle cx="${first.x}" cy="${first.y}" r="6" fill="green" stroke="white" stroke-width="2" />
    <circle cx="${last.x}" cy="${last.y}" r="6" fill="red" stroke="white" stroke-width="2" />
  `;

  // Insert into SVG: find <svg> tag and append before closing
  const insertIndex = svgString.lastIndexOf('</svg>');
  if (insertIndex === -1) return svgString;
  const modified = svgString.slice(0, insertIndex) + polyline + markers + svgString.slice(insertIndex);
  return modified;
}

module.exports = {
  parseSvg,
  extractShapes,
  getShapeBoundingBox,
  findShapesByAttribute,
  findBuildingRegions,
  addPathOverlay,
};