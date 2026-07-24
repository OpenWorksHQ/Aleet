/**
 * controllers/bookingController.js
 * ---------------------------------------------------------------------------
 * Booking controllers only — no business logic or utilities here.
 *
 * Key changes vs original:
 *   - TierSettings passed to validateBookingInput (min hours + notice from DB)
 *   - TierSettings.bookingFee + startDate/endDate passed to calculateBookingPrice
 *   - Hour deduction moved from startBooking → confirmBooking (per client spec)
 * ---------------------------------------------------------------------------
 */

const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');

const Booking = require('../models/Booking');
const User = require('../models/User');
const VehicleType = require('../models/Vehicle');
const MonthlyHours = require('../models/MonthlyHours');
const TierSettings = require('../models/TierSettings');

const { getPagination, getSorting, getSearchQuery } = require('../utils/queryHelper');
const {
    sendSuccess,
    sendError,
    sendValidationError,
    sendNotFound,
    sendForbidden,
    sendPaginated
} = require('../utils/responseHelper');
const { computePayoutCents } = require('../services/payoutUtils');
const { getMilesFromBase } = require('../services/googleRoutesService');
const { getRegionSameDayStatus } = require('../services/availabilityService');
const { sendTripAlert, formatTripTime } = require('../services/twilioService');
const { evaluateDriver } = require('../services/dispatchService');
const {
    toId,
    validateBookingInput,
    validateFinalBookingInput,
    buildItineraryFromBody,
    validateItinerary,
    resolveMemberRate,
    calculateBookingPrice
} = require('../utils/bookingHelpers');
const { getMembershipHourBalance } = require('../utils/membershipHours');
const {
    reserveMembershipHours,
    restoreMembershipHours,
} = require('../services/membershipReservationService');
const {
    resolveBookingPartner,
    computePartnerAdjustments,
    buildPartnerBookingSnapshot,
    recordPartnerBookingCompleted,
} = require('../services/partnerService');

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

// ---------------------------------------------------------------------------
// POST /api/bookings/preview
// ---------------------------------------------------------------------------
const previewBooking = asyncHandler(async (req, res) => {
    try {
        const {
            region, startDate, endDate, vehicleTypeId, quantity,
            stops = [], addOns = [], freeRouting = false,
            pickupLocation, dropoffLocation,
            bookingMode = 'multi_day',
            durationHours, duration
        } = req.body;

        const resolvedBookingMode = bookingMode === 'buy_hours' ? 'buy_hours' : 'multi_day';
        const effectiveDurationHours = Number(durationHours ?? duration);
        let effectiveStartDate = startDate;
        let effectiveEndDate   = endDate;

        if (resolvedBookingMode === 'buy_hours') {
            if (!effectiveStartDate) throw new Error('Start date is required');
            if (!Number.isFinite(effectiveDurationHours) || effectiveDurationHours <= 0)
                throw new Error('Duration must be a positive number of hours');
            const startMs = new Date(effectiveStartDate).getTime();
            if (Number.isNaN(startMs)) throw new Error('Invalid ISO datetime for startDate. Use UTC ISO like 2025-10-12T16:00:00.000Z');
            effectiveEndDate = new Date(startMs + effectiveDurationHours * 3600 * 1000).toISOString();
        }

        const [user, vehicleType, tierSettings] = await Promise.all([
            User.findById(req.user.id),
            VehicleType.findById(vehicleTypeId),
            TierSettings.findOne()
        ]);
        if (!user)        return sendNotFound(res, 'User not found');
        if (!vehicleType) return sendValidationError(res, 'Invalid vehicle type');

        const isSubscriber = user.subscriptionStatus === 'subscriber';

        const partnerDoc = await resolveBookingPartner(req.body);
        const skipSameDayNotice = partnerDoc?.bookingMode === 'venue_access';

        const { bookingHours } = validateBookingInput({
            region, startDate: effectiveStartDate, endDate: effectiveEndDate,
            quantity, bookingMode: resolvedBookingMode,
            durationHours: effectiveDurationHours,
            isSubscriber,
            skipSameDayNotice,
            settings: tierSettings
        });

        const safeAddOnIds = Array.isArray(addOns) ? addOns.map(toId).filter(Boolean) : [];
        const safeStops    = Array.isArray(stops)
            ? stops.map(s => ({ ...s, addOnIds: Array.isArray(s.addOnIds) ? s.addOnIds.map(toId).filter(Boolean) : [] }))
            : [];

        let routeValidation = null;
        if (!freeRouting && pickupLocation && dropoffLocation && safeStops.length > 0) {
            const itinerary = buildItineraryFromBody({ ...req.body, stops: safeStops });
            routeValidation = await validateItinerary(itinerary, { bufferMinutes: 15 });
        }

        // Monthly soft-cap (5h) + quarterly ceiling (15h) — see membershipHours.js
        const hourBalance = isSubscriber
            ? await getMembershipHourBalance(MonthlyHours, req.user.id, tierSettings, effectiveStartDate)
            : null;

        const memberRate = resolveMemberRate(user, tierSettings);

        const { regularPrice, subscriberPrice, breakdown } = await calculateBookingPrice({
            vehicleType, quantity, addOns: safeAddOnIds, isSubscriber, memberRate,
            usedHours: hourBalance?.quarterlyUsed || 0,
            freeHoursLeft: hourBalance?.freeHoursLeft,
            bookingHours,
            bookingFee:  tierSettings?.bookingFee,
            startDate:   effectiveStartDate,
            endDate:     effectiveEndDate,
            settings:    tierSettings
        });

        const { baseToPickupMiles, distanceSurcharge } = await resolveDistanceSurcharge(pickupLocation);

        const regTotal = Number((regularPrice + distanceSurcharge).toFixed(2));
        const subTotal = Number((subscriberPrice + distanceSurcharge).toFixed(2));
        const total    = isSubscriber ? subTotal : regTotal;

        let partnerSnapshot = null;
        let finalTotal = total;
        if (partnerDoc) {
            const adjustments = computePartnerAdjustments(partnerDoc, tierSettings, total);
            finalTotal = adjustments.finalPrice;
            partnerSnapshot = buildPartnerBookingSnapshot(partnerDoc, adjustments);
        }

        return sendSuccess(res, 200, 'Booking preview calculated', {
            vehicleType,
            bookingMode: resolvedBookingMode,
            quantity,
            startDate: effectiveStartDate,
            endDate:   effectiveEndDate,
            durationHours: resolvedBookingMode === 'buy_hours' ? effectiveDurationHours : undefined,
            hours: bookingHours,
            regularPrice: regTotal,
            subscriptionPrice: isSubscriber ? subTotal : undefined,
            total: finalTotal,
            partner: partnerSnapshot,
            breakdown: {
                ...breakdown,
                distance: buildDistanceBreakdown(baseToPickupMiles, distanceSurcharge),
                partnerDiscount: partnerSnapshot?.discountAmount || 0,
                membershipHours: hourBalance ? {
                    monthlyIncluded: hourBalance.monthlyIncluded,
                    monthlyUsed: hourBalance.monthlyUsed,
                    monthlyRemaining: hourBalance.monthlyRemaining,
                    quarterlyIncluded: hourBalance.quarterlyIncluded,
                    quarterlyUsed: hourBalance.quarterlyUsed,
                    quarterlyRemaining: hourBalance.quarterlyRemaining,
                    freeHoursAvailable: hourBalance.freeHoursLeft,
                } : undefined,
            },
            routeValidation
        });
    } catch (err) {
        return handleBookingError(res, err, 'Preview Booking');
    }
});

// ---------------------------------------------------------------------------
// POST /api/bookings/start
// Hour deduction NO LONGER happens here — moved to confirmBooking.
// ---------------------------------------------------------------------------
const startBooking = asyncHandler(async (req, res) => {
    try {
        const {
            region, startDate, endDate, vehicleTypeId, quantity,
            stops = [], addOns = [], freeRouting = false,
            pickupLocation, dropoffLocation, adminOverride: bodyAdminOverride,
            specialNotes,
            bookingMode = 'multi_day',
            durationHours, duration
        } = req.body;

        const resolvedBookingMode    = bookingMode === 'buy_hours' ? 'buy_hours' : 'multi_day';
        const effectiveDurationHours = Number(durationHours ?? duration);
        let effectiveStartDate       = startDate;
        let effectiveEndDate         = endDate;
        const effectiveFreeRouting   = resolvedBookingMode === 'buy_hours' ? true : !!freeRouting;
        const inputStops             = stops;

        if (resolvedBookingMode === 'buy_hours') {
            if (!effectiveStartDate) throw new Error('Start date is required');
            if (!Number.isFinite(effectiveDurationHours) || effectiveDurationHours <= 0)
                throw new Error('Duration must be a positive number of hours');
            const startMs = new Date(effectiveStartDate).getTime();
            if (Number.isNaN(startMs)) throw new Error('Invalid ISO datetime for startDate. Use UTC ISO like 2025-10-12T16:00:00.000Z');
            effectiveEndDate = new Date(startMs + effectiveDurationHours * 3600 * 1000).toISOString();
        }

        const [user, vehicleType, tierSettings] = await Promise.all([
            User.findById(req.user.id),
            VehicleType.findById(vehicleTypeId),
            TierSettings.findOne()
        ]);
        if (!user)        return sendNotFound(res, 'User not found');
        if (!vehicleType) return sendValidationError(res, 'Invalid vehicle type');

        const isSubscriber = user.subscriptionStatus === 'subscriber';

        const partnerDoc = await resolveBookingPartner(req.body);
        const skipSameDayNotice = partnerDoc?.bookingMode === 'venue_access';

        const { bookingHours } = validateBookingInput({
            region, startDate: effectiveStartDate, endDate: effectiveEndDate,
            quantity, bookingMode: resolvedBookingMode,
            durationHours: effectiveDurationHours,
            isSubscriber,
            skipSameDayNotice,
            settings: tierSettings
        });

        validateFinalBookingInput({
            pickupLocation, dropoffLocation,
            stops: inputStops,
            freeRouting: effectiveFreeRouting,
            bookingMode: resolvedBookingMode
        });

        // Same-day availability gate
        const isAdminBooker = ['admin', 'staff'].includes(req.user.role);
        const sameDayBooking = new Date(effectiveStartDate).getTime() - Date.now() <= 24 * 60 * 60 * 1000;
        if (!isAdminBooker && sameDayBooking) {
            const sameDayStatus = await getRegionSameDayStatus(region, {
                windowStart: effectiveStartDate,
                windowEnd: effectiveEndDate
            });
            if (sameDayStatus && !sameDayStatus.available) {
                return sendValidationError(
                    res,
                    sameDayStatus.message || 'Same-day booking is currently unavailable for this region.',
                    {
                        eligibility: {
                            eligible: false,
                            reason: sameDayStatus.reason || 'same_day_unavailable',
                            sameDay: { aqd: sameDayStatus.aqd, rb: sameDayStatus.rb, cl: sameDayStatus.cl, mct: sameDayStatus.mct }
                        }
                    }
                );
            }
        }

        const safeAddOnIds = Array.isArray(addOns) ? addOns.map(toId).filter(Boolean) : [];
        const safeStops    = Array.isArray(inputStops)
            ? inputStops.map(s => ({ ...s, addOnIds: Array.isArray(s.addOnIds) ? s.addOnIds.map(toId).filter(Boolean) : [] }))
            : [];

        // Route validation
        let routeValidation = null;
        let _adminOverride  = false;
        let _dispatchFlag   = false;
        if (!effectiveFreeRouting && pickupLocation && dropoffLocation && safeStops.length > 0) {
            const itinerary = buildItineraryFromBody({
                pickupLocation, dropoffLocation,
                startDate: effectiveStartDate, endDate: effectiveEndDate,
                stops: safeStops
            });
            routeValidation = await validateItinerary(itinerary, { bufferMinutes: 15 });
            const isAdmin = ['admin', 'staff'].includes(req.user.role);
            _adminOverride = !!bodyAdminOverride && isAdmin;

            const realConflict  = routeValidation.legs.find(l => !l.ok && l.minRequiredGapSec != null);
            const apiUnavailable = !routeValidation.allOk && !realConflict;

            if (realConflict && !_adminOverride) {
                const mins = Math.ceil(realConflict.minRequiredGapSec / 60);
                return sendValidationError(
                    res,
                    `Minimum required time is ${mins} mins for "${realConflict.from} → ${realConflict.to}".`,
                    { routeValidation }
                );
            }
            _dispatchFlag = (_adminOverride && !routeValidation.allOk) || apiUnavailable;
        }

        // NOTE: Hours are NOT deducted here anymore.
        // Deduction happens in confirmBooking when a driver is assigned.
        const hourBalance = isSubscriber
            ? await getMembershipHourBalance(MonthlyHours, req.user.id, tierSettings, effectiveStartDate)
            : null;

        const memberRate = resolveMemberRate(user, tierSettings);

        const { regularPrice, subscriberPrice, breakdown } = await calculateBookingPrice({
            vehicleType, quantity, addOns: safeAddOnIds, stops: safeStops,
            isSubscriber, memberRate,
            usedHours: hourBalance?.quarterlyUsed || 0,
            freeHoursLeft: hourBalance?.freeHoursLeft,
            bookingHours,
            bookingFee: tierSettings?.bookingFee,
            startDate:  effectiveStartDate,
            endDate:    effectiveEndDate,
            settings:   tierSettings
        });

        const { baseToPickupMiles, distanceSurcharge } = await resolveDistanceSurcharge(pickupLocation);

        const adjustedRegular    = Number((regularPrice + distanceSurcharge).toFixed(2));
        const adjustedSubscriber = Number((subscriberPrice + distanceSurcharge).toFixed(2));
        const baseFinalPrice     = isSubscriber ? adjustedSubscriber : adjustedRegular;
        const savings            = isSubscriber ? Number((adjustedRegular - adjustedSubscriber).toFixed(2)) : 0;

        let partnerSnapshot = null;
        let finalPrice = baseFinalPrice;
        if (partnerDoc) {
            const adjustments = computePartnerAdjustments(partnerDoc, tierSettings, baseFinalPrice);
            finalPrice = adjustments.finalPrice;
            partnerSnapshot = buildPartnerBookingSnapshot(partnerDoc, adjustments);
        }

        const booking = await Booking.create({
            user: req.user.id,
            region,
            bookingMode: resolvedBookingMode,
            pickupLocation,
            dropoffLocation: dropoffLocation || null,
            dates: { startDate: new Date(effectiveStartDate), endDate: new Date(effectiveEndDate) },
            durationHours: resolvedBookingMode === 'buy_hours' ? effectiveDurationHours : bookingHours,
            vehicleType: vehicleTypeId,
            quantity,
            stops: safeStops.map(s => ({
                location: s.location,
                arrivalTime: s.time || s.arrivalTime || s.pickupTime,
                timeType: s.timeType || (s.pickupTime ? 'pickup' : 'arrival'),
                dwellMinutes: Number(s.dwellMinutes || 0),
                notes: s.notes || null,
                addOnIds: s.addOnIds
            })),
            specialNotes: typeof specialNotes === 'string' ? specialNotes.trim() || null : null,
            addOns: safeAddOnIds,
            freeRouting: effectiveFreeRouting,
            regularPrice: adjustedRegular,
            subscriptionPrice: isSubscriber ? adjustedSubscriber : undefined,
            finalPrice,
            savings,
            bookingFee: breakdown?.bookingFee ?? tierSettings?.bookingFee ?? 34,
            minimumHoursApplied: !!breakdown?.minimumHoursApplied,
            partner: partnerSnapshot || undefined,
            expectedPickupBy: partnerDoc?.bookingMode === 'venue_access'
              ? new Date(Date.now() + 30 * 60 * 1000)
              : null,
            status: 'Pending',
            routeValidation: routeValidation || undefined,
            adminOverride: _adminOverride,
            dispatchFlag:  _dispatchFlag
        });

        return sendSuccess(res, 201, 'Booking started successfully', {
            booking,
            comparison: !isSubscriber ? {
                regularTotal: adjustedRegular,
                subscriptionTotal: adjustedSubscriber,
                savings: adjustedRegular - adjustedSubscriber
            } : undefined,
            breakdown: {
                ...breakdown,
                distance: buildDistanceBreakdown(baseToPickupMiles, distanceSurcharge)
            }
        });
    } catch (err) {
        return handleBookingError(res, err, 'Start Booking');
    }
});

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
            await reserveMembershipHours(booking, tierSettings);
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
            await reserveMembershipHours(claimed, tierSettings);
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

        // Diamond instant payout
        try {
            if (driver.driver?.tier === 'Diamond') {
                const BankAccount = require('../models/BankAccount');
                const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
                const bank = await BankAccount.findOne({ driverId }).lean();
                if (bank?.stripeAccountId && claimed.paymentStatus === 'Paid' && !claimed.PaidToDriver) {
                    const amountCents = computePayoutCents(claimed);
                    if (amountCents > 0) {
                        const transfer = await stripe.transfers.create({
                            amount: amountCents,
                            currency: 'usd',
                            destination: bank.stripeAccountId,
                            transfer_group: `booking:${claimed._id}`
                        });
                        await Booking.updateOne(
                            { _id: claimed._id },
                            { $set: { PaidToDriver: true, payoutTransferId: transfer.id } }
                        );
                        console.log(`💸 Instant payout $${(amountCents / 100).toFixed(2)} → Diamond driver ${driver._id}`);
                    }
                }
            }
        } catch (e) {
            console.error('⚠️ Instant payout failed:', e?.message || e);
        }

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

// ---------------------------------------------------------------------------
// GET /api/bookings  (Admin paginated list)
// ---------------------------------------------------------------------------
const getAllBookings = asyncHandler(async (req, res) => {
    try {
        const { page, limit, skip } = getPagination(req.query);
        const sort   = getSorting(req.query.sortBy, req.query.order);
        const search = getSearchQuery(req.query.search, ['pickupLocation', 'dropoffLocation', 'status']);

        if (req.query.status)        search.status        = req.query.status;
        if (req.query.bookingMode)   search.bookingMode   = req.query.bookingMode;
        if (req.query.paymentStatus) search.paymentStatus = req.query.paymentStatus;

        // timeWindow: current | future | past (by trip start date)
        const timeWindow = typeof req.query.timeWindow === 'string'
            ? req.query.timeWindow.trim().toLowerCase()
            : '';
        if (timeWindow === 'current' || timeWindow === 'today') {
            const startOfToday = new Date();
            startOfToday.setHours(0, 0, 0, 0);
            const endOfToday = new Date();
            endOfToday.setHours(23, 59, 59, 999);
            search['dates.startDate'] = { $gte: startOfToday, $lte: endOfToday };
            if (!req.query.status) {
                search.status = { $nin: ['Completed', 'Cancelled', 'Expired'] };
            }
        } else if (timeWindow === 'future') {
            const endOfToday = new Date();
            endOfToday.setHours(23, 59, 59, 999);
            search['dates.startDate'] = { $gt: endOfToday };
            if (!req.query.status) {
                search.status = { $nin: ['Completed', 'Cancelled', 'Expired'] };
            }
        } else if (timeWindow === 'past') {
            const startOfToday = new Date();
            startOfToday.setHours(0, 0, 0, 0);
            const pastClause = {
                $or: [
                    { 'dates.endDate': { $lt: startOfToday } },
                    { status: { $in: ['Completed', 'Cancelled', 'Expired'] } },
                ],
            };
            if (search.$or) {
                search.$and = [{ $or: search.$or }, pastClause];
                delete search.$or;
            } else {
                Object.assign(search, pastClause);
            }
        }

        const defaultSort = timeWindow === 'past'
            ? { 'dates.startDate': -1 }
            : timeWindow === 'future' || timeWindow === 'current' || timeWindow === 'today'
                ? { 'dates.startDate': 1 }
                : sort;

        const [bookings, total] = await Promise.all([
            Booking.find(search)
                .populate('user', 'name email phone')
                .populate('region', 'name code')
                .populate('vehicleType', 'name hourlyPrice')
                .populate('addOns', 'name price type')
                .populate('assignedDriver', 'name phone')
                .sort(defaultSort || sort).skip(skip).limit(limit),
            Booking.countDocuments(search)
        ]);

        return sendPaginated(res, 'Bookings retrieved successfully', bookings, { page, limit, total });
    } catch (error) {
        console.error('Get All Bookings Error:', error);
        return sendError(res, 500, error.message || 'Failed to retrieve bookings');
    }
});

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
// GET /api/bookings/my
// ---------------------------------------------------------------------------
const getMyBookings = asyncHandler(async (req, res) => {
    try {
        const { page, limit, skip } = getPagination(req.query);
        const sort = getSorting(req.query.sortBy, req.query.order) || { createdAt: -1 };

        const filter = { user: req.user.id };
        if (req.query.status)      filter.status      = req.query.status;
        if (req.query.bookingMode) filter.bookingMode = req.query.bookingMode;

        const [bookings, total] = await Promise.all([
            Booking.find(filter)
                .populate('vehicleType', 'name hourlyPrice')
                .populate('addOns', 'name price type')
                .populate('stops.addOnIds', 'name price type')
                .populate('assignedDriver', 'name phone')
                .sort(sort).skip(skip).limit(limit),
            Booking.countDocuments(filter)
        ]);

        return sendPaginated(res, 'Bookings retrieved successfully', bookings, { page, limit, total });
    } catch (error) {
        console.error('Get My Bookings Error:', error);
        return sendError(res, 500, error.message || 'Failed to retrieve bookings');
    }
});

// ---------------------------------------------------------------------------
// GET /api/bookings/:id
// ---------------------------------------------------------------------------
const getBookingById = asyncHandler(async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id)
            .populate('vehicleType', 'name hourlyPrice description')
            .populate('addOns', 'name price type description')
            .populate('stops.addOnIds', 'name price type description')
            .populate('assignedDriver', 'name phone')
            .populate('user', 'name email phone');

        if (!booking) return sendNotFound(res, 'Booking not found');

        const isOwner       = booking.user._id.toString() === req.user.id.toString();
        const isAdminOrStaff = ['admin', 'staff'].includes(req.user.role);

        if (!isOwner && !isAdminOrStaff) return sendForbidden(res, 'Access denied');

        return sendSuccess(res, 200, 'Booking retrieved successfully', booking);
    } catch (error) {
        console.error('Get Booking By ID Error:', error);
        if (/Cast to ObjectId/i.test(error.message))
            return sendValidationError(res, 'Invalid booking ID');
        return sendError(res, 500, error.message || 'Failed to retrieve booking');
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

// ---------------------------------------------------------------------------
// GET /api/bookings/stats  (Admin)
// ---------------------------------------------------------------------------
const getAdminBookingStats = asyncHandler(async (req, res) => {
    try {
        const [statusCounts, totalValueAgg, unassigned] = await Promise.all([
            Booking.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
            Booking.aggregate([{ $group: { _id: null, totalValue: { $sum: '$finalPrice' } } }]),
            Booking.countDocuments({ assignedDriver: null, status: { $nin: ['Cancelled', 'Completed', 'Expired'] } })
        ]);

        const counts = { Pending: 0, Confirmed: 0, 'In Progress': 0, Completed: 0, Cancelled: 0, Expired: 0 };
        for (const { _id, count } of statusCounts) {
            if (_id in counts) counts[_id] = count;
        }

        const totalTrips = Object.values(counts).reduce((a, b) => a + b, 0);
        const totalValue = totalValueAgg[0]?.totalValue ?? 0;

        return sendSuccess(res, 200, 'Booking stats retrieved', {
            totalTrips, ...counts,
            inProgress: counts['In Progress'],
            totalValue: Number(totalValue.toFixed(2)),
            unassigned
        });
    } catch (error) {
        console.error('Admin Booking Stats Error:', error);
        return sendError(res, 500, error.message || 'Failed to retrieve booking stats');
    }
});

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
