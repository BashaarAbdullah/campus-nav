// backend/src/utils/constants.js
// Central constants used across the application

// Node types
const NODE_TYPES = {
  ROOM: 'room',
  STAIRCASE: 'staircase',
  JUNCTION: 'junction',
};

// Default tolerance for staircase matching (in SVG coordinate units)
const DEFAULT_STAIRCASE_TOLERANCE = 10;

// Default edge weight
const DEFAULT_EDGE_WEIGHT = 1.0;

// Path colors
const PATH_COLORS = {
  DEFAULT: '#ff0000',
  START: '#00ff00',
  END: '#ff0000',
  HIGHLIGHT: '#ff6600',
};

// SVG upload limits
const SVG_MAX_SIZE = 5 * 1024 * 1024; // 5MB
const SVG_ALLOWED_MIME_TYPES = ['image/svg+xml', 'text/xml', 'application/xml'];

// Floor number constraints
const MIN_FLOOR = 1;
const MAX_FLOOR = 99;

// Building code format
const BUILDING_CODE_REGEX = /^[A-Z]{1,4}$/;

// Room label patterns (for validation)
const ROOM_LABEL_REGEX = /^[A-Za-z0-9\s\-_]+$/;

module.exports = {
  NODE_TYPES,
  DEFAULT_STAIRCASE_TOLERANCE,
  DEFAULT_EDGE_WEIGHT,
  PATH_COLORS,
  SVG_MAX_SIZE,
  SVG_ALLOWED_MIME_TYPES,
  MIN_FLOOR,
  MAX_FLOOR,
  BUILDING_CODE_REGEX,
  ROOM_LABEL_REGEX,
};