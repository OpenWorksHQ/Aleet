/**
 * validators/paymentValidators.js
 * ---------------------------------------------------------------------------
 * Schemas for routes/payments.routes.js (Stripe checkout + saved cards).
 *
 * Two things matter here:
 *   1. Every identifier is handed to Stripe or to `Booking.findById`, so it has
 *      to be a scalar of the right shape — never an object.
 *   2. `tip` is added to the charge amount. It used to be clamped with
 *      `Math.max(0, Number(tip || 0))`, which quietly accepted a negative or
 *      non-numeric tip; it is now rejected at the boundary with a 400.
 * ---------------------------------------------------------------------------
 */

const { z, objectId, amount, stripeId } = require('./common');

/** Tips are per-trip gratuities, not an open-ended amount field. */
const tipField = amount('tip', { max: 100_000 }).optional().nullable();

/** POST /api/payments/checkout-session */
const createCheckoutSessionBody = z.looseObject({
  bookingId: objectId('bookingId'),
  tip: tipField,
});

/** GET /api/payments/session/:sessionId */
const sessionParams = z.object({
  sessionId: stripeId('sessionId', { prefix: 'cs_' }),
});

/** POST /api/payments/set-default-card */
const setDefaultCardBody = z.looseObject({
  paymentMethodId: stripeId('paymentMethodId', {
    prefix: 'pm_',
    missingMessage: 'paymentMethodId is required',
  }),
});

/** DELETE /api/payments/saved-cards/:paymentMethodId */
const paymentMethodParams = z.object({
  paymentMethodId: stripeId('paymentMethodId', {
    prefix: 'pm_',
    missingMessage: 'paymentMethodId is required',
  }),
});

/** POST /api/payments/charge-saved-card */
const chargeSavedCardBody = z.looseObject({
  bookingId: objectId('bookingId', { missingMessage: 'bookingId is required' }),
  paymentMethodId: stripeId('paymentMethodId', {
    prefix: 'pm_',
    missingMessage: 'paymentMethodId is required',
  }),
  tip: tipField,
});

/** POST /api/payments/booking-payment-intent */
const bookingPaymentIntentBody = z.looseObject({
  bookingId: objectId('bookingId', { missingMessage: 'bookingId is required' }),
  tip: tipField,
});

/** POST /api/payments/confirm-booking-payment */
const confirmBookingPaymentBody = z.looseObject({
  paymentIntentId: stripeId('paymentIntentId', {
    prefix: 'pi_',
    missingMessage: 'paymentIntentId is required',
  }),
});

module.exports = {
  createCheckoutSessionBody,
  sessionParams,
  setDefaultCardBody,
  paymentMethodParams,
  chargeSavedCardBody,
  bookingPaymentIntentBody,
  confirmBookingPaymentBody,
};
