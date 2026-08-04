/**
 * controllers/booking/quoteController.js
 * ---------------------------------------------------------------------------
 * Pricing a trip and creating it: POST /api/bookings/preview and
 * POST /api/bookings/start. Moved verbatim out of the original
 * controllers/bookingController.js.
 *
 * Hour deduction does NOT happen here — see dispatchController.js.
 * ---------------------------------------------------------------------------
 */

const asyncHandler = require('express-async-handler');

const Booking = require('../../models/Booking');
const User = require('../../models/User');
const VehicleType = require('../../models/Vehicle');
const MonthlyHours = require('../../models/MonthlyHours');
const TierSettings = require('../../models/TierSettings');

const {
    sendSuccess,
    sendValidationError,
    sendNotFound
} = require('../../utils/responseHelper');
const { getRegionSameDayStatus } = require('../../services/availabilityService');
const {
    toId,
    validateBookingInput,
    validateFinalBookingInput,
    buildItineraryFromBody,
    validateItinerary,
    resolveMemberRate,
    calculateBookingPrice
} = require('../../utils/bookingHelpers');
const { getMembershipHourBalance } = require('../../utils/membershipHours');
const { buildMembershipPayoutSnapshot } = require('../../services/membershipReservationService');
const {
    resolveBookingPartner,
    computePartnerAdjustments,
    buildPartnerBookingSnapshot,
} = require('../../services/partnerService');
const {
    buildDistanceBreakdown,
    resolveDistanceSurcharge,
    handleBookingError,
} = require('./shared');

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
            membershipPayout: isSubscriber
              ? buildMembershipPayoutSnapshot(breakdown)
              : undefined,
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

module.exports = {
    previewBooking,
    startBooking,
};
