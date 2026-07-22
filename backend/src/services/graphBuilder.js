// backend/src/services/graphBuilder.js
// Builds in-memory graph structures from Node and Edge models for a floor or building.
// Supports adjacency lists, Dijkstra/A* preprocessing, and graph validation.

const Node = require('../models/Node');
const Edge = require('../models/Edge');
const Floor = require('../models/Floor');
const Staircase = require('../models/Staircase');

/**
 * Build a graph for a single floor.
 * @param {string} floorId - Floor document ID
 * @returns {Promise<Object>} { nodes, edges, adjacencyList, nodeMap }
 */
async function buildFloorGraph(floorId) {
  const nodes = await Node.find({ floorId }).lean();
  const edges = await Edge.find({ floorId }).lean();

  return buildGraphFromNodesEdges(nodes, edges);
}

/**
 * Build a graph for an entire building (all floors + staircases).
 * @param {string} buildingId - Building document ID
 * @returns {Promise<Object>} { nodes, edges, adjacencyList, nodeMap, floorMap, staircaseMap }
 */
async function buildBuildingGraph(buildingId) {
  // Get all floors
  const floors = await Floor.find({ buildingId }).lean();
  if (!floors || floors.length === 0) {
    return { nodes: [], edges: [], adjacencyList: new Map(), nodeMap: new Map(), floorMap: new Map(), staircaseMap: new Map() };
  }

  const floorIds = floors.map(f => f._id);
  const floorMap = new Map();
  floors.forEach(f => floorMap.set(f._id.toString(), f.floorNumber));

  // Get all nodes and edges for these floors
  const nodes = await Node.find({ floorId: { $in: floorIds } }).lean();
  const edges = await Edge.find({ floorId: { $in: floorIds } }).lean();

  // Get all staircases for this building
  const staircases = await Staircase.find({ buildingId }).lean();
  const staircaseMap = new Map();
  staircases.forEach(s => {
    staircaseMap.set(s._id.toString(), s);
  });

  // Build the base graph
  const { adjacencyList, nodeMap } = buildGraphFromNodesEdges(nodes, edges);

  // Add staircase vertical edges
  for (const staircase of staircases) {
    const nodeIds = Array.from(staircase.nodeIdsPerFloor.values());
    // Connect all pairs of nodes in this staircase
    for (let i = 0; i < nodeIds.length; i++) {
      for (let j = i + 1; j < nodeIds.length; j++) {
        const idA = nodeIds[i].toString();
        const idB = nodeIds[j].toString();
        if (adjacencyList.has(idA) && adjacencyList.has(idB)) {
          // Add bidirectional edges with weight 1.0
          adjacencyList.get(idA).push({ nodeId: idB, weight: 1.0, isStaircase: true });
          adjacencyList.get(idB).push({ nodeId: idA, weight: 1.0, isStaircase: true });
        }
      }
    }
  }

  return { nodes, edges, adjacencyList, nodeMap, floorMap, staircaseMap };
}

/**
 * Build graph from raw nodes and edges arrays.
 * @param {Array} nodes - Array of node objects (with _id, x, y, etc.)
 * @param {Array} edges - Array of edge objects (with sourceNodeId, targetNodeId, weight, bidirectional)
 * @returns {Object} { adjacencyList, nodeMap }
 */
function buildGraphFromNodesEdges(nodes, edges) {
  const nodeMap = new Map();
  nodes.forEach(n => nodeMap.set(n._id.toString(), n));

  const adjacencyList = new Map();
  // Initialize adjacency list for all nodes
  nodes.forEach(n => adjacencyList.set(n._id.toString(), []));

  // Add edges
  for (const edge of edges) {
    const srcId = edge.sourceNodeId.toString();
    const tgtId = edge.targetNodeId.toString();
    const weight = edge.weight || 1.0;
    const isBidirectional = edge.bidirectional !== false;

    if (!adjacencyList.has(srcId)) adjacencyList.set(srcId, []);
    if (!adjacencyList.has(tgtId)) adjacencyList.set(tgtId, []);

    adjacencyList.get(srcId).push({ nodeId: tgtId, weight, edgeId: edge._id, isStaircase: false });
    if (isBidirectional) {
      adjacencyList.get(tgtId).push({ nodeId: srcId, weight, edgeId: edge._id, isStaircase: false });
    }
  }

  return { adjacencyList, nodeMap };
}

/**
 * Validate graph connectivity (check if all nodes are reachable from a given node).
 * @param {Object} graph - Graph object from buildBuildingGraph
 * @param {string} startNodeId - Starting node ID
 * @returns {Object} { reachable: Set, unreachable: Set, isConnected: boolean }
 */
function validateConnectivity(graph, startNodeId) {
  const { adjacencyList } = graph;
  const visited = new Set();
  const stack = [startNodeId];
  while (stack.length > 0) {
    const current = stack.pop();
    if (visited.has(current)) continue;
    visited.add(current);
    const neighbors = adjacencyList.get(current) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor.nodeId)) {
        stack.push(neighbor.nodeId);
      }
    }
  }
  const allNodes = new Set(adjacencyList.keys());
  const unreachable = new Set([...allNodes].filter(id => !visited.has(id)));
  return {
    reachable: visited,
    unreachable,
    isConnected: unreachable.size === 0,
  };
}

/**
 * Get all nodes of a certain type within a building.
 * @param {string} buildingId - Building ID
 * @param {string} nodeType - 'room', 'staircase', 'junction'
 * @returns {Promise<Array>} Array of matching nodes
 */
async function getNodesByType(buildingId, nodeType) {
  const floors = await Floor.find({ buildingId }).select('_id');
  const floorIds = floors.map(f => f._id);
  return await Node.find({ floorId: { $in: floorIds }, type: nodeType }).lean();
}

/**
 * Find all room nodes with a given label (partial match).
 * @param {string} buildingId - Building ID
 * @param {string} labelPattern - Regex pattern or string to match
 * @returns {Promise<Array>} Matching room nodes
 */
async function findRoomsByLabel(buildingId, labelPattern) {
  const floors = await Floor.find({ buildingId }).select('_id');
  const floorIds = floors.map(f => f._id);
  const regex = new RegExp(labelPattern, 'i');
  return await Node.find({
    floorId: { $in: floorIds },
    type: 'room',
    label: regex,
  }).lean();
}

module.exports = {
  buildFloorGraph,
  buildBuildingGraph,
  buildGraphFromNodesEdges,
  validateConnectivity,
  getNodesByType,
  findRoomsByLabel,
};