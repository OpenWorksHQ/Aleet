/**
 * validators/subscriptionValidators.js
 * ---------------------------------------------------------------------------
 * Schemas for routes/subscriptionRoutes.js (membership purchase + lifecycle).
 *
 * The plan messages are copied verbatim from subscriptionController so the
 * 400 body is unchanged for the case it already handled. `POST /cancel` is
 * called by apps/frontend with no request body at all, so its schema has to
 * accept an empty object — `middleware/validate.js` normalises a missing body
 * to `{}` for exactly this reason.
 * ---------------------------------------------------------------------------
 */

const { z, LIMITS, nullableString, requiredString, stripeId, enumOf } = require('./common');

const PLAN_MESSAGE = 'plan must be "standard" or "founder30"';

/** Optional because both controllers default it to 'standard'. */
const planField = enumOf('plan', ['standard', 'founder30'], { message: PLAN_MESSAGE }).optional();

/** POST /api/subscriptions/checkout */
const createSubscriptionCheckoutBody = z.looseObject({
  plan: planField,
});

/** POST /api/subscriptions/charge-saved-card */
const chargeSubscriptionBody = z.looseObject({
  plan: planField,
  paymentMethodId: stripeId('paymentMethodId', {
    prefix: 'pm_',
    missingMessage: 'paymentMethodId is required',
  }),
});

/** POST /api/subscriptions/process-payment */
const processSubscriptionPaymentBody = z.looseObject({
  sessionId: stripeId('sessionId', { prefix: 'cs_', missingMessage: 'Session ID is required' }),
});

/** POST /api/subscriptions/cancel — frontend sends no body. */
const cancelSubscriptionBody = z.looseObject({
  reason: nullableString('reason', { max: LIMITS.LONG_TEXT }),
});

/**
 * POST /api/subscriptions/claim-founder30
 * Kept as a plain string rather than a charset-restricted token: the controller
 * trims before looking the invite up, and admin-minted invite codes are not
 * guaranteed to be URL-safe hex.
 */
const claimFounder30Body = z.looseObject({
  token: requiredString('token', { max: LIMITS.SHORT_TEXT, missingMessage: 'token is required' }),
});

module.exports = {
  PLAN_MESSAGE,
  createSubscriptionCheckoutBody,
  chargeSubscriptionBody,
  processSubscriptionPaymentBody,
  cancelSubscriptionBody,
  claimFounder30Body,
};
