// src/models/TierSettings.js
// Singleton document — always one record. Admin-adjustable tier + pricing policy.
// All backend calculations reference this document so admins can update
// any number without code changes.

const mongoose = require('mongoose');

const tierConfigSchema = new mongoose.Schema({
    payoutRate: { type: Number, required: true },       // e.g. 0.40 (40%)
    keepsBookingFee: { type: Boolean, required: true }, // true = driver keeps the booking fee
    vehicleCostDeduction: { type: Number, default: 0 }, // per-trip deduction charged to driver ($)
    companyCostAbsorption: { type: Number, default: 0 } // additional internal company cost ($)
}, { _id: false });

const tierSettingsSchema = new mongoose.Schema({

    // ── Booking Rules ─────────────────────────────────────────────────────────
    bookingFee: { type: Number, default: 34 },
    // Shown as a line item to the customer on every booking (non-member and member alike).
    // Admin-adjustable.

    minBookingHours: { type: Number, default: 3 },
    // Non-members must book at least this many hours. Members are exempt.

    sameDayNoticeHours: { type: Number, default: 3 },
    // Non-members must give this many hours of notice before pickup.
    // E.g. if current time is 8:00 PM and sameDayNoticeHours = 3, earliest pickup is 11:00 PM.

    cancellationWindowHours: { type: Number, default: 3 },
    // Customer cancellations at least this many hours before pickup restore
    // reserved membership hours. Later cancellations / no-shows keep them.

    // ── Late-Night Window ─────────────────────────────────────────────────────
    // During this window, membership rates do NOT apply for members.
    // Only the hours inside the window switch to the standard vehicle rate.
    lateNightStart: { type: String, default: '00:00' }, // HH:MM US Eastern
    lateNightEnd:   { type: String, default: '09:00' }, // HH:MM US Eastern

    // ── Membership / Founder 30 Rates ─────────────────────────────────────────
    membershipRate: { type: Number, default: 89 },  // $/hr for Standard members (any vehicle)
    founder30Rate:  { type: Number, default: 69 },  // $/hr for invite-only Founder 30 members

    membershipMonthlyHours: { type: Number, default: 5 },
    // Prepaid hours included each month. 5 hrs/month × 3 months = 15 hrs/quarter.

    membershipBillingCycle: {
        type: String,
        enum: ['monthly', 'quarterly', 'annually'],
        default: 'quarterly'
    },

    // ── Partner Settings ──────────────────────────────────────────────────────
    venueCommissionPct:     { type: Number, default: 0 }, // % of booking revenue paid to venue partner
    affiliateCommissionPct: { type: Number, default: 0 }, // % of booking revenue paid to affiliate

    // ── Same-Day AQD Formula ─────────────────────────────────────────────────
    sameDayMCT:      { type: Number, default: 2 },      // Minimum Coverage Threshold
    sameDayMinRB:    { type: Number, default: 2 },      // Floor for Reserved Buffer
    sameDayRBRatio:  { type: Number, default: 0.25 },   // Reserved Buffer = ceil(AQD × ratio)

    // ── Driver Tier Payout Config ─────────────────────────────────────────────
    tiers: {
        'S-Level': {
            type: tierConfigSchema,
            default: () => ({ payoutRate: 0.30, keepsBookingFee: false, vehicleCostDeduction: 50, companyCostAbsorption: 100 })
        },
        'Pro': {
            type: tierConfigSchema,
            default: () => ({ payoutRate: 0.40, keepsBookingFee: true, vehicleCostDeduction: 0, companyCostAbsorption: 0 })
        },
        'Diamond': {
            type: tierConfigSchema,
            default: () => ({ payoutRate: 0.40, keepsBookingFee: true, vehicleCostDeduction: 0, companyCostAbsorption: 0 })
        }
    }

}, { timestamps: true });

module.exports = mongoose.model('TierSettings', tierSettingsSchema);
