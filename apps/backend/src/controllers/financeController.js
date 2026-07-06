/**
 * controllers/financeController.js
 * ---------------------------------------------------------------------------
 * Admin-only financial reporting: company revenue vs. driver payouts.
 *
 * "Company revenue" = what's left after paying drivers, minus any internal
 * vehicle/company costs the business absorbs (TierSettings.tiers[tier].companyCostAbsorption).
 * This is the piece from Phase 3 of the spec ("Company revenue calculations")
 * that wasn't previously exposed as its own report.
 * ---------------------------------------------------------------------------
 */

const asyncHandler = require('express-async-handler');
const Booking = require('../models/Booking');
const User = require('../models/User');
const TierSettings = require('../models/TierSettings');
const { computePayoutBreakdown } = require('../services/payoutUtils');
const { sendSuccess, sendError, sendValidationError } = require('../utils/responseHelper');

// ---------------------------------------------------------------------------
// GET /api/admin/finance/revenue
// Query: startDate?, endDate? (ISO), status? (default: Completed)
// ---------------------------------------------------------------------------
const getCompanyRevenueReport = asyncHandler(async (req, res) => {
    try {
        const { startDate, endDate, status = 'Completed' } = req.query;

        const filter = { status };
        if (startDate || endDate) {
            filter['dates.startDate'] = {};
            if (startDate) filter['dates.startDate'].$gte = new Date(startDate);
            if (endDate)   filter['dates.startDate'].$lte = new Date(endDate);
        }

        const [bookings, settings] = await Promise.all([
            Booking.find(filter)
                .select('finalPrice bookingFee assignedDriver tip status dates.startDate')
                .lean(),
            TierSettings.findOne().lean()
        ]);

        const driverIds = [...new Set(
            bookings.map(b => b.assignedDriver).filter(Boolean).map(id => id.toString())
        )];

        const drivers = driverIds.length
            ? await User.find({ _id: { $in: driverIds } }).select('name driver.tier').lean()
            : [];
        const driverMap = new Map(drivers.map(d => [d._id.toString(), d]));

        let totalRevenue        = 0; // gross: sum of finalPrice
        let totalDriverPayouts  = 0;
        let totalCompanyCost    = 0; // companyCostAbsorption across trips
        let totalTips           = 0; // pass-through to driver, not company revenue
        let totalBookingFees    = 0;
        const tierBreakdown     = { 'S-Level': { trips: 0, revenue: 0, driverPayouts: 0, companyRevenue: 0 },
                                     'Pro':     { trips: 0, revenue: 0, driverPayouts: 0, companyRevenue: 0 },
                                     'Diamond': { trips: 0, revenue: 0, driverPayouts: 0, companyRevenue: 0 },
                                     'Unassigned': { trips: 0, revenue: 0, driverPayouts: 0, companyRevenue: 0 } };

        for (const booking of bookings) {
            const driver = booking.assignedDriver
                ? driverMap.get(booking.assignedDriver.toString())
                : null;
            const tierKey = driver?.driver?.tier || 'Unassigned';

            const line = computePayoutBreakdown(booking, driver, settings);

            totalRevenue       += line.finalPrice;
            totalDriverPayouts += line.driverPayout;
            totalCompanyCost   += line.companyCostAbsorption;
            totalTips          += Number(booking.tip) || 0;
            totalBookingFees   += Number(booking.bookingFee) || 0;

            const bucket = tierBreakdown[tierKey] || tierBreakdown['Unassigned'];
            bucket.trips++;
            bucket.revenue        += line.finalPrice;
            bucket.driverPayouts  += line.driverPayout;
            bucket.companyRevenue += line.companyRevenue;
        }

        const companyNetRevenue = Number((totalRevenue - totalDriverPayouts - totalCompanyCost).toFixed(2));

        // Round bucket numbers for display
        for (const key of Object.keys(tierBreakdown)) {
            const b = tierBreakdown[key];
            b.revenue        = Number(b.revenue.toFixed(2));
            b.driverPayouts  = Number(b.driverPayouts.toFixed(2));
            b.companyRevenue = Number(b.companyRevenue.toFixed(2));
        }

        return sendSuccess(res, 200, 'Company revenue report generated', {
            range: { startDate: startDate || null, endDate: endDate || null, status },
            totalTrips: bookings.length,
            totalRevenue:       Number(totalRevenue.toFixed(2)),
            totalBookingFees:   Number(totalBookingFees.toFixed(2)),
            totalDriverPayouts: Number(totalDriverPayouts.toFixed(2)),
            totalCompanyCostAbsorption: Number(totalCompanyCost.toFixed(2)),
            totalTips:          Number(totalTips.toFixed(2)),
            companyNetRevenue,
            byTier: tierBreakdown
        });
    } catch (error) {
        console.error('getCompanyRevenueReport Error:', error);
        return sendError(res, 500, error.message || 'Failed to generate company revenue report');
    }
});

// ---------------------------------------------------------------------------
// GET /api/admin/finance/bookings/:id/payout-breakdown
// Full line-item payout math for a single booking (fare split, booking fee,
// vehicle cost deduction, company cost absorption, company revenue).
// ---------------------------------------------------------------------------
const getBookingPayoutBreakdown = asyncHandler(async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id).lean();
        if (!booking) return sendValidationError(res, 'Booking not found');

        const [driver, settings] = await Promise.all([
            booking.assignedDriver
                ? User.findById(booking.assignedDriver).select('name driver.tier').lean()
                : null,
            TierSettings.findOne().lean()
        ]);

        const breakdown = computePayoutBreakdown(booking, driver, settings);

        return sendSuccess(res, 200, 'Payout breakdown calculated', {
            bookingId: booking._id,
            driver: driver ? { id: driver._id, name: driver.name, tier: driver.driver?.tier } : null,
            ...breakdown
        });
    } catch (error) {
        console.error('getBookingPayoutBreakdown Error:', error);
        return sendError(res, 500, error.message || 'Failed to compute payout breakdown');
    }
});

module.exports = { getCompanyRevenueReport, getBookingPayoutBreakdown };
