/**
 * controllers/adminMembershipController.js
 * ---------------------------------------------------------------------------
 * Admin-only endpoints for membership management:
 *   - Invite / revoke Founder 30 access for a customer
 *   - List all active subscribers with balance and billing info
 *   - Manual overage charge trigger
 *   - Update a member's subscription balance (admin override)
 * ---------------------------------------------------------------------------
 */

const asyncHandler = require('express-async-handler');
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const User         = require('../models/User');
const MonthlyHours = require('../models/MonthlyHours');
const TierSettings = require('../models/TierSettings');
const { getQuarterlyUsedHours } = require('../utils/membershipHours');
const {
    sendSuccess,
    sendError,
    sendValidationError,
    sendNotFound
} = require('../utils/responseHelper');
const { chargeOverage } = require('./savedCardController');

// ---------------------------------------------------------------------------
// PATCH /api/admin/memberships/invite-founder30/:userId
// Grant or revoke Founder 30 access for a customer.
// Body: { invited: true | false }
// ---------------------------------------------------------------------------
const inviteFounder30 = asyncHandler(async (req, res) => {
    try {
        const { userId } = req.params;
        const { invited } = req.body;

        if (typeof invited !== 'boolean')
            return sendValidationError(res, '`invited` must be a boolean (true or false)');

        const user = await User.findById(userId);
        if (!user) return sendNotFound(res, 'User not found');
        if (user.role !== 'customer')
            return sendValidationError(res, 'Founder 30 invitations are for customers only');

        user.founder30Invited = invited;

        // If revoking access and user is currently on founder30 plan, cancel their membership
        if (!invited && user.subscriptionDetails?.plan === 'founder30' && user.subscriptionStatus === 'subscriber') {
            user.subscriptionStatus = 'cancelled';
            user.subscriptionDetails.isActive          = false;
            user.subscriptionDetails.cancelledAt       = new Date();
            user.subscriptionDetails.cancellationReason = 'Founder 30 invitation revoked by admin';
        }

        await user.save();

        return sendSuccess(res, 200, invited ? 'Founder 30 access granted' : 'Founder 30 access revoked', {
            userId:           user._id,
            name:             user.name,
            email:            user.email,
            founder30Invited: user.founder30Invited,
            subscriptionStatus: user.subscriptionStatus
        });
    } catch (error) {
        console.error('inviteFounder30 Error:', error);
        return sendError(res, 500, error.message || 'Failed to update Founder 30 invitation');
    }
});

// ---------------------------------------------------------------------------
// GET /api/admin/memberships
// List all members with balance, plan, billing, and overage info.
// Query: plan=standard|founder30|all, page, limit
// ---------------------------------------------------------------------------
const listMemberships = asyncHandler(async (req, res) => {
    try {
        const { plan = 'all', page = 1, limit = 20 } = req.query;

        const pageNum  = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
        const skip     = (pageNum - 1) * limitNum;

        const filter = { subscriptionStatus: 'subscriber' };
        if (plan !== 'all' && ['standard', 'founder30'].includes(plan)) {
            filter['subscriptionDetails.plan'] = plan;
        }

        const [users, total, settings] = await Promise.all([
            User.find(filter)
                .select('name email phone subscriptionStatus subscriptionDetails founder30Invited')
                .sort({ 'subscriptionDetails.startDate': -1 })
                .skip(skip)
                .limit(limitNum),
            User.countDocuments(filter),
            TierSettings.findOne()
        ]);

        const monthlyHours    = Number(settings?.membershipMonthlyHours) || 5;
        const quarterlyHours  = monthlyHours * 3;

        // For each user, sum their hours used this quarter (batched query — see
        // utils/membershipHours.js for why this must be a 3-month pooled sum,
        // not just the current month's usage).
        const { quarterYearMonths } = require('../utils/membershipHours');
        const monthsToSum = quarterYearMonths();

        const userIds   = users.map(u => u._id);
        const hoursData = await MonthlyHours.find({
            user:      { $in: userIds },
            yearMonth: { $in: monthsToSum }
        }).lean();

        const hoursMap = {};
        for (const h of hoursData) {
            const uid = h.user.toString();
            hoursMap[uid] = (hoursMap[uid] || 0) + (h.totalHoursUsed || 0);
        }

        // Get saved card last4 for each user (batch Stripe calls)
        const enriched = await Promise.all(users.map(async (user) => {
            const isFounder  = user.subscriptionDetails?.plan === 'founder30';
            const ratePerHour = isFounder
                ? (Number(settings?.founder30Rate)  || 69)
                : (Number(settings?.membershipRate) || 89);

            const usedHours      = hoursMap[user._id.toString()] || 0;
            const hoursRemaining = Math.max(0, quarterlyHours - usedHours);
            const overageHours   = Math.max(0, usedHours - quarterlyHours);

            let savedCardLast4 = null;
            try {
                const customerId = user.subscriptionDetails?.stripeCustomerId;
                if (customerId) {
                    const customer = await stripe.customers.retrieve(customerId);
                    const defaultPmId = customer.invoice_settings?.default_payment_method;
                    if (defaultPmId) {
                        const pm = await stripe.paymentMethods.retrieve(defaultPmId);
                        savedCardLast4 = pm?.card?.last4 || null;
                    }
                }
            } catch (_) { /* non-fatal */ }

            return {
                userId:             user._id,
                name:               user.name,
                email:              user.email,
                phone:              user.phone,
                plan:               user.subscriptionDetails?.plan || 'standard',
                isFounder30:        isFounder,
                ratePerHour,
                quarterlyHours,
                hoursUsed:          Number(usedHours.toFixed(4)),
                hoursRemaining:     Number(hoursRemaining.toFixed(4)),
                overageHours:       Number(overageHours.toFixed(4)),
                overageCharge:      Number((overageHours * ratePerHour).toFixed(2)),
                nextBillingDate:    user.subscriptionDetails?.nextBillingDate || null,
                startDate:          user.subscriptionDetails?.startDate || null,
                savedCardLast4
            };
        }));

        return sendSuccess(res, 200, 'Memberships retrieved', enriched, {
            total,
            page:  pageNum,
            limit: limitNum,
            pages: Math.ceil(total / limitNum)
        });
    } catch (error) {
        console.error('listMemberships Error:', error);
        return sendError(res, 500, error.message || 'Failed to retrieve memberships');
    }
});

// ---------------------------------------------------------------------------
// POST /api/admin/memberships/:userId/charge-overage
// Admin manually triggers an overage charge for a member.
// Body: { overageHours: number }
// ---------------------------------------------------------------------------
const adminChargeOverage = asyncHandler(async (req, res) => {
    try {
        const { userId } = req.params;
        const { overageHours } = req.body;

        if (!overageHours || Number(overageHours) <= 0)
            return sendValidationError(res, 'overageHours must be a positive number');

        const [user, settings] = await Promise.all([
            User.findById(userId),
            TierSettings.findOne()
        ]);
        if (!user) return sendNotFound(res, 'User not found');
        if (user.subscriptionStatus !== 'subscriber')
            return sendValidationError(res, 'User is not an active subscriber');

        const paymentIntent = await chargeOverage({
            userId,
            overageHours: Number(overageHours),
            user,
            tierSettings: settings
        });

        return sendSuccess(res, 200, 'Overage charged successfully', {
            userId,
            overageHours: Number(overageHours),
            amountCharged: paymentIntent ? (paymentIntent.amount / 100) : 0,
            paymentIntentId: paymentIntent?.id || null
        });
    } catch (error) {
        console.error('adminChargeOverage Error:', error);
        if (error.type === 'StripeCardError')
            return sendError(res, 402, error.message || 'Card was declined');
        return sendError(res, 500, error.message || 'Failed to charge overage');
    }
});

// ---------------------------------------------------------------------------
// PATCH /api/admin/memberships/:userId/balance
// Admin adjusts a member's monthly hour balance (e.g. grant bonus hours,
// correct a mistake). Body: { yearMonth: "2025-10", totalHoursUsed: 2 }
// ---------------------------------------------------------------------------
const updateMemberBalance = asyncHandler(async (req, res) => {
    try {
        const { userId } = req.params;
        const { yearMonth, totalHoursUsed } = req.body;

        if (!yearMonth || !/^\d{4}-\d{2}$/.test(yearMonth))
            return sendValidationError(res, 'yearMonth must be in YYYY-MM format');
        if (typeof totalHoursUsed !== 'number' || totalHoursUsed < 0)
            return sendValidationError(res, 'totalHoursUsed must be a non-negative number');

        const user = await User.findById(userId);
        if (!user) return sendNotFound(res, 'User not found');

        const record = await MonthlyHours.findOneAndUpdate(
            { user: userId, yearMonth },
            { $set: { totalHoursUsed } },
            { upsert: true, new: true }
        );

        return sendSuccess(res, 200, 'Member balance updated', {
            userId,
            yearMonth,
            totalHoursUsed: record.totalHoursUsed
        });
    } catch (error) {
        console.error('updateMemberBalance Error:', error);
        return sendError(res, 500, error.message || 'Failed to update balance');
    }
});

module.exports = {
    inviteFounder30,
    listMemberships,
    adminChargeOverage,
    updateMemberBalance
};
