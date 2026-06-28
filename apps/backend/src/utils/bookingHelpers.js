/**
 * utils/bookingHelpers.js
 * ---------------------------------------------------------------------------
 * Pure utility functions for the booking flow:
 *   - ObjectId sanitization
 *   - ISO UTC assertion
 *   - Input validation (basic + final) — reads min hours / notice from settings
 *   - Itinerary building + live ETA validation
 *   - Late-night hour split calculation
 *   - Price calculation (booking fee + late-night aware)
 * ---------------------------------------------------------------------------
 */

const mongoose = require('mongoose');
const AddOn = require('../models/AddOn');
const { getDriveSeconds } = require('../services/googleRoutesService');

// ---------------------------------------------------------------------------
// ObjectId helpers
// ---------------------------------------------------------------------------

/**
 * Convert a string to ObjectId if valid; return null otherwise.
 */
const toId = (v) =>
    mongoose.Types.ObjectId.isValid(v) ? new mongoose.Types.ObjectId(v) : null;

// ---------------------------------------------------------------------------
// Date / ISO helpers
// ---------------------------------------------------------------------------

const ISO_UTC_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?Z$/;

function assertIsoUtc(label, value) {
    if (typeof value !== 'string' || !ISO_UTC_REGEX.test(value)) {
        throw new Error(
            `Invalid ISO datetime for ${label}. Use UTC ISO like 2025-10-12T16:00:00.000Z`
        );
    }
}

// ---------------------------------------------------------------------------
// Late-night hour split
// ---------------------------------------------------------------------------

/**
 * Parse "HH:MM" string to total minutes since midnight (UTC).
 * Returns 0 on invalid input.
 */
function parseHHMM(str) {
    if (!str || typeof str !== 'string') return 0;
    const [h, m] = str.split(':').map(Number);
    return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
}

/**
 * Compute how many hours of a trip [startDate, endDate] fall inside the
 * late-night window on each calendar day.
 *
 * Times are interpreted as UTC. The backend stores lateNightStart / lateNightEnd
 * in UTC HH:MM (default 00:00–09:00 UTC).
 *
 * @param {Date|string} startDate  Trip start
 * @param {Date|string} endDate    Trip end
 * @param {string} lateNightStart  "HH:MM" UTC e.g. "00:00"
 * @param {string} lateNightEnd    "HH:MM" UTC e.g. "09:00"
 * @returns {{ lateNightHours: number, regularHours: number, totalHours: number }}
 */
function splitLateNightHours(startDate, endDate, lateNightStart = '00:00', lateNightEnd = '09:00') {
    const start = new Date(startDate).getTime();
    const end   = new Date(endDate).getTime();

    if (isNaN(start) || isNaN(end) || end <= start) {
        return { lateNightHours: 0, regularHours: 0, totalHours: 0 };
    }

    const oneDayMs  = 24 * 3600 * 1000;
    const lnStartMs = parseHHMM(lateNightStart) * 60 * 1000;
    const lnEndMs   = parseHHMM(lateNightEnd)   * 60 * 1000;

    let lateNightMs = 0;

    // Walk through each calendar day (UTC) that the trip touches
    const firstDayStart = new Date(start);
    firstDayStart.setUTCHours(0, 0, 0, 0);
    let dayStart = firstDayStart.getTime();

    while (dayStart < end) {
        const lnWindowStart = dayStart + lnStartMs;
        const lnWindowEnd   = dayStart + lnEndMs;

        const overlapStart = Math.max(start, lnWindowStart);
        const overlapEnd   = Math.min(end,   lnWindowEnd);

        if (overlapEnd > overlapStart) {
            lateNightMs += overlapEnd - overlapStart;
        }
        dayStart += oneDayMs;
    }

    const totalHours     = (end - start) / (3600 * 1000);
    const lateNightHours = lateNightMs   / (3600 * 1000);
    const regularHours   = totalHours - lateNightHours;

    return {
        lateNightHours: Number(lateNightHours.toFixed(6)),
        regularHours:   Number(regularHours.toFixed(6)),
        totalHours:     Number(totalHours.toFixed(6))
    };
}

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

/**
 * Basic booking validation — called by both previewBooking and startBooking.
 * Reads minBookingHours and sameDayNoticeHours from settings when provided;
 * falls back to hard defaults (3h / 3h) so existing callers without settings still work.
 *
 * @param {object} opts
 * @param {boolean} [opts.isSubscriber=false]  When true, skips min-hours + notice rules.
 * @param {object}  [opts.settings]            TierSettings doc for dynamic thresholds.
 * @returns {{ bookingHours: number, bookingDays: number }}
 * @throws {Error} on any validation failure
 */
function validateBookingInput({
    region, startDate, endDate, quantity,
    bookingMode = 'multi_day', durationHours,
    isSubscriber = false,
    settings = null
}) {
    assertIsoUtc('startDate', startDate);
    assertIsoUtc('endDate', endDate);

    if (!region) throw new Error('Region is required');

    const now   = new Date();
    const start = new Date(startDate);
    const end   = new Date(endDate);

    if (start < now) throw new Error('Start date must be in future');

    // Dynamic thresholds — fall back to defaults when settings not passed
    const noticeHours = Number(settings?.sameDayNoticeHours) || 3;
    const minHours    = Number(settings?.minBookingHours)    || 3;

    // Same-day notice rule (non-members only)
    if (!isSubscriber) {
        const noticeMs = noticeHours * 60 * 60 * 1000;
        const earliestPickup = new Date(now.getTime() + noticeMs);
        if (start < earliestPickup) {
            throw new Error(`Earliest pickup is ${noticeHours} hour${noticeHours !== 1 ? 's' : ''} from now`);
        }
    }

    const bookingHours = (end - start) / (1000 * 3600);
    const bookingDays  = (end - start) / (1000 * 3600 * 24);

    if (bookingMode === 'buy_hours') {
        if (!Number.isFinite(Number(durationHours)) || Number(durationHours) <= 0) {
            throw new Error('Duration must be a positive number of hours');
        }
    }

    // Min / max apply to both modes. Members are exempt ("Members = no minimums").
    if (!isSubscriber) {
        if (bookingHours < minHours) throw new Error(`Minimum booking is ${minHours} hours`);
        if (bookingDays > 7)         throw new Error('Maximum booking is 7 days');
    }

    // Quantity 1–5
    if (quantity != null && (!Number.isInteger(Number(quantity)) || Number(quantity) < 1 || Number(quantity) > 5)) {
        throw new Error('Quantity must be between 1 and 5');
    }

    return { bookingHours, bookingDays };
}

/**
 * Final validation — called only by startBooking before persisting.
 */
function validateFinalBookingInput({ pickupLocation, dropoffLocation, stops, freeRouting, bookingMode = 'multi_day' }) {
    if (!pickupLocation) throw new Error('Pickup location is required');

    if (bookingMode === 'buy_hours') {
        if (Array.isArray(stops)) {
            for (const s of stops) {
                if (!s.location) throw new Error('Each stop must have a location');
                const rawTime = s.time || s.arrivalTime || s.pickupTime;
                if (rawTime) assertIsoUtc(`stop.time (${s.location})`, rawTime);
                if (s.dwellMinutes != null && isNaN(Number(s.dwellMinutes))) {
                    throw new Error('dwellMinutes must be a number if provided');
                }
            }
        }
        return;
    }

    if (!freeRouting && !dropoffLocation) throw new Error('Dropoff location is required');

    if (!freeRouting) {
        if (!Array.isArray(stops) || stops.length === 0) {
            throw new Error('At least one stop is required if Free Routing is off');
        }
        for (const s of stops) {
            if (!s.location) throw new Error('Each stop must have a location');
            const rawTime = s.time || s.arrivalTime || s.pickupTime;
            if (rawTime) assertIsoUtc(`stop.time (${s.location})`, rawTime);
            if (s.dwellMinutes != null && isNaN(Number(s.dwellMinutes))) {
                throw new Error('dwellMinutes must be a number if provided');
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Itinerary
// ---------------------------------------------------------------------------

function buildItineraryFromBody(body) {
    const stops = (body.stops || []).map(s => {
        const rawTime = s.time || s.arrivalTime || s.pickupTime;
        const timeType =
            s.timeType === 'pickup' || s.timeType === 'arrival'
                ? s.timeType
                : s.pickupTime ? 'pickup' : 'arrival';

        return {
            location: s.location,
            arrivalTime: rawTime,
            dwellMinutes: Number(s.dwellMinutes || 0),
            timeType
        };
    });

    return {
        pickupLocation: body.pickupLocation,
        pickupTime: body.startDate,
        stops,
        dropoffLocation: body.dropoffLocation,
        dropoffTime: body.endDate
    };
}

async function validateItinerary(itin, { bufferMinutes = 15 } = {}) {
    const legs = [];
    const bufferSec = bufferMinutes * 60;

    const points = [
        { label: 'Pickup', loc: itin.pickupLocation, t: itin.pickupTime },
        ...itin.stops.map((s, idx) => ({
            label: `Stop ${idx + 1}`,
            loc: s.location,
            t: s.arrivalTime,
            dwell: s.dwellMinutes || 0
        })),
        { label: 'Drop-off', loc: itin.dropoffLocation, t: itin.dropoffTime }
    ];

    for (let i = 0; i < points.length - 1; i++) {
        const A = points[i];
        const B = points[i + 1];

        const tA = new Date(A.t).getTime();
        const tB = new Date(B.t).getTime();
        if (isNaN(tA) || isNaN(tB)) {
            return { allOk: false, bufferMinutes, legs: [], error: 'Invalid ISO in itinerary' };
        }

        const dwellA = Number(A.dwell || 0);
        const plannedGapSec = Math.max(0, Math.floor((tB - tA) / 1000) - dwellA * 60);

        const driveSec = await getDriveSeconds(A.loc, B.loc, new Date(tA).toISOString());
        if (driveSec == null) {
            legs.push({
                from: A.label,
                to: B.label,
                plannedGapSec,
                neededGapSec: null,
                minRequiredGapSec: null,
                ok: false,
                reason: 'ETA unavailable'
            });
            continue;
        }

        const minRequiredGapSec = driveSec + bufferSec;
        const ok = plannedGapSec >= minRequiredGapSec;

        legs.push({
            from: `${A.label} (${A.loc})`,
            to: `${B.label} (${B.loc})`,
            plannedGapSec,
            neededGapSec: driveSec,
            minRequiredGapSec,
            ok
        });
    }

    const allOk = legs.every(l => l.ok);
    return { allOk, bufferMinutes, legs };
}

// ---------------------------------------------------------------------------
// Pricing
// ---------------------------------------------------------------------------

/**
 * Resolve the locked membership hourly rate for a user.
 * Returns null for non-members so callers fall back to the vehicle rate.
 */
function resolveMemberRate(user, settings) {
    if (user?.subscriptionStatus !== 'subscriber') return null;
    const isFounder     = user?.subscriptionDetails?.plan === 'founder30';
    const membershipRate = Number(settings?.membershipRate) || 89;
    const founder30Rate  = Number(settings?.founder30Rate)  || 69;
    return isFounder ? founder30Rate : membershipRate;
}

/**
 * Calculate booking price for both regular and subscriber rates.
 * Now handles:
 *   - Booking fee (visible line item, from settings)
 *   - Late-night split: hours inside lateNightStart–lateNightEnd use vehicle rate for members
 *   - Min booking hours read from settings (enforced upstream in validateBookingInput)
 *
 * @param {{
 *   vehicleType,
 *   quantity,
 *   addOns: ObjectId[],
 *   stops?: Array<{ addOnIds?: ObjectId[] }>,
 *   isSubscriber: boolean,
 *   memberRate: number|null,
 *   usedHours: number,
 *   bookingHours: number,
 *   bookingFee?: number,        // from settings (default 34)
 *   startDate?: string|Date,    // for late-night calculation
 *   endDate?: string|Date,      // for late-night calculation
 *   settings?: object           // TierSettings doc
 * }} params
 * @returns {Promise<{ regularPrice, subscriberPrice, breakdown }>}
 */
async function calculateBookingPrice({
    vehicleType,
    quantity,
    addOns,
    stops,
    isSubscriber,
    memberRate,
    usedHours,
    bookingHours,
    bookingFee,
    startDate,
    endDate,
    settings
}) {
    const baseRate = Number(vehicleType?.hourlyPrice || 0);
    const qty      = Number(quantity) || 1;
    const hours    = Number(bookingHours) || 0;
    const totalBookedHours = hours * qty;

    // Merge top-level addOns + per-stop addOnIds into one deduplicated set
    const topLevelIds = Array.isArray(addOns) ? addOns.filter(Boolean) : [];
    const stopIds = Array.isArray(stops)
        ? stops.flatMap(s => Array.isArray(s.addOnIds) ? s.addOnIds.filter(Boolean) : [])
        : [];

    const allIds = [...new Set([...topLevelIds, ...stopIds].map(id => id.toString()))]
        .map(id => toId(id)).filter(Boolean);

    const validAddOns = allIds.length
        ? await AddOn.find({ _id: { $in: allIds } })
        : [];

    const paidAddOns  = validAddOns.filter(a => a.type === 'paid');
    const freeAddOns  = validAddOns.filter(a => a.type === 'free');
    const addOnsCost  = paidAddOns.reduce((sum, a) => sum + (a.price || 0), 0);

    // ── Booking fee (visible line item) ──────────────────────────────────────
    const effectiveBookingFee = typeof bookingFee === 'number' ? bookingFee
        : Number(settings?.bookingFee) || 34;

    // ── Regular price (non-member) ────────────────────────────────────────────
    let regularPrice = totalBookedHours * baseRate + addOnsCost + effectiveBookingFee;

    // ── Subscriber / member price ─────────────────────────────────────────────
    let subscriberPrice = regularPrice; // default: same as regular

    // Late-night split data (only relevant for members)
    let lateNightHours  = 0;
    let regularHoursForMember = totalBookedHours;
    let isLateNight     = false;

    if (isSubscriber && startDate && endDate && settings) {
        const split = splitLateNightHours(
            startDate, endDate,
            settings.lateNightStart || '00:00',
            settings.lateNightEnd   || '09:00'
        );
        lateNightHours        = split.lateNightHours * qty;
        regularHoursForMember = split.regularHours   * qty;
        isLateNight           = lateNightHours > 0;
    }

    if (isSubscriber) {
        const lockedRate = Number(memberRate) > 0 ? Number(memberRate) : baseRate;

        // Free hours (monthly quota) apply only to non-late-night portion
        const freeHoursLeft   = Math.max(0, (Number(settings?.membershipMonthlyHours) || 5) - (usedHours || 0));
        const freeHoursUsed   = Math.min(regularHoursForMember, freeHoursLeft);
        const billableRegular = Math.max(0, regularHoursForMember - freeHoursLeft);

        // Late-night hours always billed at vehicle (base) rate — no membership discount
        const memberPortion    = billableRegular * lockedRate;
        const lateNightPortion = lateNightHours  * baseRate;

        subscriberPrice = memberPortion + lateNightPortion + addOnsCost + effectiveBookingFee;

        return {
            regularPrice:   Number(regularPrice.toFixed(2)),
            subscriberPrice: Number(subscriberPrice.toFixed(2)),
            breakdown: {
                baseRate,
                memberRate: lockedRate,
                hours,
                qty,
                bookingFee: effectiveBookingFee,
                addOnsCost:     Number(addOnsCost.toFixed(2)),
                paidAddOns,
                freeAddOns,
                freeHoursUsed:  Number(freeHoursUsed.toFixed(4)),
                freeHoursLeft:  Number(Math.max(0, freeHoursLeft - regularHoursForMember).toFixed(4)),
                isLateNight,
                lateNightHours: Number(lateNightHours.toFixed(4)),
                regularMemberHours: Number(regularHoursForMember.toFixed(4)),
                lateNightNote: isLateNight
                    ? `${Number(lateNightHours.toFixed(2))}h billed at vehicle rate ($${baseRate}/hr); ${Number(regularHoursForMember.toFixed(2))}h at member rate ($${lockedRate}/hr)`
                    : null
            }
        };
    }

    // Non-member path (simpler)
    return {
        regularPrice:    Number(regularPrice.toFixed(2)),
        subscriberPrice: Number(regularPrice.toFixed(2)), // no discount
        breakdown: {
            baseRate,
            memberRate: null,
            hours,
            qty,
            bookingFee: effectiveBookingFee,
            addOnsCost:    Number(addOnsCost.toFixed(2)),
            paidAddOns,
            freeAddOns,
            freeHoursUsed:  0,
            freeHoursLeft:  0,
            isLateNight:    false,
            lateNightHours: 0,
            lateNightNote:  null
        }
    };
}

module.exports = {
    toId,
    assertIsoUtc,
    validateBookingInput,
    validateFinalBookingInput,
    buildItineraryFromBody,
    validateItinerary,
    splitLateNightHours,
    resolveMemberRate,
    calculateBookingPrice
};
