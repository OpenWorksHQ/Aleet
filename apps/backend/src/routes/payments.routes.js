const express = require('express');
const router = express.Router();
const authenticateJWT = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');
const {
  createCheckoutSessionBody,
  sessionParams,
  setDefaultCardBody,
  paymentMethodParams,
  chargeSavedCardBody,
  bookingPaymentIntentBody,
  confirmBookingPaymentBody,
} = require('../validators/paymentValidators');

const PaymentsController  = require('../controllers/payments.controller');
const SavedCardController = require('../controllers/savedCardController');

// ── One-time checkout (Stripe-hosted page redirect) ──────────────────────────
router.post(
  '/checkout-session',
  authenticateJWT,
  validate({ body: createCheckoutSessionBody }),
  PaymentsController.createCheckoutSession
);

// ── Verify session from success page (reconcile if webhook was late) ─────────
// Auth required: the handler returns booking price/status and can trigger
// dispatch. The controller additionally verifies the caller owns the booking.
router.get(
  '/session/:sessionId',
  authenticateJWT,
  validate({ params: sessionParams }),
  PaymentsController.getSessionStatus
);

// ── Saved Card Management ────────────────────────────────────────────────────
// Create a SetupIntent — frontend uses clientSecret to collect card via Stripe.js
// (takes no request body, so there is nothing to validate).
router.post('/setup-intent', authenticateJWT, SavedCardController.createSetupIntent);

// List saved cards for the authenticated user
router.get('/saved-cards', authenticateJWT, SavedCardController.listSavedCards);

// Set a saved card as the default for future charges
router.post(
  '/set-default-card',
  authenticateJWT,
  validate({ body: setDefaultCardBody }),
  SavedCardController.setDefaultCard
);

// Delete (detach) a saved card
router.delete(
  '/saved-cards/:paymentMethodId',
  authenticateJWT,
  validate({ params: paymentMethodParams }),
  SavedCardController.deleteCard
);

// Charge an existing booking using a saved card (no redirect — one-tap payment)
router.post(
  '/charge-saved-card',
  authenticateJWT,
  validate({ body: chargeSavedCardBody }),
  SavedCardController.chargeSavedCard
);

// First-card inline checkout: charge + save on the booking confirmation page
router.post(
  '/booking-payment-intent',
  authenticateJWT,
  validate({ body: bookingPaymentIntentBody }),
  SavedCardController.createBookingPaymentIntent
);
router.post(
  '/confirm-booking-payment',
  authenticateJWT,
  validate({ body: confirmBookingPaymentBody }),
  SavedCardController.confirmBookingPayment
);

module.exports = router;
