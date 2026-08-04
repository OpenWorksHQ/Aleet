/**
 * controllers/adminController.js
 * ---------------------------------------------------------------------------
 * Thin barrel. The implementation was split, verbatim, into controllers/admin/:
 *
 *   adminBookingController.js    assign / auto-assign / re-dispatch / unassign /
 *                                cancel / update a booking
 *   adminDriverController.js     driver status, list, approve, revision,
 *                                Aleet-license upload, regions, licensing
 *                                report, soft delete (SSN masked via
 *                                utils/maskSSN.js)
 *   adminDashboardController.js  sidebar stats + the admin dashboard
 *
 * This file stays so `require('../controllers/adminController')` keeps
 * resolving and routes/adminRoutes.js did not have to change.
 * ---------------------------------------------------------------------------
 */

module.exports = require('./admin');
