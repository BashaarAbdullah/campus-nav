// backend/src/utils/helpers.js
// Miscellaneous utility functions used across the application

/**
 * Calculate Euclidean distance between two points.
 * @param {Object} a - Point with x, y coordinates
 * @param {Object} b - Point with x, y coordinates
 * @returns {number} Distance
 */
function distance(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

/**
 * Generate a unique ID (simple timestamp-based).
 * @returns {string} Unique ID
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

/**
 * Check if two nodes are approximately equal (within tolerance).
 * @param {Object} a - Node with x, y
 * @param {Object} b - Node with x, y
 * @param {number} tolerance - Allowed difference
 * @returns {boolean}
 */
function nodesApproxEqual(a, b, tolerance = 1) {
  return distance(a, b) <= tolerance;
}

/**
 * Deep clone an object using JSON methods (works for plain objects).
 * @param {Object} obj - Object to clone
 * @returns {Object} Cloned object
 */
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Sanitize a string for safe use (e.g., as a filename or label).
 * Removes characters that are not alphanumeric, space, dash, underscore.
 */
function sanitizeString(str) {
  return str.replace(/[^a-zA-Z0-9\s\-_]/g, '').trim();
}

/**
 * Parse a building code from a filename (e.g., "BuildingA-Floor1.svg" → "A").
 * Expects pattern like "BuildingX" or "Building-X".
 * @param {string} filename - Original filename
 * @returns {string|null} Building code or null if not found
 */
function parseBuildingCodeFromFilename(filename) {
  const match = filename.match(/Building[-\s]?([A-Z])/i);
  if (match) return match[1].toUpperCase();
  // Also try just a single letter at start
  const match2 = filename.match(/^([A-Z])\b/);
  if (match2) return match2[1].toUpperCase();
  return null;
}

/**
 * Parse floor number from a filename (e.g., "Floor1" → 1).
 * @param {string} filename - Original filename
 * @returns {number|null} Floor number or null
 */
function parseFloorFromFilename(filename) {
  const match = filename.match(/Floor[_\s]?(\d+)/i);
  if (match) return parseInt(match[1], 10);
  return null;
}

/**
 * Get the base name of a file without extension.
 */
function getBaseName(filename) {
  return filename.split('.')[0] || filename;
}

/**
 * Sleep for a given number of milliseconds (async).
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Validate if a string is a valid ObjectId (MongoDB).
 * @param {string} id - ID to validate
 * @returns {boolean}
 */
function isValidObjectId(id) {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

/**
 * Convert an array to a map keyed by a property.
 * @param {Array} arr - Array of objects
 * @param {string} key - Property name to use as key
 * @returns {Map}
 */
function arrayToMap(arr, key = '_id') {
  const map = new Map();
  arr.forEach(item => map.set(item[key]?.toString() || item[key], item));
  return map;
}

/**
 * Ensure a value is within a range.
 */
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

module.exports = {
  distance,
  generateId,
  nodesApproxEqual,
  deepClone,
  sanitizeString,
  parseBuildingCodeFromFilename,
  parseFloorFromFilename,
  getBaseName,
  sleep,
  isValidObjectId,
  arrayToMap,
  clamp,
};