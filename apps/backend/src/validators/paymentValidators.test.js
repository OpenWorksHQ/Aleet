const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createCheckoutSessionBody,
  sessionParams,
  setDefaultCardBody,
  paymentMethodParams,
  chargeSavedCardBody,
  bookingPaymentIntentBody,
  confirmBookingPaymentBody,
} = require('./paymentValidators');

const OID = '507f1f77bcf86cd799439011';
const PM = 'pm_1PabcdEFGHijkl';
const PI = 'pi_3PabcdEFGHijkl';
const CS = 'cs_test_a1B2c3D4e5F6g7H8i9J0';

const firstMessage = (schema, value) => {
  const result = schema.safeParse(value);
  assert.equal(result.success, false, `expected ${JSON.stringify(value)} to be rejected`);
  return result.error.issues[0].message;
};

const parse = (schema, value) => {
  const result = schema.safeParse(value);
  assert.equal(
    result.success,
    true,
    result.success ? '' : `unexpectedly rejected: ${result.error.issues[0].message}`,
  );
  return result.data;
};

/** Every shape a caller might use to smuggle a non-scalar into a money path. */
const HOSTILE = [{ $ne: null }, { $gt: '' }, ['x'], true, null];

// ── checkout session ────────────────────────────────────────────────────────

test('createCheckoutSessionBody accepts the frontend payload with and without a tip', () => {
  parse(createCheckoutSessionBody, { bookingId: OID });
  parse(createCheckoutSessionBody, { bookingId: OID, tip: 20 });
  parse(createCheckoutSessionBody, { bookingId: OID, tip: '20.50' });
  parse(createCheckoutSessionBody, { bookingId: OID, tip: 0 });
  parse(createCheckoutSessionBody, { bookingId: OID, tip: null });
});

test('createCheckoutSessionBody requires a real booking id', () => {
  assert.equal(firstMessage(createCheckoutSessionBody, {}), 'bookingId is required');
  for (const hostile of HOSTILE) {
    assert.equal(createCheckoutSessionBody.safeParse({ bookingId: hostile }).success, false);
  }
});

test('a negative tip can no longer be sent to the checkout amount calculation', () => {
  assert.equal(
    firstMessage(createCheckoutSessionBody, { bookingId: OID, tip: -100 }),
    'tip must be at least 0',
  );
  assert.equal(
    firstMessage(createCheckoutSessionBody, { bookingId: OID, tip: '-0.01' }),
    'tip must be at least 0',
  );
});

test('an absurd tip is rejected rather than charged', () => {
  assert.equal(
    firstMessage(createCheckoutSessionBody, { bookingId: OID, tip: 1e9 }),
    'tip must be at most 100000',
  );
});

test('a non-numeric tip is rejected instead of quietly becoming 0', () => {
  assert.equal(
    firstMessage(createCheckoutSessionBody, { bookingId: OID, tip: { $gt: 0 } }),
    'tip must be a number',
  );
  assert.equal(
    firstMessage(createCheckoutSessionBody, { bookingId: OID, tip: 'lots' }),
    'tip must be a number',
  );
});

// ── session param ───────────────────────────────────────────────────────────

test('sessionParams accepts a Stripe checkout session id', () => {
  parse(sessionParams, { sessionId: CS });
  parse(sessionParams, { sessionId: 'cs_live_ABC123' });
});

test('sessionParams rejects path traversal and wrong-object ids', () => {
  assert.equal(firstMessage(sessionParams, { sessionId: '../../admin' }), 'sessionId is invalid');
  assert.equal(firstMessage(sessionParams, { sessionId: 'pi_123' }), 'sessionId is invalid');
  assert.equal(firstMessage(sessionParams, { sessionId: 'cs_a/b' }), 'sessionId is invalid');
  assert.equal(firstMessage(sessionParams, {}), 'sessionId is required');
});

// ── saved cards ─────────────────────────────────────────────────────────────

test('setDefaultCardBody keeps the controller wording for a missing card id', () => {
  parse(setDefaultCardBody, { paymentMethodId: PM });
  assert.equal(firstMessage(setDefaultCardBody, {}), 'paymentMethodId is required');
  assert.equal(
    firstMessage(setDefaultCardBody, { paymentMethodId: { $ne: null } }),
    'paymentMethodId is invalid',
  );
});

test('paymentMethodParams only accepts pm_ ids', () => {
  parse(paymentMethodParams, { paymentMethodId: PM });
  assert.equal(
    firstMessage(paymentMethodParams, { paymentMethodId: 'card_legacy' }),
    'paymentMethodId is invalid',
  );
  assert.equal(
    firstMessage(paymentMethodParams, { paymentMethodId: '..%2F..%2Fadmin' }),
    'paymentMethodId is invalid',
  );
});

// ── charge saved card ───────────────────────────────────────────────────────

test('chargeSavedCardBody accepts the exact frontend payload', () => {
  parse(chargeSavedCardBody, { bookingId: OID, paymentMethodId: PM });
  parse(chargeSavedCardBody, { bookingId: OID, paymentMethodId: PM, tip: 15 });
});

test('chargeSavedCardBody demands both ids before any Stripe call is made', () => {
  assert.equal(firstMessage(chargeSavedCardBody, {}), 'bookingId is required');
  assert.equal(
    firstMessage(chargeSavedCardBody, { bookingId: OID }),
    'paymentMethodId is required',
  );
  assert.equal(
    firstMessage(chargeSavedCardBody, { bookingId: { $ne: null }, paymentMethodId: PM }),
    'bookingId must be a valid ID',
  );
});

test('chargeSavedCardBody rejects a negative tip on a live charge', () => {
  assert.equal(
    firstMessage(chargeSavedCardBody, { bookingId: OID, paymentMethodId: PM, tip: -25 }),
    'tip must be at least 0',
  );
});

// ── inline payment intent ───────────────────────────────────────────────────

test('bookingPaymentIntentBody mirrors createBookingPaymentIntent', () => {
  parse(bookingPaymentIntentBody, { bookingId: OID });
  parse(bookingPaymentIntentBody, { bookingId: OID, tip: 10 });
  assert.equal(firstMessage(bookingPaymentIntentBody, {}), 'bookingId is required');
  assert.equal(
    firstMessage(bookingPaymentIntentBody, { bookingId: OID, tip: -1 }),
    'tip must be at least 0',
  );
});

test('confirmBookingPaymentBody only accepts a pi_ payment intent id', () => {
  parse(confirmBookingPaymentBody, { paymentIntentId: PI });
  assert.equal(firstMessage(confirmBookingPaymentBody, {}), 'paymentIntentId is required');
  assert.equal(
    firstMessage(confirmBookingPaymentBody, { paymentIntentId: 'cs_test_123' }),
    'paymentIntentId is invalid',
  );
  assert.equal(
    firstMessage(confirmBookingPaymentBody, { paymentIntentId: { $ne: null } }),
    'paymentIntentId is invalid',
  );
});

test('payment bodies stay loose so unrelated client fields do not 400', () => {
  const parsed = parse(createCheckoutSessionBody, { bookingId: OID, analyticsId: 'abc' });
  assert.equal(parsed.analyticsId, 'abc');
});
