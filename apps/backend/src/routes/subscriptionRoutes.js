const express = require('express');
const router = express.Router();
const authenticateJWT = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');
const {
    createSubscriptionCheckoutBody,
    chargeSubscriptionBody,
    processSubscriptionPaymentBody,
    cancelSubscriptionBody,
    claimFounder30Body,
} = require('../validators/subscriptionValidators');
const {
    createSubscriptionCheckout,
    chargeSubscriptionWithSavedCard,
    processSubscriptionPayment,
    getSubscriptionStatus,
    cancelSubscription,
    getSubscriptionBenefits,
    updatePaymentMethod,
    createStripeCustomer,
    claimFounder30Invite,
} = require('../controllers/subscriptionController');

// ── Public ───────────────────────────────────────────────────────────────────
// Plan details + pricing shown on the marketing/signup page
router.get('/benefits', getSubscriptionBenefits);

// ── Authenticated ─────────────────────────────────────────────────────────────
// Redirect checkout (no saved card required — card saved automatically after payment)
router.post(
    '/checkout',
    authenticateJWT,
    validate({ body: createSubscriptionCheckoutBody }),
    createSubscriptionCheckout
);

// Direct charge via saved card (fastest path for existing users)
router.post(
    '/charge-saved-card',
    authenticateJWT,
    validate({ body: chargeSubscriptionBody }),
    chargeSubscriptionWithSavedCard
);

// Reconcile after Stripe Checkout redirect (called from success page)
router.post(
    '/process-payment',
    authenticateJWT,
    validate({ body: processSubscriptionPaymentBody }),
    processSubscriptionPayment
);

// Get current subscription status, hours balance, and next billing date
router.get('/status', authenticateJWT, getSubscriptionStatus);

// Cancel subscription — the web client sends no body at all, so the schema
// accepts an empty object and only types the optional `reason`.
router.post(
    '/cancel',
    authenticateJWT,
    validate({ body: cancelSubscriptionBody }),
    cancelSubscription
);

// Claim shareable Founder 30 private-deal link
router.post(
    '/claim-founder30',
    authenticateJWT,
    validate({ body: claimFounder30Body }),
    claimFounder30Invite
);

// Open Stripe billing portal (update payment method) — reads no request body
router.put('/payment-method', authenticateJWT, updatePaymentMethod);

// Ensure Stripe customer record exists (utility — rarely called directly)
router.post('/create-customer', authenticateJWT, createStripeCustomer);

module.exports = router;
