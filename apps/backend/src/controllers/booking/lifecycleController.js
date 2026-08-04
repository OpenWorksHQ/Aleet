/**
 * controllers/booking/lifecycleController.js
 * ---------------------------------------------------------------------------
 * Closing a trip out: customer completion (rating + tip) and customer
 * cancellation (which restores reserved membership hours when on time).
 * Moved verbatim out of the original controllers/bookingController.js.
 * ---------------------------------------------------------------------------
 */

const asyncHandler = require('express-async-handler');

const Booking = require('../../models/Booking');
const User = require('../../models/User');
const TierSettings = require('../../models/TierSettings');

const {
    sendSuccess,
    sendError,
    sendValidationError,
    sendNotFound,
    sendForbidden
} = require('../../utils/responseHelper');
const { sendTripAlert } = require('../../services/twilioService');
const { restoreMembershipHours } = require('../../services/membershipReservationService');
const { recordPartnerBookingCompleted } = require('../../services/partnerService');

// ---------------------------------------------------------------------------
// PATCH /api/bookings/:id/complete
// ---------------------------------------------------------------------------
const completeBooking = asyncHandler(async (req, res) => {
    try {
        const bookingId = req.params.id || req.body.bookingId;
        const { rating, tip } = req.body;
        const userId = req.user.id;

        if (!bookingId) return sendValidationError(res, 'Booking ID is required');

        const booking = await Booking.findById(bookingId);
        if (!booking) return sendNotFound(res, 'Booking not found');
        if (booking.user.toString() !== userId.toString())
            return sendForbidden(res, 'You can only complete your own booking');
        if (['Completed', 'Cancelled'].includes(booking.status))
            return sendValidationError(res, `Booking already ${booking.status}`);

        const now = new Date();
        if (now < new Date(booking.dates.endDate))
            return sendValidationError(res, 'Ride cannot be completed before end time');

        if (rating != null) {
            if (rating < 1 || rating > 5) return sendValidationError(res, 'Rating must be between 1 and 5');
            booking.rating = rating;
        }
        if (tip && Number(tip) > 0) booking.tip = Number(tip);

        booking.status      = 'Completed';
        booking.completedAt = now;
        await booking.save();

        if (booking.partner?.partner && booking.partner.commissionAmount > 0) {
            await recordPartnerBookingCompleted(
                booking.partner.partner,
                booking.partner.commissionAmount,
            );
        }

        (async () => {
            try {
                const guest = await User.findById(booking.user);
                if (guest) {
                    sendTripAlert(guest, 'guest_trip_completed', {})
                        .catch(e => console.error('SMS guest_trip_completed failed:', e?.message));
                }
            } catch (e) {
                console.error('SMS completeBooking dispatch failed:', e?.message);
            }
        })();

        return sendSuccess(res, 200, 'Booking completed successfully', booking);
    } catch (error) {
        console.error('Complete Booking Error:', error);
        return sendError(res, 500, error.message || 'Failed to complete booking');
    }
});

// ---------------------------------------------------------------------------
// PATCH /api/bookings/:id/cancel  (Customer)
// On-time cancellation restores reserved membership hours. Late cancellation
// keeps the reservation; payment refund policy remains an admin operation.
// ---------------------------------------------------------------------------
const cancelMyBooking = asyncHandler(async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) return sendNotFound(res, 'Booking not found');
        if (booking.user.toString() !== req.user.id.toString())
            return sendForbidden(res, 'Not your booking');
        if (['Cancelled', 'Completed', 'Expired'].includes(booking.status))
            return sendValidationError(res, `Cannot cancel a ${booking.status.toLowerCase()} booking`);

        const settings = await TierSettings.findOne();
        const windowHours = Number(settings?.cancellationWindowHours) || 3;
        const hoursUntilPickup =
            (new Date(booking.dates?.startDate).getTime() - Date.now()) / 3600000;
        const eligibleForHourRestore = hoursUntilPickup >= windowHours;

        let restoration = { restored: false, hours: 0 };
        if (eligibleForHourRestore) {
            restoration = await restoreMembershipHours(
                booking,
                `Customer cancelled at least ${windowHours}h before pickup`,
            );
        }

        booking.status = 'Cancelled';
        booking.cancellation = {
            cancelledBy: req.user.id,
            cancelledAt: new Date(),
            reason: typeof req.body?.reason === 'string' && req.body.reason.trim()
                ? req.body.reason.trim()
                : eligibleForHourRestore
                    ? 'Customer cancellation within allowed window'
                    : 'Late customer cancellation',
        };
        booking.offer = {
            stage: 0,
            offeredAt: null,
            expiresAt: null,
            tiers: [],
            offeredTo: [],
        };
        await booking.save();

        return sendSuccess(res, 200, 'Booking cancelled', {
            booking,
            cancellationWindowHours: windowHours,
            membershipHoursRestored: restoration.hours,
            lateCancellation: !eligibleForHourRestore,
            paymentRefunded: false,
        });
    } catch (error) {
        console.error('Cancel My Booking Error:', error);
        return sendError(res, 500, error.message || 'Failed to cancel booking');
    }
});

module.exports = {
    completeBooking,
    cancelMyBooking,
};
