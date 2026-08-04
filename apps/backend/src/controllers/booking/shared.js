/**
 * controllers/booking/shared.js
 * ---------------------------------------------------------------------------
 * Helpers shared by the booking controller modules. Moved verbatim out of the
 * original controllers/bookingController.js — no behaviour changed.
 * ---------------------------------------------------------------------------
 */

const { sendValidationError, sendError } = require('../../utils/responseHelper');
const { computePayoutCents } = require('../../services/payoutUtils');
const { getMilesFromBase } = require('../../services/googleRoutesService');

// ---------------------------------------------------------------------------
// Shared: distance surcharge breakdown builder
// ---------------------------------------------------------------------------
function buildDistanceBreakdown(baseToPickupMiles, distanceSurcharge) {
    return {
        baseToPickupMiles: baseToPickupMiles !== null ? Number(baseToPickupMiles.toFixed(2)) : null,
        freeMiles: 20,
        surchargePerMile: 2,
        distanceSurcharge
    };
}

async function resolveDistanceSurcharge(pickupLocation) {
    if (!pickupLocation) return { baseToPickupMiles: null, distanceSurcharge: 0 };
    const miles = await getMilesFromBase(pickupLocation);
    if (typeof miles !== 'number') return { baseToPickupMiles: null, distanceSurcharge: 0 };
    const surcharge = miles > 20 ? Number(((miles - 20) * 2).toFixed(2)) : 0;
    return { baseToPickupMiles: miles, distanceSurcharge: surcharge };
}

function safeSendTripAlert(phone, message) {
    if (!phone || !message) return;
    // sendTripAlert accepts (user, templateKey, vars) — here we send a raw string
    // by wrapping it in a plain twilio send if needed, or just skip (non-blocking).
    Promise.resolve().catch((err) => {
        console.error('Trip-alert SMS failed:', err?.message || err);
    });
}

function formatTripWindow(startDate) {
    try {
        return new Date(startDate).toLocaleString('en-US', {
            month: 'short', day: 'numeric',
            hour: 'numeric', minute: '2-digit'
        });
    } catch { return ''; }
}

function isMembershipTrip(booking) {
    return booking?.subscriptionPrice != null;
}

function driverServesRegion(driverDoc, regionId) {
    if (!driverDoc || !regionId) return false;
    const d = driverDoc.driver || {};
    if (d.serveAllRegions !== false) return true;
    const allowed = Array.isArray(d.regions) ? d.regions : [];
    return allowed.some((r) => String(r) === String(regionId));
}

function toDriverBooking(booking, driver, settings) {
    const obj = booking?.toObject ? booking.toObject() : booking;
    if (!obj) return obj;
    const payoutCents = computePayoutCents(obj, driver, settings);
    return {
        _id: obj._id,
        status: obj.status,
        region: obj.region,
        bookingMode: obj.bookingMode,
        dates: obj.dates,
        durationHours: obj.durationHours,
        vehicleType: obj.vehicleType,
        quantity: obj.quantity,
        pickupLocation: obj.pickupLocation,
        dropoffLocation: obj.dropoffLocation,
        stops: obj.stops,
        specialNotes: obj.specialNotes,
        assignedDriver: obj.assignedDriver,
        addOns: obj.addOns,
        freeRouting: obj.freeRouting,
        tip: obj.tip,
        completedAt: obj.completedAt,
        paymentStatus: obj.paymentStatus,
        PaidToDriver: obj.PaidToDriver,
        payoutCents,
        payoutDollars: Math.round(payoutCents) / 100
    };
}

const VALIDATION_PHRASES = [
    'Minimum booking', 'Maximum booking', 'Start date', 'Quantity',
    'Region is required', 'Pickup location is required', 'Dropoff location is required',
    'At least one stop', 'Each stop must have a location',
    'dwellMinutes must be a number', 'Invalid ISO datetime', 'Itinerary validation failed',
    'Duration must be a positive number of hours',
    'Earliest pickup'
];

function isValidationError(msg) {
    return VALIDATION_PHRASES.some(p => msg.includes(p));
}

function handleBookingError(res, err, context) {
    console.error(`${context} Error:`, err.message);
    const msg = err.message || '';
    if (isValidationError(msg)) return sendValidationError(res, msg);
    if (/Cast to ObjectId failed/i.test(msg)) {
        return sendValidationError(res, 'One or more IDs are invalid. Please pass valid MongoDB ObjectIds.');
    }
    return sendError(res, 500, `Failed to ${context.toLowerCase()}`);
}

module.exports = {
    buildDistanceBreakdown,
    resolveDistanceSurcharge,
    safeSendTripAlert,
    formatTripWindow,
    isMembershipTrip,
    driverServesRegion,
    toDriverBooking,
    VALIDATION_PHRASES,
    isValidationError,
    handleBookingError,
};
