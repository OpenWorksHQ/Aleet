/**
 * validators/payoutValidators.js
 * ---------------------------------------------------------------------------
 * Schemas for routes/payoutRoutes.js — the endpoints that move company money
 * out to driver Stripe Connect accounts.
 *
 * `POST /payoutToAccount` previously validated by `throw new Error(...)` inside
 * an express-async-handler, which the global error handler renders as a 500.
 * Routing it through `sendValidationError` turns malformed input into the 400
 * it always should have been; the money-moving path itself is untouched.
 * ---------------------------------------------------------------------------
 */

const { z, objectId, amount, numberLike, stripeId } = require('./common');

/** POST /api/payout/booking/:id */
const payoutBookingParams = z.object({
  id: objectId('Booking ID', { message: 'Invalid booking ID' }),
});

/** POST /api/payout/run?limit= — the controller caps this at 200 anyway. */
const payoutRunQuery = z.looseObject({
  limit: numberLike('limit').optional(),
});

/**
 * POST /api/payout/payoutToAccount
 * `amount` is in DOLLARS and is multiplied by 100 before being sent to Stripe.
 * Zero and negative amounts are rejected (Stripe would reject them too, but
 * only after a network round trip), and the ceiling is a blast-radius guard on
 * a fat-fingered manual transfer.
 */
const payoutToAccountBody = z.looseObject({
  accountId: stripeId('accountId', {
    prefix: 'acct_',
    missingMessage: 'stripeAccountId is required.',
  }),
  amount: amount('amount', {
    min: 0.01,
    max: 1_000_000,
    missingMessage: 'Valid amount (in dollars) is required.',
  }),
});

module.exports = {
  payoutBookingParams,
  payoutRunQuery,
  payoutToAccountBody,
};
