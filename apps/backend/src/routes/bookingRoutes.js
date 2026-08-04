const express = require('express');
const {
    startBooking,
    confirmBooking,
    acceptBooking,
    getOpenTrips,
    driverCancelBooking,
    getAllBookings,
    getAdminBookingStats,
    getMyBookings,
    getBookingById,
    previewBooking,
    completeBooking,
    cancelMyBooking
} = require('../controllers/bookingController.js');
const authenticateJWT = require('../middleware/authMiddleware');
const requireAdmin = require('../middleware/requireAdmin');
const { requirePermission } = require('../middleware/requireAdmin');
const { validate } = require('../middleware/validate');
const {
    previewBookingBody,
    startBookingBody,
    confirmBookingBody,
    acceptBookingBody,
    driverCancelBookingBody,
    completeBookingBody,
    cancelBookingBody,
    bookingIdParams,
    adminBookingsQuery,
    myBookingsQuery,
} = require('../validators/bookingValidators');
const router = express.Router();

// Price preview (no persist)
router.post('/preview', authenticateJWT, validate({ body: previewBookingBody }), previewBooking);

// Create booking
router.post('/start', authenticateJWT, validate({ body: startBookingBody }), startBooking);

// My bookings (authenticated user)
router.get('/my', authenticateJWT, validate({ query: myBookingsQuery }), getMyBookings);

// Customer cancellation (restores reserved member hours when on time)
router.patch(
    '/:id/cancel',
    authenticateJWT,
    validate({ params: bookingIdParams, body: cancelBookingBody }),
    cancelMyBooking
);

// Driver — open trip offers matching the driver's tier + eligibility
router.get('/open-trips', authenticateJWT, getOpenTrips);

// Driver — cancel a booking they previously accepted (back to Pending)
router.post(
    '/driver-cancel',
    authenticateJWT,
    validate({ body: driverCancelBookingBody }),
    driverCancelBooking
);

// Admin — stats for top cards
router.get('/stats', requireAdmin, requirePermission('view-reports'), getAdminBookingStats);

// Admin — all bookings
router.get(
    '/',
    requireAdmin,
    requirePermission('manage-bookings'),
    validate({ query: adminBookingsQuery }),
    getAllBookings
);

// Single booking (owner or admin)
router.get('/:id', authenticateJWT, validate({ params: bookingIdParams }), getBookingById);

// Confirm booking (admin assigns driver, or driver self-assigns)
router.post('/confirm', authenticateJWT, validate({ body: confirmBookingBody }), confirmBooking);

// Driver accepts or declines
router.post('/accept', authenticateJWT, validate({ body: acceptBookingBody }), acceptBooking);

// Complete booking
router.patch(
    '/:id/complete',
    authenticateJWT,
    validate({ params: bookingIdParams, body: completeBookingBody }),
    completeBooking
);

module.exports = router;
