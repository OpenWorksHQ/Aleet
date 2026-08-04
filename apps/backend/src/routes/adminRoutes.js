const express = require('express');
const { toggleDriverStatus, assignDriverToBooking, getEligibleDriversForBooking, autoAssignDriverToBooking, redispatchBooking, unassignDriverFromBooking, cancelBookingAsAdmin, updateBookingAsAdmin, getAllDrivers, approveDriver, requestRevision, uploadAleetLicense, updateDriverRegions, getDriverLicensing, getSidebarStats, getAdminDashboard, deleteDriver } = require('../controllers/adminController');
const { getDriverTierPerformance, getTierSettings, updateTierSettings } = require('../controllers/tierController');
const { inviteFounder30, listMemberships, adminChargeOverage, updateMemberBalance, createFounder30Link, listFounder30Links, deactivateFounder30Link, cancelMembership } = require('../controllers/adminMembershipController');
const { getCompanyRevenueReport, getBookingPayoutBreakdown } = require('../controllers/financeController');
const requireAdmin = require('../middleware/requireAdmin');
const { requirePermission } = require('../middleware/requireAdmin');
const { uploadSingleForHireLicense, handleUploadError } = require('../utils/multer');
const router = express.Router();

// Driver status & assignment
router.patch('/toggleDriverStatus', requireAdmin, requirePermission('manage-users'), toggleDriverStatus);
router.patch('/assignDriver', requireAdmin, requirePermission('manage-bookings'), assignDriverToBooking);
router.get('/bookings/:id/eligible-drivers', requireAdmin, requirePermission('manage-bookings'), getEligibleDriversForBooking);
router.post('/bookings/:id/auto-assign', requireAdmin, requirePermission('manage-bookings'), autoAssignDriverToBooking);
router.post('/bookings/:id/redispatch', requireAdmin, requirePermission('manage-bookings'), redispatchBooking);
router.patch('/bookings/:id/unassign', requireAdmin, requirePermission('manage-bookings'), unassignDriverFromBooking);
router.patch('/bookings/:id/cancel', requireAdmin, requirePermission('manage-bookings'), cancelBookingAsAdmin);
router.patch('/bookings/:id', requireAdmin, requirePermission('manage-bookings'), updateBookingAsAdmin);

// Driver listing & licensing
router.get('/drivers', requireAdmin, requirePermission('manage-users'), getAllDrivers);
router.get('/drivers/licensing', requireAdmin, requirePermission('manage-users'), getDriverLicensing);
router.delete('/drivers/:id', requireAdmin, requirePermission('manage-users'), deleteDriver);

// Driver approval actions
router.patch('/drivers/approve', requireAdmin, requirePermission('manage-users'), approveDriver);
router.patch('/drivers/request-revision', requireAdmin, requirePermission('manage-users'), requestRevision);

// Aleet license upload — admin attaches the Aleet-generated for-hire license to
// a driver. This promotes the driver's tier (and therefore their payout), so it
// is admin-only; it previously accepted any authenticated user's token.
router.post('/drivers/:id/aleet-license', requireAdmin, requirePermission('manage-users'), uploadSingleForHireLicense, handleUploadError, uploadAleetLicense);

// Update a driver's service regions
router.put('/drivers/:id/regions', requireAdmin, requirePermission('manage-users'), updateDriverRegions);

// Sidebar stats
router.get('/sidebar-stats', requireAdmin, requirePermission('view-reports'), getSidebarStats);

// Admin dashboard
router.get('/dashboard', requireAdmin, requirePermission('view-reports'), getAdminDashboard);

// Tier performance & settings (also serves as the central admin pricing panel)
router.get('/tiers/performance', requireAdmin, requirePermission('view-reports'), getDriverTierPerformance);
router.get('/tiers/settings', requireAdmin, requirePermission('view-reports'), getTierSettings);
router.patch('/tiers/settings', requireAdmin, requirePermission('manage-users'), updateTierSettings);

// ── Membership / Founder 30 management ──────────────────────────────────────
// List all active members with hour balance, billing info, and saved card
router.get('/memberships', requireAdmin, requirePermission('view-reports'), listMemberships);

// Grant or revoke Founder 30 invite for a customer
router.patch('/memberships/invite-founder30/:userId', requireAdmin, requirePermission('manage-users'), inviteFounder30);

// Shareable Founder 30 private-deal links (copyable for selected regions)
router.post('/memberships/founder30-links', requireAdmin, requirePermission('manage-users'), createFounder30Link);
router.get('/memberships/founder30-links', requireAdmin, requirePermission('view-reports'), listFounder30Links);
router.patch('/memberships/founder30-links/:id/deactivate', requireAdmin, requirePermission('manage-users'), deactivateFounder30Link);

// Manually charge overage hours to a member's saved card
router.post('/memberships/:userId/charge-overage', requireAdmin, requirePermission('manage-bookings'), adminChargeOverage);

// Admin override: adjust a member's monthly hour balance
router.patch('/memberships/:userId/balance', requireAdmin, requirePermission('manage-users'), updateMemberBalance);

// Cancel / remove an active membership
router.patch('/memberships/:userId/cancel', requireAdmin, requirePermission('manage-users'), cancelMembership);

// ── Financials: company revenue vs. driver payouts ──────────────────────────
router.get('/finance/revenue', requireAdmin, requirePermission('view-reports'), getCompanyRevenueReport);
router.get('/finance/bookings/:id/payout-breakdown', requireAdmin, requirePermission('view-reports'), getBookingPayoutBreakdown);

module.exports = router;
