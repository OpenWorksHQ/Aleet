const test = require('node:test');
const assert = require('node:assert/strict');

const {
  PLAN_MESSAGE,
  createSubscriptionCheckoutBody,
  chargeSubscriptionBody,
  processSubscriptionPaymentBody,
  cancelSubscriptionBody,
  claimFounder30Body,
} = require('./subscriptionValidators');

const PM = 'pm_1PabcdEFGHijkl';
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

// ── checkout ────────────────────────────────────────────────────────────────

test('createSubscriptionCheckoutBody accepts both plans and an omitted plan', () => {
  parse(createSubscriptionCheckoutBody, {});
  parse(createSubscriptionCheckoutBody, { plan: 'standard' });
  parse(createSubscriptionCheckoutBody, { plan: 'founder30' });
});

test('an unknown plan is rejected with the controller message, unchanged', () => {
  assert.equal(firstMessage(createSubscriptionCheckoutBody, { plan: 'free' }), PLAN_MESSAGE);
  assert.equal(PLAN_MESSAGE, 'plan must be "standard" or "founder30"');
});

test('plan cannot be an operator object that would bypass the allow-list', () => {
  assert.equal(
    firstMessage(createSubscriptionCheckoutBody, { plan: { $ne: 'standard' } }),
    PLAN_MESSAGE,
  );
  assert.equal(firstMessage(createSubscriptionCheckoutBody, { plan: ['founder30'] }), PLAN_MESSAGE);
});

// ── charge saved card ───────────────────────────────────────────────────────

test('chargeSubscriptionBody accepts the frontend payload', () => {
  parse(chargeSubscriptionBody, { paymentMethodId: PM });
  parse(chargeSubscriptionBody, { plan: 'founder30', paymentMethodId: PM });
});

test('chargeSubscriptionBody requires a payment method before charging', () => {
  assert.equal(firstMessage(chargeSubscriptionBody, {}), 'paymentMethodId is required');
  assert.equal(
    firstMessage(chargeSubscriptionBody, { paymentMethodId: 'pi_123' }),
    'paymentMethodId is invalid',
  );
  assert.equal(
    firstMessage(chargeSubscriptionBody, { paymentMethodId: { $ne: null } }),
    'paymentMethodId is invalid',
  );
});

// ── process payment ─────────────────────────────────────────────────────────

test('processSubscriptionPaymentBody requires a Stripe checkout session id', () => {
  parse(processSubscriptionPaymentBody, { sessionId: CS });
  assert.equal(firstMessage(processSubscriptionPaymentBody, {}), 'Session ID is required');
  assert.equal(
    firstMessage(processSubscriptionPaymentBody, { sessionId: 'pi_123' }),
    'sessionId is invalid',
  );
  assert.equal(
    firstMessage(processSubscriptionPaymentBody, { sessionId: { $ne: null } }),
    'sessionId is invalid',
  );
});

// ── cancel ──────────────────────────────────────────────────────────────────

test('cancelSubscriptionBody accepts the bodyless POST apps/frontend sends', () => {
  parse(cancelSubscriptionBody, {});
  parse(cancelSubscriptionBody, { reason: 'Too expensive' });
  parse(cancelSubscriptionBody, { reason: null });
});

test('cancelSubscriptionBody still rejects a non-string reason and caps its length', () => {
  assert.equal(
    firstMessage(cancelSubscriptionBody, { reason: { $ne: null } }),
    'reason must be a string',
  );
  assert.match(
    firstMessage(cancelSubscriptionBody, { reason: 'x'.repeat(2001) }),
    /reason must be at most 2000 characters/,
  );
});

// ── founder 30 ──────────────────────────────────────────────────────────────

test('claimFounder30Body requires a token, matching the controller message', () => {
  parse(claimFounder30Body, { token: 'F30-SPRING-2026' });
  assert.equal(firstMessage(claimFounder30Body, {}), 'token is required');
  assert.equal(firstMessage(claimFounder30Body, { token: '' }), 'token is required');
});

test('claimFounder30Body blocks an operator object reaching FounderInvite.findOne', () => {
  assert.equal(firstMessage(claimFounder30Body, { token: { $ne: null } }), 'token must be a string');
  assert.equal(firstMessage(claimFounder30Body, { token: { $regex: '.*' } }), 'token must be a string');
});

test('claimFounder30Body caps the token length', () => {
  assert.match(
    firstMessage(claimFounder30Body, { token: 'x'.repeat(201) }),
    /token must be at most 200 characters/,
  );
});
