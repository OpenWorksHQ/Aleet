/**
 * controllers/booking/dispatchController.js
 * ---------------------------------------------------------------------------
 * Getting a driver onto a trip and off it again: confirm, accept/decline,
 * the driver's open-trip feed, and driver-initiated cancellation.
 * Moved verbatim out of the original controllers/bookingController.js.
 *
 * Membership hour deduction lives here (moved from startBooking per client
 * spec): both confirmBooking and acceptBooking reserve on commitment.
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
const { sendTripAlert, formatTripTime } = require('../../services/twilioService');
const { evaluateDriver } = require('../../services/dispatchService');
const { reserveMembershipHours } = require('../../services/membershipReservationService');
const {
    safeSendTripAlert,
    formatTripWindow,
    isMembershipTrip,
    driverServesRegion,
    toDriverBooking,
} = require('./shared');

// ---------------------------------------------------------------------------
// POST /api/bookings/confirm
// Hour deduction happens HERE (moved from startBooking per client spec).
// ---------------------------------------------------------------------------
const confirmBooking = asyncHandler(async (req, res) => {
    try {
        const { bookingId, driverId } = req.body;
        if (!bookingId) return sendValidationError(res, 'Booking ID is required');

        const booking = await Booking.findById(bookingId).populate('vehicleType', 'name hourlyPrice');
        if (!booking)                          return sendNotFound(res, 'Booking not found');
        if (booking.status === 'Confirmed')    return sendValidationError(res, 'Booking already confirmed');
        if (booking.paymentStatus !== 'Paid')  return sendForbidden(res, 'Payment is required before driver assignment');

        let assignedDriverDoc = null;
        if (req.user.role === 'admin' && driverId) {
            assignedDriverDoc = await User.findById(driverId);
            if (!assignedDriverDoc || assignedDriverDoc.role !== 'driver')
                return sendValidationError(res, 'Invalid driver');
            booking.assignedDriver = driverId;
        }

        if (req.user.role === 'driver' && !driverId) {
            booking.assignedDriver = req.user.id;
            assignedDriverDoc = await User.findById(req.user.id);
        }

        if (!booking.assignedDriver) return sendValidationError(res, 'Driver assignment required');

        const resolvedDriver = await User.findById(booking.assignedDriver)
            .select('role driver.tier driver.regions driver.serveAllRegions')
            .lean();
        if (!resolvedDriver || resolvedDriver.role !== 'driver')
            return sendValidationError(res, 'Invalid driver');

        if (isMembershipTrip(booking) && resolvedDriver.driver?.tier === 'S-Level')
            return sendForbidden(res, 'Membership trips can only be assigned to Pro or Diamond drivers');

        if (!driverServesRegion(resolvedDriver, booking.region))
            return sendForbidden(res, "This driver doesn't serve the booking's region");

        // ── Deduct member hours (moved from startBooking) ────────────────────
        const tierSettings = await TierSettings.findOne();
        const bookingUser  = await User.findById(booking.user);

        if (bookingUser?.subscriptionStatus === 'subscriber') {
            await reserveMembershipHours(booking, tierSettings, resolvedDriver);
        }

        booking.status = 'Confirmed';
        await booking.save();

        // Trip-alert SMS
        const [guest, driver] = await Promise.all([
            User.findById(booking.user).select('phone name').lean(),
            User.findById(booking.assignedDriver).select('phone name').lean()
        ]);
        const tripWindow = formatTripWindow(booking.dates?.startDate);
        if (guest?.phone) {
            safeSendTripAlert(
                guest.phone,
                `Aleet: Your driver has been assigned for your trip${tripWindow ? ` on ${tripWindow}` : ''}.`
            );
        }
        if (driver?.phone && req.user.role === 'admin') {
            safeSendTripAlert(
                driver.phone,
                `Aleet: You've been assigned a new trip${tripWindow ? ` on ${tripWindow}` : ''}. Open the driver app for details.`
            );
        }

        if (req.user.role === 'driver') {
            const driverDoc = await User.findById(req.user.id).lean();
            return sendSuccess(res, 200, 'Booking confirmed successfully', toDriverBooking(booking, driverDoc, tierSettings));
        }

        return sendSuccess(res, 200, 'Booking confirmed successfully', booking);
    } catch (error) {
        console.error('Confirm Booking Error:', error);
        return sendError(res, 500, error.message || 'Failed to confirm booking');
    }
});

// ---------------------------------------------------------------------------
// POST /api/bookings/accept  — Driver accept / decline
// ---------------------------------------------------------------------------
const acceptBooking = asyncHandler(async (req, res) => {
    try {
        const { bookingId, action } = req.body;
        const driverId = req.user.id;

        if (!bookingId || !action) return sendValidationError(res, 'Booking ID and action are required');
        if (action !== 'accept' && action !== 'decline')
            return sendValidationError(res, 'Invalid action. Must be "accept" or "decline"');

        const booking = await Booking.findById(bookingId);
        if (!booking) return sendNotFound(res, 'Booking not found');
        if (booking.paymentStatus !== 'Paid')
            return sendForbidden(res, 'Trip is not available until payment succeeds');

        if (action === 'decline') {
            return sendSuccess(res, 200, 'Trip declined — it will remain available to other drivers', {});
        }

        if (booking.assignedDriver) return sendError(res, 409, 'Trip already taken');
        if (booking.status !== 'Pending')
            return sendValidationError(res, `Booking is ${booking.status} and can no longer be accepted`);

        const driver = await User.findById(driverId);
        if (!driver || driver.role !== 'driver') return sendValidationError(res, 'Invalid driver');

        const { eligible, reason } = evaluateDriver(driver, booking);
        if (!eligible) return sendForbidden(res, reason || 'You are not eligible for this trip');

        const offeredTiers = (booking.offer && booking.offer.tiers) || [];
        if (offeredTiers.length > 0 && !offeredTiers.includes(driver.driver?.tier))
            return sendForbidden(res, 'This trip is not currently being offered to your tier');

        // Atomic claim
        const claimed = await Booking.findOneAndUpdate(
            { _id: bookingId, assignedDriver: null, status: 'Pending', paymentStatus: 'Paid' },
            {
                $set: {
                    assignedDriver: driverId,
                    status: 'Confirmed',
                    'offer.stage': 0,
                    'offer.expiresAt': null
                }
            },
            { new: true }
        );
        if (!claimed) return sendError(res, 409, 'Trip already taken');

        // Deduct member hours on accept (same as confirm path)
        const tierSettings = await TierSettings.findOne();
        const bookingUser  = await User.findById(claimed.user);

        if (bookingUser?.subscriptionStatus === 'subscriber') {
            await reserveMembershipHours(claimed, tierSettings, driver);
        }

        // Notify guest
        try {
            const guest = await User.findById(claimed.user);
            if (guest) {
                sendTripAlert(guest, 'guest_driver_assigned', {
                    driverName: driver.name,
                    when: formatTripTime(claimed.dates?.startDate)
                }).catch(e => console.error('SMS guest_driver_assigned failed:', e?.message));
            }
        } catch (e) {
            console.error('Guest accept-notification lookup failed:', e?.message || e);
        }

        // Driver payout is now only released after trip completion. Membership
        // prepaid value is accounted above when the driver commits, but no
        // Stripe transfer occurs at acceptance (including Diamond drivers).

        return sendSuccess(res, 200, 'Booking accepted successfully', toDriverBooking(claimed, driver, tierSettings));
    } catch (error) {
        console.error('Accept Booking Error:', error);
        return sendError(res, 500, error.message || 'Failed to process booking action');
    }
});

// ---------------------------------------------------------------------------
// GET /api/bookings/open-trips
// ---------------------------------------------------------------------------
const getOpenTrips = asyncHandler(async (req, res) => {
    try {
        if (req.user.role !== 'driver') return sendForbidden(res, 'Drivers only');

        const driver = await User.findById(req.user.id);
        if (!driver) return sendNotFound(res, 'Driver not found');
        if (driver.driver?.status !== 'approved')
            return sendForbidden(res, 'Only approved drivers can view open trips');

        const candidates = await Booking.find({
            status: 'Pending',
            paymentStatus: 'Paid',
            assignedDriver: null,
            'offer.stage': { $gt: 0 },
            'offer.tiers': driver.driver.tier
        })
            .populate('region', 'name code')
            .populate('vehicleType', 'name hourlyPrice')
            .sort({ 'offer.offeredAt': -1 });

        const eligible = candidates.filter(b => evaluateDriver(driver, b).eligible);
        const settings = await TierSettings.findOne().lean();
        const dtos     = eligible.map(b => toDriverBooking(b, driver, settings));

        return sendSuccess(res, 200, 'Open trips retrieved', dtos);
    } catch (error) {
        console.error('Get Open Trips Error:', error);
        return sendError(res, 500, error.message || 'Failed to retrieve open trips');
    }
});

// ---------------------------------------------------------------------------
// POST /api/bookings/driver-cancel
// ---------------------------------------------------------------------------
const driverCancelBooking = asyncHandler(async (req, res) => {
    try {
        const { bookingId, reason } = req.body;
        const driverId = req.user.id;

        if (!bookingId) return sendValidationError(res, 'Booking ID is required');

        const booking = await Booking.findById(bookingId);
        if (!booking) return sendNotFound(res, 'Booking not found');
        if (String(booking.assignedDriver) !== String(driverId))
            return sendForbidden(res, 'You are not assigned to this booking');
        if (['Completed', 'Cancelled', 'Expired'].includes(booking.status))
            return sendValidationError(res, `Booking is already ${booking.status}`);

        await Booking.updateOne(
            { _id: bookingId },
            {
                $set: {
                    assignedDriver: null,
                    status: 'Pending',
                    'offer.stage': 0,
                    'offer.offeredAt': null,
                    'offer.expiresAt': null,
                    'offer.tiers': [],
                    cancellation: { cancelledBy: driverId, cancelledAt: new Date(), reason: reason || null }
                }
            }
        );

        await User.updateOne(
            { _id: driverId },
            { $inc: { 'driver.cancellationCount': 1 }, $set: { 'driver.lastCancellationAt': new Date() } }
        );

        try {
            const guest = await User.findById(booking.user);
            if (guest) {
                sendTripAlert(guest, 'guest_trip_cancelled', {})
                    .catch(e => console.error('SMS guest_trip_cancelled failed:', e?.message));
            }
        } catch (e) {
            console.error('Driver-cancel guest notification failed:', e?.message || e);
        }

        return sendSuccess(res, 200, 'Booking cancelled — admin will reassign', { bookingId, status: 'Pending' });
    } catch (error) {
        console.error('Driver Cancel Booking Error:', error);
        return sendError(res, 500, error.message || 'Failed to cancel booking');
    }
});

module.exports = {
    confirmBooking,
    acceptBooking,
    getOpenTrips,
    driverCancelBooking,
};
