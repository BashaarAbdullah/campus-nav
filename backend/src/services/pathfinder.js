// backend/src/services/pathfinder.js
// A* pathfinding algorithm on floor graphs with staircase transitions

class PriorityQueue {
  constructor() {
    this.elements = [];
  }
  enqueue(item, priority) {
    this.elements.push({ item, priority });
    this.elements.sort((a, b) => a.priority - b.priority);
  }
  dequeue() {
    return this.elements.shift()?.item;
  }
  isEmpty() {
    return this.elements.length === 0;
  }
}

/**
 * Build adjacency list from edges, considering bidirectional flag.
 */
function buildGraph(nodes, edges) {
  const graph = new Map();
  const nodeMap = new Map();
  nodes.forEach(n => nodeMap.set(n._id.toString(), n));

  edges.forEach(edge => {
    const srcId = edge.sourceNodeId.toString();
    const tgtId = edge.targetNodeId.toString();
    if (!graph.has(srcId)) graph.set(srcId, []);
    if (!graph.has(tgtId)) graph.set(tgtId, []);
    const weight = edge.weight || 1.0;
    graph.get(srcId).push({ nodeId: tgtId, weight, edgeId: edge._id });
    if (edge.bidirectional !== false) {
      graph.get(tgtId).push({ nodeId: srcId, weight, edgeId: edge._id });
    }
  });

  return { graph, nodeMap };
}

/**
 * Reconstruct path from cameFrom map.
 */
function reconstructPath(cameFrom, currentId, nodeMap) {
  const path = [];
  let cur = currentId;
  while (cur) {
    const node = nodeMap.get(cur);
    if (node) path.unshift(node);
    cur = cameFrom.get(cur);
  }
  return path;
}

/**
 * Heuristic: Euclidean distance between two nodes (in SVG coordinate space).
 */
function heuristic(nodeA, nodeB) {
  return Math.sqrt((nodeA.x - nodeB.x) ** 2 + (nodeA.y - nodeB.y) ** 2);
}

/**
 * Find shortest path using A*.
 * @param {Object} params
 * @param {Object} params.sourceNode - Mongoose node document
 * @param {Object} params.targetNode - Mongoose node document
 * @param {Array} params.allNodes - All nodes in the building
 * @param {Array} params.allEdges - All edges in the building
 * @param {Array} params.staircases - Staircase documents for vertical links
 * @param {Array} params.floors - Floor documents with floorNumber
 * @param {boolean} params.includeDirections - Whether to generate step-by-step directions
 * @returns {Object} { path, totalWeight, steps, floorTransitions }
 */
async function findShortestPath({
  sourceNode,
  targetNode,
  allNodes,
  allEdges,
  staircases,
  floors,
  includeDirections = true,
}) {
  // Build floor lookup
  const floorMap = new Map();
  floors.forEach(f => floorMap.set(f._id.toString(), f.floorNumber));

  // Build node map with floor numbers
  const nodeMap = new Map();
  allNodes.forEach(n => {
    const nodeObj = n.toObject ? n.toObject() : n;
    nodeObj.floorNumber = floorMap.get(n.floorId.toString()) || 0;
    nodeMap.set(n._id.toString(), nodeObj);
  });

  // Build base graph
  const { graph, nodeMap: _nodeMap } = buildGraph(allNodes, allEdges);

  // Add staircase connections (vertical edges between floors)
  // Each staircase has nodeIdsPerFloor: Map<floorIdString, nodeId>
  staircases.forEach(staircase => {
    const entries = Array.from(staircase.nodeIdsPerFloor.entries());
    // For every pair of floors, add bidirectional edges with weight (1.0 by default)
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const [floorIdA, nodeIdA] = entries[i];
        const [floorIdB, nodeIdB] = entries[j];
        const nodeAId = nodeIdA.toString();
        const nodeBId = nodeIdB.toString();
        // Add edges if not already present
        if (!graph.has(nodeAId)) graph.set(nodeAId, []);
        if (!graph.has(nodeBId)) graph.set(nodeBId, []);
        // Check if edge already exists to avoid duplicates
        const existing = graph.get(nodeAId).some(e => e.nodeId === nodeBId);
        if (!existing) {
          graph.get(nodeAId).push({ nodeId: nodeBId, weight: 1.0, isStaircase: true });
          graph.get(nodeBId).push({ nodeId: nodeAId, weight: 1.0, isStaircase: true });
        }
      }
    }
  });

  const sourceId = sourceNode._id.toString();
  const targetId = targetNode._id.toString();

  // A* algorithm
  const openSet = new PriorityQueue();
  const cameFrom = new Map();
  const gScore = new Map();
  const fScore = new Map();

  gScore.set(sourceId, 0);
  const sourceObj = nodeMap.get(sourceId);
  const targetObj = nodeMap.get(targetId);
  fScore.set(sourceId, heuristic(sourceObj, targetObj));
  openSet.enqueue(sourceId, fScore.get(sourceId));

  while (!openSet.isEmpty()) {
    const currentId = openSet.dequeue();
    if (currentId === targetId) {
      const path = reconstructPath(cameFrom, currentId, nodeMap);
      const totalWeight = gScore.get(currentId);
      // Generate directions if requested
      let steps = [];
      let floorTransitions = [];
      if (includeDirections && path.length > 0) {
        steps = generateDirections(path, graph);
        floorTransitions = detectFloorTransitions(path);
      }
      return { path, totalWeight, steps, floorTransitions };
    }

    const neighbors = graph.get(currentId) || [];
    for (const neighbor of neighbors) {
      const neighborId = neighbor.nodeId;
      const tentativeG = gScore.get(currentId) + neighbor.weight;
      if (tentativeG < (gScore.get(neighborId) || Infinity)) {
        cameFrom.set(neighborId, currentId);
        gScore.set(neighborId, tentativeG);
        const neighborObj = nodeMap.get(neighborId);
        const f = tentativeG + heuristic(neighborObj, targetObj);
        fScore.set(neighborId, f);
        openSet.enqueue(neighborId, f);
      }
    }
  }

  // No path found
  return { path: [], totalWeight: Infinity, steps: [], floorTransitions: [] };
}

/**
 * Generate human-readable step-by-step directions from the path.
 */
function generateDirections(path, graph) {
  const steps = [];
  for (let i = 0; i < path.length - 1; i++) {
    const current = path[i];
    const next = path[i + 1];
    const direction = getDirection(current, next);
    const floorChange = current.floorNumber !== next.floorNumber ? ` (change floor to ${next.floorNumber})` : '';
    steps.push({
      from: current.label || `Node ${current._id}`,
      to: next.label || `Node ${next._id}`,
      direction,
      floorChange: floorChange.trim(),
      floor: next.floorNumber,
    });
  }
  return steps;
}

/**
 * Detect floor transitions in path.
 */
function detectFloorTransitions(path) {
  const transitions = [];
  for (let i = 0; i < path.length - 1; i++) {
    const current = path[i];
    const next = path[i + 1];
    if (current.floorNumber !== next.floorNumber) {
      transitions.push({
        fromFloor: current.floorNumber,
        toFloor: next.floorNumber,
        atNode: current.label || `Node ${current._id}`,
      });
    }
  }
  return transitions;
}

/**
 * Get directional description between two points.
 */
function getDirection(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  if (angle > -22.5 && angle <= 22.5) return 'East';
  if (angle > 22.5 && angle <= 67.5) return 'North-East';
  if (angle > 67.5 && angle <= 112.5) return 'North';
  if (angle > 112.5 && angle <= 157.5) return 'North-West';
  if (angle > 157.5 || angle <= -157.5) return 'West';
  if (angle > -157.5 && angle <= -112.5) return 'South-West';
  if (angle > -112.5 && angle <= -67.5) return 'South';
  if (angle > -67.5 && angle <= -22.5) return 'South-East';
  return 'Unknown';
}

module.exports = { findShortestPath };