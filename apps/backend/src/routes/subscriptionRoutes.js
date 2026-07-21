const express = require('express');
const router = express.Router();
const authenticateJWT = require('../middleware/authMiddleware');
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
router.post('/checkout', authenticateJWT, createSubscriptionCheckout);

// Direct charge via saved card (fastest path for existing users)
router.post('/charge-saved-card', authenticateJWT, chargeSubscriptionWithSavedCard);

// Reconcile after Stripe Checkout redirect (called from success page)
router.post('/process-payment', authenticateJWT, processSubscriptionPayment);

// Get current subscription status, hours balance, and next billing date
router.get('/status', authenticateJWT, getSubscriptionStatus);

// Cancel subscription
router.post('/cancel', authenticateJWT, cancelSubscription);

// Claim shareable Founder 30 private-deal link
router.post('/claim-founder30', authenticateJWT, claimFounder30Invite);

// Open Stripe billing portal (update payment method)
router.put('/payment-method', authenticateJWT, updatePaymentMethod);

// Ensure Stripe customer record exists (utility — rarely called directly)
router.post('/create-customer', authenticateJWT, createStripeCustomer);

module.exports = router;
