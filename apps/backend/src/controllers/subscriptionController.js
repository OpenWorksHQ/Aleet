/**
 * controllers/subscriptionController.js
 * ---------------------------------------------------------------------------
 * Membership / subscription management.
 *
 * Membership model (from client):
 *   Standard  → $89/hr × 5h/mo × 3mo = $1,335/quarter (saved card required)
 *   Founder30 → $69/hr × 5h/mo × 3mo = $1,035/quarter (invite-only, admin assigns)
 *
 * Two checkout paths:
 *   A) Redirect → createSubscriptionCheckout → Stripe-hosted page (no saved card yet)
 *   B) Direct   → chargeSubscriptionWithSavedCard → charge saved card immediately
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
    sendNotFound,
    sendUnauthorized
} = require('../utils/responseHelper');
const { getOrCreateStripeCustomer } = require('./savedCardController');

const CURRENCY    = 'usd';
const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:5173';

// ---------------------------------------------------------------------------
// Internal: compute quarterly charge from settings
// ---------------------------------------------------------------------------
function computeQuarterlyCharge(settings, plan) {
    const isFounder       = plan === 'founder30';
    const ratePerHour     = isFounder
        ? (Number(settings?.founder30Rate)  || 69)
        : (Number(settings?.membershipRate) || 89);
    const monthlyHours    = Number(settings?.membershipMonthlyHours) || 5;
    const quarterlyHours  = monthlyHours * 3;
    const quarterlyCharge = ratePerHour * quarterlyHours;
    return { ratePerHour, monthlyHours, quarterlyHours, quarterlyCharge };
}

// ---------------------------------------------------------------------------
// Internal: next billing date based on billing cycle
// ---------------------------------------------------------------------------
function computeNextBillingDate(settings) {
    const cycle = settings?.membershipBillingCycle || 'quarterly';
    const now   = new Date();
    if (cycle === 'monthly')   return new Date(now.getFullYear(), now.getMonth() + 1,  1);
    if (cycle === 'annually')  return new Date(now.getFullYear() + 1, now.getMonth(), 1);
    return new Date(now.getTime() + 90 * 24 * 3600 * 1000); // quarterly default
}

// ---------------------------------------------------------------------------
// POST /api/subscriptions/checkout
// Creates a Stripe Checkout Session (redirect flow). Supports both plans.
// Body: { plan?: "standard" | "founder30" }
// ---------------------------------------------------------------------------
const createSubscriptionCheckout = asyncHandler(async (req, res) => {
    try {
        const { plan = 'standard' } = req.body;
        const userId = req.user.id;

        if (!['standard', 'founder30'].includes(plan))
            return sendValidationError(res, 'plan must be "standard" or "founder30"');

        const user = await User.findById(userId);
        if (!user) return sendNotFound(res, 'User not found');

        if (user.subscriptionStatus === 'subscriber')
            return sendValidationError(res, 'User is already subscribed');

        // Founder 30 gate — admin must have set founder30Invited flag
        if (plan === 'founder30' && !user.founder30Invited)
            return sendError(res, 403, 'Founder 30 membership requires an admin invitation');

        const settings = await TierSettings.findOne();
        const { ratePerHour, monthlyHours, quarterlyHours, quarterlyCharge } = computeQuarterlyCharge(settings, plan);
        // Client: Stripe Checkout shows initial MONTHLY amount ($445 / $345), not the
        // full quarterly prepaid total. Quarterly renewal is handled by membershipRenewalJob.
        const monthlyCharge = ratePerHour * monthlyHours;

        const planLabel = plan === 'founder30' ? 'Founder 30 Membership' : 'Aleet Standard Membership';
        const description = `Initial monthly membership — $${monthlyCharge}/mo (${monthlyHours} hrs @ $${ratePerHour}/hr). Ongoing prepaid hours renew automatically while you stay on the plan.`;

        const session = await stripe.checkout.sessions.create({
            mode:                 'payment',
            payment_method_types: ['card'],
            customer_email:       user.email || undefined,
            payment_intent_data: {
                // Allow the card used in checkout to be saved automatically
                setup_future_usage: 'off_session'
            },
            metadata: {
                userId:   userId.toString(),
                type:     'subscription',
                plan
            },
            line_items: [
                {
                    price_data: {
                        currency:     CURRENCY,
                        product_data: { name: planLabel, description },
                        unit_amount:  Math.round(monthlyCharge * 100)
                    },
                    quantity: 1
                }
            ],
            success_url: `${APP_BASE_URL}/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url:  `${APP_BASE_URL}/subscription-cancelled`
        });

        return sendSuccess(res, 200, 'Checkout session created', {
            url:               session.url,
            sessionId:         session.id,
            plan,
            ratePerHour,
            monthlyHours,
            quarterlyHours,
            monthlyCharge,
            quarterlyCharge,
            message: `Redirect to Stripe checkout to activate your ${planLabel}`
        });
    } catch (error) {
        console.error('Subscription Checkout Error:', error);
        return sendError(res, 500, error.message || 'Failed to create subscription checkout');
    }
});

// ---------------------------------------------------------------------------
// POST /api/subscriptions/charge-saved-card
// Charge membership directly to a saved card (no Stripe redirect needed).
// Body: { plan?: "standard" | "founder30", paymentMethodId: "pm_xxx" }
// ---------------------------------------------------------------------------
const chargeSubscriptionWithSavedCard = asyncHandler(async (req, res) => {
    try {
        const { plan = 'standard', paymentMethodId } = req.body;
        const userId = req.user.id;

        if (!paymentMethodId) return sendValidationError(res, 'paymentMethodId is required');
        if (!['standard', 'founder30'].includes(plan))
            return sendValidationError(res, 'plan must be "standard" or "founder30"');

        const user = await User.findById(userId);
        if (!user) return sendNotFound(res, 'User not found');

        if (user.subscriptionStatus === 'subscriber')
            return sendValidationError(res, 'User is already subscribed');

        if (plan === 'founder30' && !user.founder30Invited)
            return sendError(res, 403, 'Founder 30 membership requires an admin invitation');

        const settings = await TierSettings.findOne();
        const { ratePerHour, monthlyHours, quarterlyHours, quarterlyCharge } = computeQuarterlyCharge(settings, plan);
        const monthlyCharge = ratePerHour * monthlyHours;

        const customerId = await getOrCreateStripeCustomer(user);

        // Verify the payment method belongs to this customer
        const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
        if (pm.customer !== customerId)
            return sendValidationError(res, 'This card does not belong to your account');

        const paymentIntent = await stripe.paymentIntents.create({
            amount:         Math.round(monthlyCharge * 100),
            currency:       CURRENCY,
            customer:       customerId,
            payment_method: paymentMethodId,
            confirm:        true,
            off_session:    true,
            description:    `Aleet ${plan === 'founder30' ? 'Founder 30' : 'Standard'} Membership — $${monthlyCharge}/mo initial`,
            metadata:       { userId: userId.toString(), type: 'subscription', plan }
        });

        if (paymentIntent.status !== 'succeeded') {
            return sendSuccess(res, 202, 'Payment requires further action', {
                paymentIntentId: paymentIntent.id,
                clientSecret:    paymentIntent.client_secret,
                status:          paymentIntent.status
            });
        }

        // Activate subscription
        const nextBillingDate = computeNextBillingDate(settings);
        await User.findByIdAndUpdate(userId, {
            subscriptionStatus: 'subscriber',
            subscriptionDetails: {
                plan,
                price:                 quarterlyCharge,
                billingCycle:          settings?.membershipBillingCycle || 'quarterly',
                startDate:             new Date(),
                nextBillingDate,
                paymentMethodId,
                stripeCustomerId:      customerId,
                stripePaymentIntentId: paymentIntent.id,
                isActive:              true,
                monthlyHoursIncluded:  monthlyHours
            }
        });

        const updatedUser = await User.findById(userId).select('-password');

        return sendSuccess(res, 200, 'Membership activated successfully', {
            user: updatedUser,
            subscription: {
                plan,
                ratePerHour,
                monthlyHours,
                quarterlyHours,
                quarterlyCharge,
                nextBillingDate
            }
        });
    } catch (error) {
        console.error('chargeSubscriptionWithSavedCard Error:', error);
        if (error.type === 'StripeCardError')
            return sendError(res, 402, error.message || 'Card was declined');
        return sendError(res, 500, error.message || 'Failed to charge membership');
    }
});

// ---------------------------------------------------------------------------
// POST /api/subscriptions/process-payment
// Called after Stripe Checkout webhook fires, or from success-page reconcile.
// Body: { sessionId }
// ---------------------------------------------------------------------------
const processSubscriptionPayment = asyncHandler(async (req, res) => {
    try {
        const { sessionId } = req.body;
        if (!sessionId) return sendValidationError(res, 'Session ID is required');

        const session = await stripe.checkout.sessions.retrieve(sessionId, {
            expand: ['payment_intent']
        });

        if (session.payment_status !== 'paid')
            return sendValidationError(res, 'Payment not completed');

        const userId = session.metadata?.userId;
        const plan   = session.metadata?.plan || 'standard';
        if (!userId)  return sendValidationError(res, 'User ID not found in session');

        const user = await User.findById(userId);
        if (!user) return sendNotFound(res, 'User not found');

        if (user.subscriptionStatus === 'subscriber') {
            // Already activated (webhook beat us to it)
            return sendSuccess(res, 200, 'Subscription already active', { status: 'subscriber' });
        }

        const settings    = await TierSettings.findOne();
        const { ratePerHour, monthlyHours, quarterlyHours, quarterlyCharge } = computeQuarterlyCharge(settings, plan);
        const nextBillingDate = computeNextBillingDate(settings);

        // Attach the card used in checkout to the customer for future charges
        const customerId       = session.customer || null;
        const paymentIntentId  = session.payment_intent?.id || null;
        if (customerId && paymentIntentId) {
            const { attachCardAfterCheckout } = require('./savedCardController');
            await attachCardAfterCheckout(customerId, paymentIntentId);
        }

        await User.findByIdAndUpdate(userId, {
            subscriptionStatus: 'subscriber',
            subscriptionDetails: {
                plan,
                price:                 quarterlyCharge,
                billingCycle:          settings?.membershipBillingCycle || 'quarterly',
                startDate:             new Date(),
                nextBillingDate,
                paymentMethodId:       paymentIntentId,
                stripeCustomerId:      customerId,
                stripeSessionId:       sessionId,
                stripePaymentIntentId: paymentIntentId,
                isActive:              true,
                monthlyHoursIncluded:  monthlyHours
            }
        });

        const updatedUser = await User.findById(userId).select('-password');

        return sendSuccess(res, 200, 'Membership activated', {
            user: updatedUser,
            subscription: { plan, ratePerHour, monthlyHours, quarterlyHours, quarterlyCharge, nextBillingDate }
        });
    } catch (error) {
        console.error('processSubscriptionPayment Error:', error);
        return sendError(res, 500, error.message || 'Failed to process subscription payment');
    }
});

// ---------------------------------------------------------------------------
// GET /api/subscriptions/status
// Returns full membership status including quarterly balance.
// ---------------------------------------------------------------------------
const getSubscriptionStatus = asyncHandler(async (req, res) => {
    try {
        const userId = req.user.id;

        const [user, settings] = await Promise.all([
            User.findById(userId).select('-password'),
            TierSettings.findOne()
        ]);
        if (!user) return sendNotFound(res, 'User not found');

        const isSubscriber    = user.subscriptionStatus === 'subscriber';
        const plan            = user.subscriptionDetails?.plan || null;
        const monthlyHours    = Number(settings?.membershipMonthlyHours) || 5;
        const quarterlyHours  = monthlyHours * 3;
        const isFounder       = plan === 'founder30';
        const ratePerHour     = isFounder
            ? (Number(settings?.founder30Rate)  || 69)
            : (Number(settings?.membershipRate) || 89);

        // Sum used hours for the current 3-month quarter
        const quarterlyUsed = isSubscriber
            ? await getQuarterlyUsedHours(MonthlyHours, userId)
            : 0;

        // Get default saved card last4
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

        const hoursRemaining  = isSubscriber ? Math.max(0, quarterlyHours - quarterlyUsed) : 0;
        const overageHours    = isSubscriber ? Math.max(0, quarterlyUsed - quarterlyHours)  : 0;

        return sendSuccess(res, 200, 'Subscription status retrieved', {
            status:       user.subscriptionStatus,
            plan,
            isFounder30:  isFounder,
            founder30Invited: !!user.founder30Invited,
            ratePerHour:  isSubscriber ? ratePerHour : null,
            monthlyCharge: isSubscriber ? ratePerHour * monthlyHours : null,
            quarterlyCharge: isSubscriber ? ratePerHour * quarterlyHours : null,
            currentQuarter: {
                totalHoursIncluded: isSubscriber ? quarterlyHours : 0,
                hoursUsed:          Number(quarterlyUsed.toFixed(4)),
                hoursRemaining:     Number(hoursRemaining.toFixed(4)),
                overageHours:       Number(overageHours.toFixed(4)),
                overageCharge:      Number((overageHours * ratePerHour).toFixed(2))
            },
            subscriptionDetails:  user.subscriptionDetails || null,
            nextBillingDate:      user.subscriptionDetails?.nextBillingDate || null,
            savedCardLast4
        });
    } catch (error) {
        console.error('getSubscriptionStatus Error:', error);
        return sendError(res, 500, error.message || 'Failed to retrieve subscription status');
    }
});

// ---------------------------------------------------------------------------
// POST /api/subscriptions/cancel
// Body: { reason? }
// ---------------------------------------------------------------------------
const cancelSubscription = asyncHandler(async (req, res) => {
    try {
        const userId   = req.user.id;
        const { reason } = req.body;

        const user = await User.findById(userId);
        if (!user) return sendNotFound(res, 'User not found');

        if (user.subscriptionStatus !== 'subscriber')
            return sendValidationError(res, 'User is not currently subscribed');

        await User.findByIdAndUpdate(userId, {
            subscriptionStatus: 'cancelled',
            'subscriptionDetails.isActive':           false,
            'subscriptionDetails.cancelledAt':        new Date(),
            'subscriptionDetails.cancellationReason': reason || 'User requested cancellation',
            'subscriptionDetails.updatedAt':          new Date()
        });

        const updatedUser = await User.findById(userId).select('-password');

        return sendSuccess(res, 200, 'Subscription cancelled successfully', {
            user:    updatedUser,
            message: 'Your membership has been cancelled. Remaining hours are available until your current billing period ends.'
        });
    } catch (error) {
        console.error('cancelSubscription Error:', error);
        return sendError(res, 500, error.message || 'Failed to cancel subscription');
    }
});

// ---------------------------------------------------------------------------
// GET /api/subscriptions/benefits
// Public — no auth required. Returns plan details for the marketing/signup page.
// ---------------------------------------------------------------------------
const getSubscriptionBenefits = asyncHandler(async (req, res) => {
    try {
        const settings = await TierSettings.findOne();
        const memberRate   = Number(settings?.membershipRate)        || 89;
        const founder30Rate = Number(settings?.founder30Rate)        || 69;
        const monthlyHours  = Number(settings?.membershipMonthlyHours) || 5;
        const quarterlyHours = monthlyHours * 3;

        return sendSuccess(res, 200, 'Subscription benefits retrieved', {
            standard: {
                ratePerHour:     memberRate,
                monthlyHours,
                quarterlyHours,
                monthlyCharge:   memberRate * monthlyHours,
                quarterlyCharge: memberRate * quarterlyHours,
                description:     `${monthlyHours} prepaid hrs/month at $${memberRate}/hr — any vehicle type.`
            },
            founder30: {
                ratePerHour:     founder30Rate,
                monthlyHours,
                quarterlyHours,
                monthlyCharge:   founder30Rate * monthlyHours,
                quarterlyCharge: founder30Rate * quarterlyHours,
                inviteOnly:      true,
                description:     `Private invite-only membership. ${monthlyHours} prepaid hrs/month at $${founder30Rate}/hr.`
            }
        });
    } catch (error) {
        console.error('getSubscriptionBenefits Error:', error);
        return sendError(res, 500, error.message || 'Failed to retrieve subscription benefits');
    }
});

// ---------------------------------------------------------------------------
// PUT /api/subscriptions/payment-method
// Opens Stripe Billing Portal for the customer to manage their payment method.
// ---------------------------------------------------------------------------
const updatePaymentMethod = asyncHandler(async (req, res) => {
    try {
        const userId = req.user.id;
        const user   = await User.findById(userId);
        if (!user) return sendNotFound(res, 'User not found');

        if (user.subscriptionStatus !== 'subscriber')
            return sendValidationError(res, 'User is not currently subscribed');

        const customerId = user.subscriptionDetails?.stripeCustomerId;
        if (!customerId)
            return sendValidationError(res, 'No Stripe customer found');

        const portalSession = await stripe.billingPortal.sessions.create({
            customer:   customerId,
            return_url: `${APP_BASE_URL}/subscription-settings`
        });

        return sendSuccess(res, 200, 'Billing portal session created', {
            url:     portalSession.url,
            message: 'Redirect to Stripe portal to update payment method'
        });
    } catch (error) {
        console.error('updatePaymentMethod Error:', error);
        return sendError(res, 500, error.message || 'Failed to create billing portal session');
    }
});

// ---------------------------------------------------------------------------
// POST /api/subscriptions/create-customer
// Creates a Stripe customer for an existing user (rarely needed directly).
// ---------------------------------------------------------------------------
const createStripeCustomer = asyncHandler(async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return sendNotFound(res, 'User not found');

        const customerId = await getOrCreateStripeCustomer(user);

        return sendSuccess(res, 200, 'Stripe customer ready', { customerId });
    } catch (error) {
        console.error('createStripeCustomer Error:', error);
        return sendError(res, 500, error.message || 'Failed to create Stripe customer');
    }
});

module.exports = {
    createSubscriptionCheckout,
    chargeSubscriptionWithSavedCard,
    processSubscriptionPayment,
    getSubscriptionStatus,
    cancelSubscription,
    getSubscriptionBenefits,
    updatePaymentMethod,
    createStripeCustomer
};
