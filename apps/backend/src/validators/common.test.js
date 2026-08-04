const test = require('node:test');
const assert = require('node:assert/strict');

const {
  requiredString,
  optionalString,
  nullableString,
  objectId,
  numberLike,
  amount,
  booleanLike,
  stringOrStringArray,
  objectIdArray,
  opaqueToken,
  stripeId,
  httpUrl,
  enumOf,
  OBJECT_ID_RE,
} = require('./common');

const OID = '507f1f77bcf86cd799439011';

/** Every payload shape an attacker reaches for when probing a scalar field. */
const HOSTILE_SCALARS = [
  { $ne: null },
  { $gt: '' },
  { $regex: '.*' },
  { $where: 'sleep(1000)' },
  ['a'],
  [{ $ne: null }],
  true,
  { toString: 'not a function' },
];

const firstMessage = (schema, value) => {
  const result = schema.safeParse(value);
  assert.equal(result.success, false, `expected ${JSON.stringify(value)} to be rejected`);
  return result.error.issues[0].message;
};

const accepts = (schema, value) => schema.safeParse(value).success === true;

// ── requiredString ──────────────────────────────────────────────────────────

test('requiredString accepts normal text and rejects missing/empty values', () => {
  const schema = requiredString('name', { max: 10 });

  assert.ok(accepts(schema, 'Ada'));
  assert.equal(firstMessage(schema, undefined), 'name is required');
  assert.equal(firstMessage(schema, ''), 'name is required');
  assert.equal(firstMessage(schema, null), 'name must be a string');
});

test('requiredString rejects every NoSQL-operator shape', () => {
  const schema = requiredString('name');
  for (const hostile of HOSTILE_SCALARS) {
    assert.equal(
      schema.safeParse(hostile).success,
      false,
      `expected ${JSON.stringify(hostile)} to be rejected`,
    );
  }
});

test('requiredString caps oversized strings', () => {
  const schema = requiredString('name', { max: 120 });
  assert.ok(accepts(schema, 'x'.repeat(120)));
  assert.equal(firstMessage(schema, 'x'.repeat(121)), 'name must be at most 120 characters');
  // A 1 MB payload must not reach Mongo/regex either.
  assert.equal(schema.safeParse('x'.repeat(1_000_000)).success, false);
});

test('requiredString message override replaces both the missing and wrong-type text', () => {
  const schema = requiredString('Name', { message: 'Name and code are required' });
  assert.equal(firstMessage(schema, undefined), 'Name and code are required');
  assert.equal(firstMessage(schema, { $ne: null }), 'Name and code are required');
});

// ── optionalString / nullableString ─────────────────────────────────────────

test('optionalString allows absent and empty, still rejects non-strings', () => {
  const schema = optionalString('notes', { max: 20 });

  assert.ok(accepts(schema, undefined));
  assert.ok(accepts(schema, ''));
  assert.ok(accepts(schema, 'hello'));
  assert.equal(firstMessage(schema, { $ne: null }), 'notes must be a string');
  assert.equal(firstMessage(schema, null), 'notes must be a string');
});

test('nullableString additionally allows an explicit null', () => {
  const schema = nullableString('notes');
  assert.ok(accepts(schema, null));
  assert.ok(accepts(schema, undefined));
  assert.equal(schema.safeParse(['a']).success, false);
});

// ── objectId ────────────────────────────────────────────────────────────────

test('objectId accepts only 24-char hex', () => {
  const schema = objectId('Booking ID');

  assert.ok(accepts(schema, OID));
  assert.ok(accepts(schema, OID.toUpperCase()));
  assert.equal(firstMessage(schema, 'not-an-id'), 'Booking ID must be a valid ID');
  assert.equal(firstMessage(schema, OID.slice(0, 23)), 'Booking ID must be a valid ID');
  assert.equal(firstMessage(schema, `${OID}0`), 'Booking ID must be a valid ID');
  assert.equal(firstMessage(schema, undefined), 'Booking ID is required');
});

test('objectId rejects operator objects that would otherwise reach findById', () => {
  const schema = objectId('Booking ID');
  for (const hostile of HOSTILE_SCALARS) {
    assert.equal(schema.safeParse(hostile).success, false);
  }
});

test('OBJECT_ID_RE is anchored so a valid id cannot be smuggled inside a longer string', () => {
  assert.equal(OBJECT_ID_RE.test(`${OID} || 1==1`), false);
  assert.equal(OBJECT_ID_RE.test(`\n${OID}`), false);
});

// ── numberLike ──────────────────────────────────────────────────────────────

test('numberLike accepts numbers and clean numeric strings', () => {
  const schema = numberLike('quantity');

  assert.ok(accepts(schema, 3));
  assert.ok(accepts(schema, 3.5));
  assert.ok(accepts(schema, 0));
  assert.ok(accepts(schema, -2));
  assert.ok(accepts(schema, '3'));
  assert.ok(accepts(schema, ' 3.5 '), 'multipart/query values arrive padded');
});

test('numberLike rejects the values that slip past a bare Number() check', () => {
  const schema = numberLike('quantity');

  for (const value of ['', '  ', 'abc', '3abc', true, false, null, [3], { $gt: 0 }, NaN, Infinity]) {
    assert.equal(
      schema.safeParse(value).success,
      false,
      `expected ${JSON.stringify(value)} to be rejected`,
    );
  }
});

test('numberLike enforces min/max/integer with readable messages', () => {
  const bounded = numberLike('rating', { min: 1, max: 5, integer: true });

  assert.ok(accepts(bounded, 5));
  assert.equal(firstMessage(bounded, 0), 'rating must be at least 1');
  assert.equal(firstMessage(bounded, 6), 'rating must be at most 5');
  assert.equal(firstMessage(bounded, 2.5), 'rating must be a whole number');
});

test('numberLike bounds apply to numeric strings too', () => {
  const bounded = numberLike('limit', { min: 1, max: 10 });
  assert.equal(firstMessage(bounded, '0'), 'limit must be at least 1');
  assert.equal(firstMessage(bounded, '999'), 'limit must be at most 10');
});

// ── amount (money) ──────────────────────────────────────────────────────────

test('amount rejects negative money — the classic payment-tampering probe', () => {
  const tip = amount('tip', { max: 100000 });

  assert.ok(accepts(tip, 0));
  assert.ok(accepts(tip, 25.5));
  assert.equal(firstMessage(tip, -1), 'tip must be at least 0');
  assert.equal(firstMessage(tip, '-0.01'), 'tip must be at least 0');
  assert.equal(firstMessage(tip, -1e9), 'tip must be at least 0');
});

test('amount caps absurd values so one request cannot move a fortune', () => {
  const tip = amount('tip', { max: 100000 });
  assert.equal(firstMessage(tip, 100001), 'tip must be at most 100000');
  assert.equal(firstMessage(tip, Number.MAX_SAFE_INTEGER), 'tip must be at most 100000');
});

test('amount rejects non-numeric junk before it reaches Stripe', () => {
  const tip = amount('tip');
  for (const value of [{ $gt: 0 }, ['10'], 'ten', true, null]) {
    assert.equal(tip.safeParse(value).success, false);
  }
});

// ── booleanLike ─────────────────────────────────────────────────────────────

test('booleanLike accepts booleans and the multipart "true"/"false" strings only', () => {
  const schema = booleanLike('hasOwnVehicle');

  for (const value of [true, false, 'true', 'false']) {
    assert.ok(accepts(schema, value), `expected ${JSON.stringify(value)} to be accepted`);
  }
  for (const value of ['TRUE', 'yes', 1, 0, '1', null, {}, []]) {
    assert.equal(
      schema.safeParse(value).success,
      false,
      `expected ${JSON.stringify(value)} to be rejected`,
    );
  }
  assert.equal(firstMessage(schema, 'yes'), 'hasOwnVehicle must be true or false');
});

test('booleanLike is skippable once marked optional', () => {
  assert.ok(accepts(booleanLike('flag').optional(), undefined));
});

// ── stringOrStringArray ─────────────────────────────────────────────────────

test('stringOrStringArray covers both multipart shapes for a repeated field', () => {
  const schema = stringOrStringArray('vehicleTypes');

  assert.ok(accepts(schema, 'one'));
  assert.ok(accepts(schema, ['one', 'two']));
  assert.ok(accepts(schema, []));
});

test('stringOrStringArray rejects mixed and hostile members', () => {
  const schema = stringOrStringArray('vehicleTypes');

  assert.equal(
    firstMessage(schema, [{ $ne: null }]),
    'vehicleTypes must be a string or an array of strings',
  );
  assert.equal(
    firstMessage(schema, ['ok', 5]),
    'vehicleTypes must be a string or an array of strings',
  );
  assert.equal(
    firstMessage(schema, { $ne: null }),
    'vehicleTypes must be a string or an array of strings',
  );
});

test('stringOrStringArray caps item count and item length', () => {
  const schema = stringOrStringArray('vehicleTypes', { maxItems: 3, maxLength: 5 });

  assert.equal(
    firstMessage(schema, ['a', 'b', 'c', 'd']),
    'vehicleTypes must contain at most 3 items',
  );
  assert.equal(
    firstMessage(schema, ['x'.repeat(6)]),
    'vehicleTypes entries must be at most 5 characters',
  );
});

// ── objectIdArray ───────────────────────────────────────────────────────────

test('objectIdArray requires every member to be a real ObjectId', () => {
  const schema = objectIdArray('addOns');

  assert.ok(accepts(schema, []));
  assert.ok(accepts(schema, [OID, OID]));
  assert.equal(firstMessage(schema, [OID, 'nope']), 'Each addOns entry must be a valid ID');
  assert.equal(firstMessage(schema, [{ $ne: null }]), 'Each addOns entry must be a valid ID');
  assert.equal(firstMessage(schema, OID), 'addOns must be an array');
});

test('objectIdArray caps the number of ids so one request cannot fan out', () => {
  const schema = objectIdArray('addOns', { maxItems: 2 });
  assert.equal(
    firstMessage(schema, [OID, OID, OID]),
    'addOns must contain at most 2 items',
  );
});

// ── opaqueToken ─────────────────────────────────────────────────────────────

test('opaqueToken accepts JWT/base64url shapes and rejects anything exotic', () => {
  const schema = opaqueToken('signupToken');

  assert.ok(accepts(schema, 'eyJhbGciOi.eyJzdWIiOiJ4In0.sig-part_ok'));
  assert.equal(firstMessage(schema, 'has space'), 'signupToken is invalid');
  assert.equal(firstMessage(schema, 'tok\u0000en'), 'signupToken is invalid');
  assert.equal(firstMessage(schema, ''), 'signupToken is required');
  assert.equal(firstMessage(schema, undefined), 'signupToken is required');
  assert.equal(firstMessage(schema, { $ne: null }), 'signupToken is invalid');
});

test('opaqueToken caps length so jwt.verify is never handed a huge string', () => {
  const schema = opaqueToken('signupToken', { max: 32 });
  assert.equal(schema.safeParse('a'.repeat(33)).success, false);
});

// ── stripeId ────────────────────────────────────────────────────────────────

test('stripeId enforces the expected object prefix', () => {
  const schema = stripeId('paymentMethodId', { prefix: 'pm_' });

  assert.ok(accepts(schema, 'pm_1PabcdEFGH'));
  assert.equal(firstMessage(schema, 'pi_1Pabcd'), 'paymentMethodId is invalid');
  assert.equal(firstMessage(schema, 'pm_bad-char'), 'paymentMethodId is invalid');
  assert.equal(firstMessage(schema, '../../etc/passwd'), 'paymentMethodId is invalid');
});

test('stripeId rejects objects and empty values before they reach the Stripe SDK', () => {
  const schema = stripeId('sessionId', { prefix: 'cs_' });
  assert.equal(schema.safeParse({ $ne: null }).success, false);
  assert.equal(schema.safeParse('').success, false);
  assert.ok(accepts(schema, 'cs_test_a1B2c3D4'));
});

// ── httpUrl ─────────────────────────────────────────────────────────────────

test('httpUrl accepts absolute http(s) URLs only', () => {
  const schema = httpUrl('resetBaseUrl');

  assert.ok(accepts(schema, 'https://app.example.com/reset-password'));
  assert.ok(accepts(schema, 'http://localhost:3000/reset'));
  assert.equal(firstMessage(schema, 'javascript:alert(1)'), 'resetBaseUrl must be an http(s) URL');
  assert.equal(firstMessage(schema, '/relative'), 'resetBaseUrl must be an http(s) URL');
  assert.equal(firstMessage(schema, 'data:text/html,x'), 'resetBaseUrl must be an http(s) URL');
});

// ── enumOf ──────────────────────────────────────────────────────────────────

test('enumOf lists the accepted values and can word "missing" differently', () => {
  const schema = enumOf('action', ['accept', 'decline'], {
    message: 'Invalid action. Must be "accept" or "decline"',
    missingMessage: 'Booking ID and action are required',
  });

  assert.ok(accepts(schema, 'accept'));
  assert.equal(firstMessage(schema, 'delete'), 'Invalid action. Must be "accept" or "decline"');
  assert.equal(firstMessage(schema, undefined), 'Booking ID and action are required');
  assert.equal(
    firstMessage(schema, { $ne: 'accept' }),
    'Invalid action. Must be "accept" or "decline"',
  );
});

test('enumOf falls back to a generated message', () => {
  const schema = enumOf('plan', ['standard', 'founder30']);
  assert.equal(firstMessage(schema, 'free'), 'plan must be "standard" or "founder30"');
});
