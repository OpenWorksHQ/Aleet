// src/controllers/tierController.js

const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const User = require('../models/User');
const Booking = require('../models/Booking');
const TierSettings = require('../models/TierSettings');
const { sendSuccess, sendError, sendValidationError } = require('../utils/responseHelper');

const VALID_TIERS = ['S-Level', 'Pro', 'Diamond'];

// Singleton helper — creates settings doc on first call if it doesn't exist.
async function getOrCreateSettings() {
    let settings = await TierSettings.findOne();
    if (!settings) settings = await TierSettings.create({});
    return settings;
}

// Validate HH:MM string
function isValidTimeString(val) {
    return typeof val === 'string' && /^\d{2}:\d{2}$/.test(val);
}

// ---------------------------------------------------------------------------
// GET /api/admin/tiers/performance
// Driver Tier Performance table + tier count cards
// ---------------------------------------------------------------------------
const getDriverTierPerformance = asyncHandler(async (req, res) => {
    try {
        const { tier, page = 1, limit = 20, sortBy = 'totalEarnings', order = 'desc' } = req.query;

        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
        const skip = (pageNum - 1) * limitNum;

        const driverFilter = { role: 'driver' };
        if (tier && VALID_TIERS.includes(tier)) {
            driverFilter['driver.tier'] = tier;
        }

        const earningsAgg = await Booking.aggregate([
            { $match: { status: 'Completed', assignedDriver: { $ne: null } } },
            {
                $group: {
                    _id: '$assignedDriver',
                    totalTrips: { $sum: 1 },
                    totalRevenue: { $sum: '$finalPrice' }
                }
            }
        ]);

        const earningsMap = new Map();
        for (const e of earningsAgg) {
            earningsMap.set(e._id.toString(), { totalTrips: e.totalTrips, totalRevenue: e.totalRevenue });
        }

        const settings = await getOrCreateSettings();

        const [drivers, total, tierCounts] = await Promise.all([
            User.find(driverFilter)
                .select('name email driver.tier driver.driverRating')
                .lean(),
            User.countDocuments(driverFilter),
            User.aggregate([
                { $match: { role: 'driver' } },
                { $group: { _id: '$driver.tier', count: { $sum: 1 } } }
            ])
        ]);

        const enriched = drivers.map(d => {
            const stats = earningsMap.get(d._id.toString()) || { totalTrips: 0, totalRevenue: 0 };
            const tierCfg = settings.tiers?.[d.driver?.tier];
            const payoutRate = tierCfg?.payoutRate ?? 0.30;
            const bookingFeeEarned = tierCfg?.keepsBookingFee
                ? stats.totalTrips * (settings.bookingFee ?? 34)
                : 0;
            const totalEarnings = Number(((stats.totalRevenue * payoutRate) + bookingFeeEarned).toFixed(2));

            return {
                _id: d._id,
                name: d.name,
                tier: d.driver?.tier || null,
                rating: d.driver?.driverRating ?? 0,
                totalTrips: stats.totalTrips,
                totalEarnings
            };
        });

        const sortDir = order === 'asc' ? 1 : -1;
        const sortField = ['totalTrips', 'totalEarnings', 'rating'].includes(sortBy) ? sortBy : 'totalEarnings';
        enriched.sort((a, b) => sortDir * (a[sortField] - b[sortField]));

        const paginated = enriched.slice(skip, skip + limitNum);

        const counts = { 'S-Level': 0, Pro: 0, Diamond: 0 };
        for (const { _id, count } of tierCounts) {
            if (_id in counts) counts[_id] = count;
        }

        return sendSuccess(res, 200, 'Driver tier performance retrieved', paginated, {
            tierCounts: counts,
            total,
            page: pageNum,
            limit: limitNum,
            pages: Math.ceil(total / limitNum)
        });
    } catch (error) {
        console.error('Get Driver Tier Performance Error:', error);
        return sendError(res, 500, error.message || 'Failed to retrieve tier performance');
    }
});

// ---------------------------------------------------------------------------
// GET /api/admin/tiers/settings
// Returns full admin pricing & rules config (single source of truth)
// ---------------------------------------------------------------------------
const getTierSettings = asyncHandler(async (req, res) => {
    try {
        const settings = await getOrCreateSettings();
        return sendSuccess(res, 200, 'Pricing settings retrieved', settings);
    } catch (error) {
        console.error('Get Tier Settings Error:', error);
        return sendError(res, 500, error.message || 'Failed to retrieve settings');
    }
});

// ---------------------------------------------------------------------------
// PATCH /api/admin/tiers/settings
// Update any pricing/rules field. All fields are optional (partial update).
//
// Body fields:
//   bookingFee, minBookingHours, sameDayNoticeHours,
//   lateNightStart (HH:MM), lateNightEnd (HH:MM),
//   membershipRate, founder30Rate,
//   membershipMonthlyHours, membershipBillingCycle,
//   venueCommissionPct, affiliateCommissionPct,
//   sameDayMCT, sameDayMinRB, sameDayRBRatio,
//   tiers: { 'S-Level': { payoutRate, keepsBookingFee, vehicleCostDeduction, companyCostAbsorption }, ... }
// ---------------------------------------------------------------------------
const updateTierSettings = asyncHandler(async (req, res) => {
    try {
        const {
            bookingFee, minBookingHours, sameDayNoticeHours,
            lateNightStart, lateNightEnd,
            membershipRate, founder30Rate,
            membershipMonthlyHours, membershipBillingCycle,
            venueCommissionPct, affiliateCommissionPct,
            sameDayMCT, sameDayMinRB, sameDayRBRatio,
            tiers
        } = req.body;

        const settings = await getOrCreateSettings();

        // ── Booking Rules ───────────────────────────────────────────────────
        if (bookingFee !== undefined) {
            if (typeof bookingFee !== 'number' || bookingFee < 0)
                return sendValidationError(res, 'bookingFee must be a non-negative number');
            settings.bookingFee = bookingFee;
        }

        if (minBookingHours !== undefined) {
            if (typeof minBookingHours !== 'number' || minBookingHours < 1)
                return sendValidationError(res, 'minBookingHours must be a number >= 1');
            settings.minBookingHours = minBookingHours;
        }

        if (sameDayNoticeHours !== undefined) {
            if (typeof sameDayNoticeHours !== 'number' || sameDayNoticeHours < 0)
                return sendValidationError(res, 'sameDayNoticeHours must be a non-negative number');
            settings.sameDayNoticeHours = sameDayNoticeHours;
        }

        // ── Late-Night Window ────────────────────────────────────────────────
        if (lateNightStart !== undefined) {
            if (!isValidTimeString(lateNightStart))
                return sendValidationError(res, 'lateNightStart must be in HH:MM format (e.g. "00:00")');
            settings.lateNightStart = lateNightStart;
        }

        if (lateNightEnd !== undefined) {
            if (!isValidTimeString(lateNightEnd))
                return sendValidationError(res, 'lateNightEnd must be in HH:MM format (e.g. "09:00")');
            settings.lateNightEnd = lateNightEnd;
        }

        // ── Membership Rates ─────────────────────────────────────────────────
        if (membershipRate !== undefined) {
            if (typeof membershipRate !== 'number' || membershipRate < 0)
                return sendValidationError(res, 'membershipRate must be a non-negative number');
            settings.membershipRate = membershipRate;
        }

        if (founder30Rate !== undefined) {
            if (typeof founder30Rate !== 'number' || founder30Rate < 0)
                return sendValidationError(res, 'founder30Rate must be a non-negative number');
            settings.founder30Rate = founder30Rate;
        }

        if (membershipMonthlyHours !== undefined) {
            if (typeof membershipMonthlyHours !== 'number' || membershipMonthlyHours < 1)
                return sendValidationError(res, 'membershipMonthlyHours must be a number >= 1');
            settings.membershipMonthlyHours = membershipMonthlyHours;
        }

        if (membershipBillingCycle !== undefined) {
            const allowed = ['monthly', 'quarterly', 'annually'];
            if (!allowed.includes(membershipBillingCycle))
                return sendValidationError(res, `membershipBillingCycle must be one of: ${allowed.join(', ')}`);
            settings.membershipBillingCycle = membershipBillingCycle;
        }

        // ── Partner Settings ──────────────────────────────────────────────────
        if (venueCommissionPct !== undefined) {
            if (typeof venueCommissionPct !== 'number' || venueCommissionPct < 0 || venueCommissionPct > 100)
                return sendValidationError(res, 'venueCommissionPct must be between 0 and 100');
            settings.venueCommissionPct = venueCommissionPct;
        }

        if (affiliateCommissionPct !== undefined) {
            if (typeof affiliateCommissionPct !== 'number' || affiliateCommissionPct < 0 || affiliateCommissionPct > 100)
                return sendValidationError(res, 'affiliateCommissionPct must be between 0 and 100');
            settings.affiliateCommissionPct = affiliateCommissionPct;
        }

        // ── Same-Day AQD Formula ──────────────────────────────────────────────
        if (sameDayMCT !== undefined) {
            if (typeof sameDayMCT !== 'number' || sameDayMCT < 1)
                return sendValidationError(res, 'sameDayMCT must be a number >= 1');
            settings.sameDayMCT = sameDayMCT;
        }

        if (sameDayMinRB !== undefined) {
            if (typeof sameDayMinRB !== 'number' || sameDayMinRB < 0)
                return sendValidationError(res, 'sameDayMinRB must be a non-negative number');
            settings.sameDayMinRB = sameDayMinRB;
        }

        if (sameDayRBRatio !== undefined) {
            if (typeof sameDayRBRatio !== 'number' || sameDayRBRatio < 0 || sameDayRBRatio > 1)
                return sendValidationError(res, 'sameDayRBRatio must be a number between 0 and 1');
            settings.sameDayRBRatio = sameDayRBRatio;
        }

        // ── Driver Tier Config ────────────────────────────────────────────────
        if (tiers && typeof tiers === 'object') {
            for (const tierName of Object.keys(tiers)) {
                if (!VALID_TIERS.includes(tierName))
                    return sendValidationError(res, `Invalid tier: "${tierName}". Must be one of: ${VALID_TIERS.join(', ')}`);

                const cfg = tiers[tierName];

                if (cfg.payoutRate !== undefined) {
                    if (typeof cfg.payoutRate !== 'number' || cfg.payoutRate < 0 || cfg.payoutRate > 1)
                        return sendValidationError(res, `${tierName}.payoutRate must be between 0 and 1`);
                    settings.tiers[tierName].payoutRate = cfg.payoutRate;
                }
                if (cfg.keepsBookingFee !== undefined) {
                    settings.tiers[tierName].keepsBookingFee = !!cfg.keepsBookingFee;
                }
                if (cfg.vehicleCostDeduction !== undefined) {
                    settings.tiers[tierName].vehicleCostDeduction = Number(cfg.vehicleCostDeduction);
                }
                if (cfg.companyCostAbsorption !== undefined) {
                    settings.tiers[tierName].companyCostAbsorption = Number(cfg.companyCostAbsorption);
                }
            }
        }

        settings.markModified('tiers');
        await settings.save();

        return sendSuccess(res, 200, 'Pricing settings updated', settings);
    } catch (error) {
        console.error('Update Tier Settings Error:', error);
        return sendError(res, 500, error.message || 'Failed to update settings');
    }
});

module.exports = { getDriverTierPerformance, getTierSettings, updateTierSettings };
