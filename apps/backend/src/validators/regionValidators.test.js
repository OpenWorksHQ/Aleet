const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createRegionBody,
  updateRegionBody,
  regionIdParams,
  sameDayStatusQuery,
} = require('./regionValidators');

const OID = '507f1f77bcf86cd799439011';

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

test('createRegionBody accepts the admin-portal payload', () => {
  parse(createRegionBody, { name: 'Sacramento', code: 'SAC' });
});

test('createRegionBody reuses the controller message for both missing fields', () => {
  assert.equal(firstMessage(createRegionBody, {}), 'Name and code are required');
  assert.equal(firstMessage(createRegionBody, { name: 'Sacramento' }), 'Name and code are required');
  assert.equal(firstMessage(createRegionBody, { code: 'SAC' }), 'Name and code are required');
  assert.equal(firstMessage(createRegionBody, { name: '', code: 'SAC' }), 'Name and code are required');
});

test('createRegionBody blocks the $or lookup being fed an operator object', () => {
  // addRegion builds Region.findOne({ $or: [{ name }, { code }] }) from the body.
  assert.equal(
    firstMessage(createRegionBody, { name: { $ne: null }, code: 'SAC' }),
    'Name and code are required',
  );
  assert.equal(
    firstMessage(createRegionBody, { name: 'Sacramento', code: { $regex: '.*' } }),
    'Name and code are required',
  );
});

test('createRegionBody caps name and code length', () => {
  assert.match(
    firstMessage(createRegionBody, { name: 'x'.repeat(121), code: 'SAC' }),
    /Name must be at most 120 characters/,
  );
  assert.match(
    firstMessage(createRegionBody, { name: 'Sacramento', code: 'x'.repeat(21) }),
    /Code must be at most 20 characters/,
  );
});

test('updateRegionBody accepts any subset of the editable fields', () => {
  parse(updateRegionBody, {});
  parse(updateRegionBody, { name: 'Sacramento Metro' });
  parse(updateRegionBody, { isActive: false });
  parse(updateRegionBody, { name: 'SAC', code: 'SAC', isActive: true, sameDayManualBlock: false });
});

test('updateRegionBody rejects null, which used to crash on name.trim()', () => {
  assert.equal(firstMessage(updateRegionBody, { name: null }), 'Name must be a string');
  assert.equal(firstMessage(updateRegionBody, { code: null }), 'Code must be a string');
});

test('updateRegionBody requires real booleans for the toggles', () => {
  assert.equal(firstMessage(updateRegionBody, { isActive: 'yes' }), 'isActive must be true or false');
  assert.equal(
    firstMessage(updateRegionBody, { sameDayManualBlock: 1 }),
    'sameDayManualBlock must be true or false',
  );
  parse(updateRegionBody, { isActive: 'true' });
});

test('regionIdParams accepts an ObjectId and nothing else', () => {
  parse(regionIdParams, { id: OID });
  assert.equal(firstMessage(regionIdParams, { id: 'all' }), 'Invalid region ID');
  assert.equal(firstMessage(regionIdParams, {}), 'Invalid region ID');
});

test('sameDayStatusQuery accepts the optional trip window the booking flow sends', () => {
  parse(sameDayStatusQuery, {});
  parse(sameDayStatusQuery, {
    startDate: '2025-10-12T16:00:00.000Z',
    endDate: '2025-10-12T20:00:00.000Z',
  });
});

test('sameDayStatusQuery rejects non-string dates and oversized values', () => {
  assert.equal(
    firstMessage(sameDayStatusQuery, { startDate: { $ne: null } }),
    'startDate must be a string',
  );
  assert.equal(sameDayStatusQuery.safeParse({ endDate: 'x'.repeat(65) }).success, false);
});
