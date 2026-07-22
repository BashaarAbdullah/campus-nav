// frontend/src/routes.js
// Central route definitions – used for navigation and route configuration

export const ROUTES = {
  HOME: '/',
  BUILDING: '/building/:buildingId',
  NAVIGATE: '/navigate',
  ADMIN_LOGIN: '/admin/login',
  ADMIN_DASHBOARD: '/admin',
  ADMIN_EDITOR: '/admin/editor/:buildingId/:floorNumber',
};

// Helper to generate building URL
export const buildingUrl = (buildingId) => `/building/${buildingId}`;

// Helper to generate editor URL
export const editorUrl = (buildingId, floorNumber) => `/admin/editor/${buildingId}/${floorNumber}`;

// Route titles for breadcrumbs
export const routeTitles = {
  [ROUTES.HOME]: 'Campus Map',
  [ROUTES.NAVIGATE]: 'Find Path',
  [ROUTES.ADMIN_LOGIN]: 'Admin Login',
  [ROUTES.ADMIN_DASHBOARD]: 'Admin Dashboard',
};

export default ROUTES;