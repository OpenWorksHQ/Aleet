/**
 * controllers/booking/index.js
 * ---------------------------------------------------------------------------
 * Barrel for the booking controllers. controllers/bookingController.js
 * re-exports this, so `require('../controllers/bookingController')` and
 * `require('../controllers/bookingController.js')` both keep working and no
 * route file needed rewriting.
 * ---------------------------------------------------------------------------
 */

const { previewBooking, startBooking } = require('./quoteController');
const {
    confirmBooking,
    acceptBooking,
    getOpenTrips,
    driverCancelBooking,
} = require('./dispatchController');
const { completeBooking, cancelMyBooking } = require('./lifecycleController');
const {
    getAllBookings,
    getMyBookings,
    getBookingById,
    getAdminBookingStats,
} = require('./queryController');

module.exports = {
    previewBooking,
    startBooking,
    confirmBooking,
    acceptBooking,
    getOpenTrips,
    driverCancelBooking,
    getAllBookings,
    getAdminBookingStats,
    getMyBookings,
    getBookingById,
    completeBooking,
    cancelMyBooking,
};
