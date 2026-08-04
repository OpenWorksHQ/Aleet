const test = require('node:test');
const assert = require('node:assert/strict');

const { createAddOnBody, updateAddOnBody, addOnIdParams } = require('./addOnValidators');

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

test('createAddOnBody accepts the admin-portal payloads for both add-on types', () => {
  parse(createAddOnBody, { name: 'VIP Comforts', description: 'Blankets etc', type: 'paid', price: 45 });
  parse(createAddOnBody, { name: 'Water', description: 'Bottled water', type: 'free' });
});

test('createAddOnBody reuses the controller message for the three required fields', () => {
  assert.equal(firstMessage(createAddOnBody, {}), 'Name, description, and type are required');
  assert.equal(
    firstMessage(createAddOnBody, { name: 'VIP', description: 'x' }),
    'Name, description, and type are required',
  );
  assert.equal(
    firstMessage(createAddOnBody, { name: 'VIP', type: 'free' }),
    'Name, description, and type are required',
  );
});

test('createAddOnBody leaves the "price required for paid add-ons" rule to the controller', () => {
  // addOnController owns "Price is required for paid add-ons".
  parse(createAddOnBody, { name: 'VIP', description: 'x', type: 'paid' });
});

test('createAddOnBody restricts type to the enum the AddOn model declares', () => {
  assert.equal(
    firstMessage(createAddOnBody, { name: 'VIP', description: 'x', type: 'complimentary' }),
    'Type must be "free" or "paid"',
  );
  assert.equal(
    firstMessage(createAddOnBody, { name: 'VIP', description: 'x', type: { $ne: 'free' } }),
    'Type must be "free" or "paid"',
  );
});

test('createAddOnBody blocks an operator object reaching AddOn.findOne({ name })', () => {
  assert.equal(
    firstMessage(createAddOnBody, { name: { $ne: null }, description: 'x', type: 'free' }),
    'Name, description, and type are required',
  );
});

test('createAddOnBody rejects a negative price', () => {
  assert.equal(
    firstMessage(createAddOnBody, { name: 'VIP', description: 'x', type: 'paid', price: -10 }),
    'Price must be at least 0',
  );
  assert.equal(
    firstMessage(createAddOnBody, { name: 'VIP', description: 'x', type: 'paid', price: { $gt: 0 } }),
    'Price must be a number',
  );
});

test('createAddOnBody caps price and free-text length', () => {
  assert.equal(
    firstMessage(createAddOnBody, { name: 'VIP', description: 'x', type: 'paid', price: 1e9 }),
    'Price must be at most 100000',
  );
  assert.match(
    firstMessage(createAddOnBody, { name: 'x'.repeat(121), description: 'x', type: 'free' }),
    /Name must be at most 120 characters/,
  );
});

test('updateAddOnBody accepts any subset and still types every field', () => {
  parse(updateAddOnBody, {});
  parse(updateAddOnBody, { price: 55 });
  parse(updateAddOnBody, { name: 'VIP', description: 'x', type: 'paid', price: '55' });
  assert.equal(firstMessage(updateAddOnBody, { type: 'gratis' }), 'Type must be "free" or "paid"');
  assert.equal(firstMessage(updateAddOnBody, { price: -1 }), 'Price must be at least 0');
  assert.equal(firstMessage(updateAddOnBody, { name: { $ne: null } }), 'Name must be a string');
});

test('addOnIdParams accepts an ObjectId and nothing else', () => {
  parse(addOnIdParams, { id: OID });
  assert.equal(firstMessage(addOnIdParams, { id: 'all' }), 'Invalid add-on ID');
  assert.equal(firstMessage(addOnIdParams, {}), 'Invalid add-on ID');
});
