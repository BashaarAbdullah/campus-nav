// backend/src/services/staircaseMatcher.js
// Service to match staircase nodes across floors by position and building,
// using configurable tolerance and clustering logic.

const Node = require('../models/Node');
const Staircase = require('../models/Staircase');
const { DEFAULT_STAIRCASE_TOLERANCE } = require('../utils/constants');

/**
 * Find matching staircase nodes across floors for a given building.
 * Uses hierarchical clustering based on Euclidean distance.
 * @param {string} buildingId - Building ID
 * @param {number} tolerance - Max distance to consider a match (in SVG coords)
 * @param {boolean} save - If true, automatically create/update Staircase documents
 * @returns {Promise<Array>} Array of matched groups (each group is an array of node IDs)
 */
async function matchStaircases(buildingId, tolerance = DEFAULT_STAIRCASE_TOLERANCE, save = false) {
  // Get all floors for this building
  const Floor = require('../models/Floor');
  const floors = await Floor.find({ buildingId }).sort({ floorNumber: 1 });
  if (floors.length === 0) return [];

  const floorIds = floors.map(f => f._id);
  const nodes = await Node.find({
    floorId: { $in: floorIds },
    type: 'staircase',
  });

  if (nodes.length === 0) return [];

  // Calculate distance function
  const distance = (a, b) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);

  // Simple greedy clustering: for each node, find all within tolerance
  const used = new Set();
  const groups = [];

  for (const node of nodes) {
    const nodeId = node._id.toString();
    if (used.has(nodeId)) continue;

    // Find all nodes within tolerance (including same floor? we want different floors, but we'll filter later)
    const cluster = nodes.filter(other => {
      const otherId = other._id.toString();
      if (used.has(otherId)) return false;
      // For now include same floor too, but we'll deduplicate later
      return distance(node, other) <= tolerance;
    });

    // Ensure we have at least one node per distinct floor
    const floorsSet = new Set(cluster.map(n => n.floorId.toString()));
    if (floorsSet.size < 2) {
      // Single-floor cluster – maybe a staircase that hasn't been matched yet.
      // We can either leave it unmatched or create a single-node staircase.
      // We'll still save it as a group of size 1.
      used.add(nodeId);
      groups.push([node]);
      continue;
    }

    // Filter to keep only one node per floor (prefer closest to node)
    const bestPerFloor = {};
    for (const n of cluster) {
      const fid = n.floorId.toString();
      if (!bestPerFloor[fid]) {
        bestPerFloor[fid] = n;
      } else {
        // Keep the one closer to the original node
        if (distance(node, n) < distance(node, bestPerFloor[fid])) {
          bestPerFloor[fid] = n;
        }
      }
    }

    const selected = Object.values(bestPerFloor);
    selected.forEach(n => used.add(n._id.toString()));
    groups.push(selected);
  }

  // If save is true, create/update Staircase documents
  if (save) {
    const saved = [];
    for (const group of groups) {
      if (group.length === 0) continue;
      
      // Check if these nodes already share a staircase
      const nodeIds = group.map(n => n._id);
      const existingStaircases = await Staircase.find({
        buildingId,
        'nodeIdsPerFloor': { $in: nodeIds }
      });
      // For simplicity, if any node already linked, we might update that staircase
      // But here we create a new one for each group (avoid duplicates)

      // Generate a unique name
      const existingNames = await Staircase.find({ buildingId }).distinct('name');
      let baseName = 'Staircase';
      let counter = 1;
      let proposedName = `${baseName}-${counter}`;
      while (existingNames.includes(proposedName)) {
        counter++;
        proposedName = `${baseName}-${counter}`;
      }

      // Build map: floorId -> nodeId
      const nodeMap = new Map();
      for (const n of group) {
        nodeMap.set(n.floorId.toString(), n._id);
      }

      const staircase = new Staircase({
        buildingId,
        name: proposedName,
        nodeIdsPerFloor: nodeMap,
        tolerance,
      });
      await staircase.save();

      // Update each node with staircaseId
      for (const n of group) {
        n.staircaseId = staircase._id;
        await n.save();
      }

      saved.push(staircase);
    }
    return saved;
  }

  // Otherwise return the groups (as arrays of node objects or IDs)
  return groups;
}

/**
 * Manually match two nodes as part of the same staircase.
 * @param {string} nodeIdA - First node ID
 * @param {string} nodeIdB - Second node ID
 * @param {string} buildingId - Building ID (for validation)
 * @param {string} staircaseName - Optional name for the staircase
 * @returns {Promise<Object>} Updated staircase
 */
async function manuallyMatchNodes(nodeIdA, nodeIdB, buildingId, staircaseName = null) {
  const nodeA = await Node.findById(nodeIdA);
  const nodeB = await Node.findById(nodeIdB);
  if (!nodeA || !nodeB) throw new Error('One or both nodes not found');
  if (nodeA.type !== 'staircase' || nodeB.type !== 'staircase') {
    throw new Error('Both nodes must be of type "staircase"');
  }

  // Check if they already belong to the same staircase
  if (nodeA.staircaseId && nodeB.staircaseId && nodeA.staircaseId.equals(nodeB.staircaseId)) {
    const staircase = await Staircase.findById(nodeA.staircaseId);
    return staircase;
  }

  // Determine which staircase to use (if any)
  let staircase;
  if (nodeA.staircaseId) {
    staircase = await Staircase.findById(nodeA.staircaseId);
  } else if (nodeB.staircaseId) {
    staircase = await Staircase.findById(nodeB.staircaseId);
  } else {
    // Create new
    const name = staircaseName || `Staircase-${Date.now()}`;
    staircase = new Staircase({
      buildingId,
      name,
      nodeIdsPerFloor: new Map(),
      tolerance: DEFAULT_STAIRCASE_TOLERANCE,
    });
  }

  // Add both nodes if not already present
  const floorA = nodeA.floorId.toString();
  const floorB = nodeB.floorId.toString();
  if (!staircase.nodeIdsPerFloor.has(floorA)) {
    staircase.nodeIdsPerFloor.set(floorA, nodeA._id);
  }
  if (!staircase.nodeIdsPerFloor.has(floorB)) {
    staircase.nodeIdsPerFloor.set(floorB, nodeB._id);
  }

  // Update nodes
  nodeA.staircaseId = staircase._id;
  nodeB.staircaseId = staircase._id;
  await nodeA.save();
  await nodeB.save();
  await staircase.save();

  return staircase;
}

/**
 * Remove a node from its staircase (dissociate).
 * @param {string} nodeId - Node ID
 * @returns {Promise<boolean>} Success
 */
async function dissociateNode(nodeId) {
  const node = await Node.findById(nodeId);
  if (!node) throw new Error('Node not found');
  if (!node.staircaseId) return true; // already dissociated

  const staircase = await Staircase.findById(node.staircaseId);
  if (!staircase) {
    // Staircase missing, just clear node
    node.staircaseId = null;
    await node.save();
    return true;
  }

  const floorKey = node.floorId.toString();
  staircase.nodeIdsPerFloor.delete(floorKey);
  if (staircase.nodeIdsPerFloor.size === 0) {
    // No nodes left, delete staircase
    await staircase.deleteOne();
  } else {
    await staircase.save();
  }

  node.staircaseId = null;
  await node.save();
  return true;
}

module.exports = {
  matchStaircases,
  manuallyMatchNodes,
  dissociateNode,
};