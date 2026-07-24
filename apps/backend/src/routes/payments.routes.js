const express = require('express');
const router = express.Router();
const authenticateJWT = require('../middleware/authMiddleware');

const PaymentsController  = require('../controllers/payments.controller');
const SavedCardController = require('../controllers/savedCardController');

// ── One-time checkout (Stripe-hosted page redirect) ──────────────────────────
router.post('/checkout-session', authenticateJWT, PaymentsController.createCheckoutSession);

// ── Verify session from success page (reconcile if webhook was late) ─────────
router.get('/session/:sessionId', PaymentsController.getSessionStatus);

// ── Saved Card Management ────────────────────────────────────────────────────
// Create a SetupIntent — frontend uses clientSecret to collect card via Stripe.js
router.post('/setup-intent', authenticateJWT, SavedCardController.createSetupIntent);

// List saved cards for the authenticated user
router.get('/saved-cards', authenticateJWT, SavedCardController.listSavedCards);

// Set a saved card as the default for future charges
router.post('/set-default-card', authenticateJWT, SavedCardController.setDefaultCard);

// Delete (detach) a saved card
router.delete('/saved-cards/:paymentMethodId', authenticateJWT, SavedCardController.deleteCard);

// Charge an existing booking using a saved card (no redirect — one-tap payment)
router.post('/charge-saved-card', authenticateJWT, SavedCardController.chargeSavedCard);

// First-card inline checkout: charge + save on the booking confirmation page
router.post('/booking-payment-intent', authenticateJWT, SavedCardController.createBookingPaymentIntent);
router.post('/confirm-booking-payment', authenticateJWT, SavedCardController.confirmBookingPayment);

module.exports = router;
