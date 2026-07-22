// backend/src/middleware/validate.js
// Request validation middleware using Joi schemas

const Joi = require('joi');

// Validation schemas for various request bodies
const schemas = {
  // Auth
  login: Joi.object({
    username: Joi.string().required(),
    password: Joi.string().required(),
  }),

  // Buildings
  createBuilding: Joi.object({
    name: Joi.string().required().trim(),
    code: Joi.string().required().trim().uppercase(),
  }),
  updateBuilding: Joi.object({
    name: Joi.string().trim(),
    code: Joi.string().trim().uppercase(),
    masterRegionId: Joi.string().allow(null, ''),
    regionData: Joi.object(),
  }),
  linkBuildingToMaster: Joi.object({
    masterSvgId: Joi.string().required(),
    regionId: Joi.string().required(),
    boundingBox: Joi.object({
      x: Joi.number(),
      y: Joi.number(),
      width: Joi.number(),
      height: Joi.number(),
    }),
    metadata: Joi.object(),
  }),

  // Floors
  uploadFloor: Joi.object({
    buildingId: Joi.string().required(),
    floorNumber: Joi.number().integer().min(1).required(),
    svgData: Joi.string().required(),
    metadata: Joi.object({
      width: Joi.number(),
      height: Joi.number(),
      viewBox: Joi.string(),
    }),
  }),
  updateFloor: Joi.object({
    svgData: Joi.string(),
    metadata: Joi.object(),
  }),

  // Nodes
  createNode: Joi.object({
    floorId: Joi.string().required(),
    type: Joi.string().valid('room', 'staircase', 'junction').required(),
    label: Joi.string().trim().allow(''),
    x: Joi.number().required(),
    y: Joi.number().required(),
    properties: Joi.object(),
  }),
  updateNode: Joi.object({
    label: Joi.string().trim().allow(''),
    x: Joi.number(),
    y: Joi.number(),
    type: Joi.string().valid('room', 'staircase', 'junction'),
    properties: Joi.object(),
    staircaseId: Joi.string().allow(null),
  }),

  // Edges
  createEdge: Joi.object({
    sourceNodeId: Joi.string().required(),
    targetNodeId: Joi.string().required(),
    floorId: Joi.string().required(),
    weight: Joi.number().min(0).default(1.0),
    bidirectional: Joi.boolean().default(true),
    properties: Joi.object(),
  }),
  updateEdge: Joi.object({
    weight: Joi.number().min(0),
    bidirectional: Joi.boolean(),
    properties: Joi.object(),
  }),

  // Staircases
  createStaircase: Joi.object({
    buildingId: Joi.string().required(),
    name: Joi.string().required().trim(),
    nodeIdsPerFloor: Joi.object().pattern(Joi.string(), Joi.string()).required(),
    tolerance: Joi.number().min(0).default(10),
    description: Joi.string().allow(''),
  }),
  updateStaircase: Joi.object({
    name: Joi.string().trim(),
    tolerance: Joi.number().min(0),
    description: Joi.string().allow(''),
    nodeIdsPerFloor: Joi.object().pattern(Joi.string(), Joi.string()),
  }),
  autoLinkStaircases: Joi.object({
    tolerance: Joi.number().min(0).default(10),
  }),

  // Pathfinding
  findShortestPath: Joi.object({
    sourceNodeId: Joi.string().required(),
    targetNodeId: Joi.string().required(),
    includeDirections: Joi.boolean().default(true),
  }),
  findPathByRoomNames: Joi.object({
    sourceRoomName: Joi.string().required(),
    targetRoomName: Joi.string().required(),
    buildingCode: Joi.string().required().uppercase(),
  }),
};

// Middleware factory
const validate = (schemaName) => {
  return (req, res, next) => {
    const schema = schemas[schemaName];
    if (!schema) {
      return res.status(500).json({ message: `Validation schema '${schemaName}' not found` });
    }

    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
    }

    // Replace req.body with validated and cleaned value
    req.body = value;
    next();
  };
};

module.exports = validate;