/**
 * controllers/savedCardController.js
 * ---------------------------------------------------------------------------
 * Stripe saved-card management (works like Uber — card saved on first use,
 * reused for all future bookings in one tap).
 *
 * Flow overview:
 *   1. createSetupIntent   → frontend renders Stripe card element → card saved
 *   2. listSavedCards      → frontend shows saved cards list
 *   3. setDefaultCard      → customer picks default card for future charges
 *   4. deleteCard          → customer removes a saved card
 *   5. chargeSavedCard     → charge an existing booking with a saved card
 *   6. chargeOverage       → internal helper: auto-charge overage hours on confirm
 *
 * All Stripe customer IDs are stored in User.subscriptionDetails.stripeCustomerId.
 * ---------------------------------------------------------------------------
 */

require('dotenv').config();
const asyncHandler = require('express-async-handler');
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const User    = require('../models/User');
const Booking = require('../models/Booking');
const { sendSuccess, sendError, sendValidationError, sendNotFound } = require('../utils/responseHelper');

const CURRENCY = 'usd';

// ---------------------------------------------------------------------------
// Internal: get or create a Stripe Customer for the user.
// Stores customerId in User.subscriptionDetails.stripeCustomerId.
// ---------------------------------------------------------------------------
async function getOrCreateStripeCustomer(user) {
    const existing = user.subscriptionDetails?.stripeCustomerId;
    if (existing) {
        // Verify the customer still exists in Stripe
        try {
            const customer = await stripe.customers.retrieve(existing);
            if (!customer.deleted) return customer.id;
        } catch (_) {
            // Customer not found — fall through to create a new one
        }
    }

    const customer = await stripe.customers.create({
        email:    user.email  || undefined,
        phone:    user.phone  || undefined,
        name:     user.name   || undefined,
        metadata: { userId: user._id.toString() }
    });

    // Persist the new customer ID
    await User.findByIdAndUpdate(user._id, {
        'subscriptionDetails.stripeCustomerId': customer.id
    });

    return customer.id;
}

// ---------------------------------------------------------------------------
// POST /api/payments/setup-intent
// Creates a Stripe SetupIntent. Frontend uses the clientSecret with
// stripe.confirmCardSetup() to save the card without charging it.
// ---------------------------------------------------------------------------
const createSetupIntent = asyncHandler(async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return sendNotFound(res, 'User not found');

        const customerId = await getOrCreateStripeCustomer(user);

        const setupIntent = await stripe.setupIntents.create({
            customer:             customerId,
            payment_method_types: ['card'],
            usage:                'off_session', // allows charging without guest present
            metadata:             { userId: user._id.toString() }
        });

        return sendSuccess(res, 200, 'Setup intent created', {
            clientSecret: setupIntent.client_secret,
            customerId
        });
    } catch (err) {
        console.error('createSetupIntent error:', err);
        return sendError(res, 500, err.message || 'Failed to create setup intent');
    }
});

// ---------------------------------------------------------------------------
// GET /api/payments/saved-cards
// Lists all saved payment methods for the authenticated user.
// ---------------------------------------------------------------------------
const listSavedCards = asyncHandler(async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return sendNotFound(res, 'User not found');

        const customerId = user.subscriptionDetails?.stripeCustomerId;
        if (!customerId) {
            return sendSuccess(res, 200, 'No saved cards', []);
        }

        // Retrieve customer to get default payment method
        const customer = await stripe.customers.retrieve(customerId);
        const defaultPmId = customer.invoice_settings?.default_payment_method || null;

        const paymentMethods = await stripe.paymentMethods.list({
            customer: customerId,
            type:     'card'
        });

        const cards = paymentMethods.data.map(pm => ({
            id:        pm.id,
            brand:     pm.card.brand,
            last4:     pm.card.last4,
            expMonth:  pm.card.exp_month,
            expYear:   pm.card.exp_year,
            isDefault: pm.id === defaultPmId
        }));

        return sendSuccess(res, 200, 'Saved cards retrieved', cards);
    } catch (err) {
        console.error('listSavedCards error:', err);
        return sendError(res, 500, err.message || 'Failed to retrieve saved cards');
    }
});

// ---------------------------------------------------------------------------
// POST /api/payments/set-default-card
// Sets a saved payment method as the default for future auto-charges.
// Body: { paymentMethodId: "pm_xxx" }
// ---------------------------------------------------------------------------
const setDefaultCard = asyncHandler(async (req, res) => {
    try {
        const { paymentMethodId } = req.body;
        if (!paymentMethodId) return sendValidationError(res, 'paymentMethodId is required');

        const user = await User.findById(req.user.id);
        if (!user) return sendNotFound(res, 'User not found');

        const customerId = user.subscriptionDetails?.stripeCustomerId;
        if (!customerId) return sendValidationError(res, 'No Stripe customer found. Add a card first.');

        // Verify the payment method belongs to this customer
        const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
        if (pm.customer !== customerId)
            return sendValidationError(res, 'This card does not belong to your account');

        // Set as default on the Stripe customer
        await stripe.customers.update(customerId, {
            invoice_settings: { default_payment_method: paymentMethodId }
        });

        return sendSuccess(res, 200, 'Default card updated', { paymentMethodId });
    } catch (err) {
        console.error('setDefaultCard error:', err);
        return sendError(res, 500, err.message || 'Failed to set default card');
    }
});

// ---------------------------------------------------------------------------
// DELETE /api/payments/saved-cards/:paymentMethodId
// Detaches a saved payment method from the customer account.
// ---------------------------------------------------------------------------
const deleteCard = asyncHandler(async (req, res) => {
    try {
        const { paymentMethodId } = req.params;
        if (!paymentMethodId) return sendValidationError(res, 'paymentMethodId is required');

        const user = await User.findById(req.user.id);
        if (!user) return sendNotFound(res, 'User not found');

        const customerId = user.subscriptionDetails?.stripeCustomerId;
        if (!customerId) return sendValidationError(res, 'No Stripe customer found');

        // Verify ownership before detach
        const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
        if (pm.customer !== customerId)
            return sendValidationError(res, 'This card does not belong to your account');

        await stripe.paymentMethods.detach(paymentMethodId);

        return sendSuccess(res, 200, 'Card removed successfully', { paymentMethodId });
    } catch (err) {
        console.error('deleteCard error:', err);
        return sendError(res, 500, err.message || 'Failed to remove card');
    }
});

// ---------------------------------------------------------------------------
// POST /api/payments/charge-saved-card
// Charge an existing booking with a saved card (no redirect to Stripe checkout).
// Body: { bookingId, paymentMethodId, tip? }
// ---------------------------------------------------------------------------
const chargeSavedCard = asyncHandler(async (req, res) => {
    try {
        const { bookingId, paymentMethodId, tip = 0 } = req.body;
        const userId = req.user.id;

        if (!bookingId)       return sendValidationError(res, 'bookingId is required');
        if (!paymentMethodId) return sendValidationError(res, 'paymentMethodId is required');

        const booking = await Booking.findById(bookingId).populate('vehicleType', 'name');
        if (!booking) return sendNotFound(res, 'Booking not found');
        if (booking.user.toString() !== userId.toString())
            return sendError(res, 403, 'Not your booking');
        if (booking.paymentStatus === 'Paid')
            return sendValidationError(res, 'Booking is already paid');
        if (booking.status === 'Cancelled')
            return sendValidationError(res, 'Booking is cancelled');

        const user = await User.findById(userId);
        if (!user) return sendNotFound(res, 'User not found');

        const customerId = user.subscriptionDetails?.stripeCustomerId;
        if (!customerId) return sendValidationError(res, 'No Stripe customer found. Add a card first.');

        // Verify the payment method belongs to this customer
        const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
        if (pm.customer !== customerId)
            return sendValidationError(res, 'This card does not belong to your account');

        const baseAmount = Number(booking.finalPrice || 0);
        const tipAmount  = Math.max(0, Number(tip || 0));
        const totalAmount = baseAmount + tipAmount;

        if (totalAmount <= 0) return sendValidationError(res, 'Invalid amount');

        const bookingFeeAmount = Number(booking.bookingFee || 0);
        const feeNote = bookingFeeAmount > 0 ? ` (incl. $${bookingFeeAmount.toFixed(2)} booking fee)` : '';

        // Create a PaymentIntent and confirm it immediately (off-session)
        const paymentIntent = await stripe.paymentIntents.create({
            amount:               Math.round(totalAmount * 100),
            currency:             CURRENCY,
            customer:             customerId,
            payment_method:       paymentMethodId,
            confirm:              true,
            off_session:          true,
            description:          `Booking: ${booking.vehicleType?.name || 'Vehicle'} — ${new Date(booking.dates.startDate).toLocaleDateString()}${feeNote}`,
            metadata: {
                bookingId: booking._id.toString(),
                userId:    userId.toString(),
                type:      'booking'
            }
        });

        if (paymentIntent.status === 'succeeded') {
            booking.paymentStatus          = 'Paid';
            booking.paidAt                 = new Date();
            booking.stripePaymentIntentId  = paymentIntent.id;
            booking.tip                    = tipAmount;
            await booking.save();

            return sendSuccess(res, 200, 'Payment successful', {
                paymentIntentId: paymentIntent.id,
                amountCharged:   totalAmount,
                status:          paymentIntent.status,
                booking: {
                    id:            booking._id,
                    paymentStatus: booking.paymentStatus,
                    finalPrice:    booking.finalPrice,
                    tip:           booking.tip
                }
            });
        }

        // Requires additional action (3D Secure etc.)
        return sendSuccess(res, 202, 'Payment requires further action', {
            paymentIntentId: paymentIntent.id,
            clientSecret:    paymentIntent.client_secret,
            status:          paymentIntent.status
        });
    } catch (err) {
        console.error('chargeSavedCard error:', err);
        // Stripe card decline errors come back as StripeCardError
        if (err.type === 'StripeCardError') {
            return sendError(res, 402, err.message || 'Card was declined');
        }
        return sendError(res, 500, err.message || 'Failed to charge card');
    }
});

// ---------------------------------------------------------------------------
// POST /api/payments/attach-card-after-checkout
// Called automatically from the Stripe webhook (checkout.session.completed).
// Attaches the payment method used in a checkout session to the customer
// so it appears in their saved cards list for future bookings.
// This is an internal function — NOT a direct HTTP endpoint.
// ---------------------------------------------------------------------------
async function attachCardAfterCheckout(stripeCustomerId, paymentIntentId) {
    try {
        if (!stripeCustomerId || !paymentIntentId) return;

        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
            expand: ['payment_method']
        });
        const pm = paymentIntent.payment_method;
        if (!pm || typeof pm !== 'object') return;

        // Only attach if not already attached
        if (pm.customer !== stripeCustomerId) {
            await stripe.paymentMethods.attach(pm.id, { customer: stripeCustomerId });
        }

        // Set as default if customer has no default yet
        const customer = await stripe.customers.retrieve(stripeCustomerId);
        if (!customer.invoice_settings?.default_payment_method) {
            await stripe.customers.update(stripeCustomerId, {
                invoice_settings: { default_payment_method: pm.id }
            });
        }

        console.log(`✅ Card ${pm.id} attached to customer ${stripeCustomerId}`);
    } catch (err) {
        console.error('attachCardAfterCheckout error (non-fatal):', err?.message);
    }
}

// ---------------------------------------------------------------------------
// chargeOverage — internal function used by confirmBooking / acceptBooking.
// Charges overage hours at the member's locked rate to their default saved card.
//
// @param {{ userId, overageHours, user, tierSettings }} opts
// ---------------------------------------------------------------------------
async function chargeOverage({ userId, overageHours, user, tierSettings }) {
    if (!overageHours || overageHours <= 0) return;

    const isFounder    = user?.subscriptionDetails?.plan === 'founder30';
    const memberRate   = isFounder
        ? (Number(tierSettings?.founder30Rate)   || 69)
        : (Number(tierSettings?.membershipRate)  || 89);

    const overageAmount = Number((overageHours * memberRate).toFixed(2));
    if (overageAmount <= 0) return;

    const customerId = user?.subscriptionDetails?.stripeCustomerId;
    if (!customerId) {
        throw new Error(`Overage charge failed: user ${userId} has no saved card (no Stripe customer)`);
    }

    // Get default payment method
    const customer = await stripe.customers.retrieve(customerId);
    const defaultPmId = customer.invoice_settings?.default_payment_method;
    if (!defaultPmId) {
        throw new Error(`Overage charge failed: user ${userId} has no default payment method`);
    }

    const paymentIntent = await stripe.paymentIntents.create({
        amount:               Math.round(overageAmount * 100),
        currency:             CURRENCY,
        customer:             customerId,
        payment_method:       defaultPmId,
        confirm:              true,
        off_session:          true,
        description:          `Aleet membership overage: ${overageHours.toFixed(2)} hrs @ $${memberRate}/hr`,
        metadata: {
            userId,
            type:         'membership_overage',
            overageHours: overageHours.toString(),
            ratePerHour:  memberRate.toString()
        }
    });

    console.log(`💳 Overage charged $${overageAmount} for ${overageHours}h to user ${userId} — PI: ${paymentIntent.id}`);
    return paymentIntent;
}

module.exports = {
    createSetupIntent,
    listSavedCards,
    setDefaultCard,
    deleteCard,
    chargeSavedCard,
    attachCardAfterCheckout,
    chargeOverage,
    getOrCreateStripeCustomer
};
