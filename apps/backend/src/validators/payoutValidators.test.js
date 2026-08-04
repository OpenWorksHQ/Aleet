const test = require('node:test');
const assert = require('node:assert/strict');

const {
  payoutBookingParams,
  payoutRunQuery,
  payoutToAccountBody,
} = require('./payoutValidators');

const OID = '507f1f77bcf86cd799439011';
const ACCT = 'acct_1PabcdEFGHijkl';

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

// ── single booking payout ───────────────────────────────────────────────────

test('payoutBookingParams accepts the id the driver portal posts', () => {
  parse(payoutBookingParams, { id: OID });
});

test('payoutBookingParams rejects anything that is not an ObjectId', () => {
  assert.equal(firstMessage(payoutBookingParams, {}), 'Invalid booking ID');
  assert.equal(firstMessage(payoutBookingParams, { id: 'all' }), 'Invalid booking ID');
  assert.equal(firstMessage(payoutBookingParams, { id: `${OID}extra` }), 'Invalid booking ID');
});

// ── bulk run ────────────────────────────────────────────────────────────────

test('payoutRunQuery accepts an absent or numeric limit', () => {
  parse(payoutRunQuery, {});
  parse(payoutRunQuery, { limit: '50' });
  parse(payoutRunQuery, { limit: 200 });
});

test('payoutRunQuery rejects a limit that is not a number', () => {
  assert.equal(firstMessage(payoutRunQuery, { limit: { $gt: 0 } }), 'limit must be a number');
  assert.equal(firstMessage(payoutRunQuery, { limit: ['1', '2'] }), 'limit must be a number');
  assert.equal(firstMessage(payoutRunQuery, { limit: 'all' }), 'limit must be a number');
});

// ── manual transfer ─────────────────────────────────────────────────────────

test('payoutToAccountBody accepts a real Connect account and dollar amount', () => {
  parse(payoutToAccountBody, { accountId: ACCT, amount: 125.5 });
  parse(payoutToAccountBody, { accountId: ACCT, amount: '125.50' });
});

test('payoutToAccountBody preserves the controller messages for missing input', () => {
  assert.equal(firstMessage(payoutToAccountBody, {}), 'stripeAccountId is required.');
  assert.equal(
    firstMessage(payoutToAccountBody, { accountId: ACCT }),
    'Valid amount (in dollars) is required.',
  );
});

test('payoutToAccountBody rejects a negative or zero transfer', () => {
  assert.equal(
    firstMessage(payoutToAccountBody, { accountId: ACCT, amount: 0 }),
    'amount must be at least 0.01',
  );
  assert.equal(
    firstMessage(payoutToAccountBody, { accountId: ACCT, amount: -500 }),
    'amount must be at least 0.01',
  );
  assert.equal(
    firstMessage(payoutToAccountBody, { accountId: ACCT, amount: '-500' }),
    'amount must be at least 0.01',
  );
});

test('payoutToAccountBody caps a single manual transfer', () => {
  assert.equal(
    firstMessage(payoutToAccountBody, { accountId: ACCT, amount: 1_000_001 }),
    'amount must be at most 1000000',
  );
});

test('payoutToAccountBody rejects a non-numeric amount that Math.round would turn into NaN', () => {
  for (const value of [{ $gt: 0 }, ['500'], 'five hundred', true, null]) {
    assert.equal(
      payoutToAccountBody.safeParse({ accountId: ACCT, amount: value }).success,
      false,
      `expected amount ${JSON.stringify(value)} to be rejected`,
    );
  }
});

test('payoutToAccountBody only accepts acct_ destinations', () => {
  assert.equal(
    firstMessage(payoutToAccountBody, { accountId: 'cus_123', amount: 10 }),
    'accountId is invalid',
  );
  assert.equal(
    firstMessage(payoutToAccountBody, { accountId: { $ne: null }, amount: 10 }),
    'accountId is invalid',
  );
  assert.equal(
    firstMessage(payoutToAccountBody, { accountId: 'acct_../..', amount: 10 }),
    'accountId is invalid',
  );
});
