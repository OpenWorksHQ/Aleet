/**
 * controllers/admin/index.js
 * ---------------------------------------------------------------------------
 * Barrel for the admin controllers. controllers/adminController.js re-exports
 * this, so `require('../controllers/adminController')` keeps working and
 * routes/adminRoutes.js did not have to change.
 * ---------------------------------------------------------------------------
 */

const {
  assignDriverToBooking,
  getEligibleDriversForBooking,
  autoAssignDriverToBooking,
  redispatchBooking,
  unassignDriverFromBooking,
  cancelBookingAsAdmin,
  updateBookingAsAdmin,
} = require('./adminBookingController');
const {
  toggleDriverStatus,
  getAllDrivers,
  approveDriver,
  requestRevision,
  uploadAleetLicense,
  updateDriverRegions,
  getDriverLicensing,
  deleteDriver,
} = require('./adminDriverController');
const { getSidebarStats, getAdminDashboard } = require('./adminDashboardController');

module.exports = {
  toggleDriverStatus,
  assignDriverToBooking,
  getEligibleDriversForBooking,
  autoAssignDriverToBooking,
  redispatchBooking,
  unassignDriverFromBooking,
  cancelBookingAsAdmin,
  updateBookingAsAdmin,
  getAllDrivers,
  approveDriver,
  requestRevision,
  uploadAleetLicense,
  updateDriverRegions,
  getDriverLicensing,
  getSidebarStats,
  getAdminDashboard,
  deleteDriver,
};
