const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createVehicleTypeBody,
  updateVehicleTypeBody,
  vehicleTypeIdParams,
  listVehicleTypesQuery,
} = require('./vehicleTypeValidators');

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

test('createVehicleTypeBody accepts the admin-portal payload', () => {
  parse(createVehicleTypeBody, {
    name: 'Executive Sedan',
    description: 'Black car, 3 passengers',
    hourlyPrice: 129,
  });
  parse(createVehicleTypeBody, {
    name: 'Sprinter',
    description: 'Up to 12 passengers',
    hourlyPrice: '249.50',
    isPrivate: true,
  });
});

test('createVehicleTypeBody reuses the controller message for the required trio', () => {
  assert.equal(firstMessage(createVehicleTypeBody, {}), 'Name, description, and hourly price are required');
  assert.equal(
    firstMessage(createVehicleTypeBody, { name: 'Sedan', description: 'x' }),
    'Name, description, and hourly price are required',
  );
});

test('createVehicleTypeBody keeps rejecting a zero hourly price, as `!hourlyPrice` did', () => {
  assert.equal(
    firstMessage(createVehicleTypeBody, { name: 'Sedan', description: 'x', hourlyPrice: 0 }),
    'Hourly price must be at least 0.01',
  );
});

test('createVehicleTypeBody rejects a negative base rate — every booking price derives from it', () => {
  assert.equal(
    firstMessage(createVehicleTypeBody, { name: 'Sedan', description: 'x', hourlyPrice: -100 }),
    'Hourly price must be at least 0.01',
  );
  assert.equal(
    firstMessage(createVehicleTypeBody, { name: 'Sedan', description: 'x', hourlyPrice: '-100' }),
    'Hourly price must be at least 0.01',
  );
});

test('createVehicleTypeBody rejects a non-numeric hourly price', () => {
  assert.equal(
    firstMessage(createVehicleTypeBody, { name: 'Sedan', description: 'x', hourlyPrice: { $gt: 0 } }),
    'Hourly price must be a number',
  );
  assert.equal(
    firstMessage(createVehicleTypeBody, { name: 'Sedan', description: 'x', hourlyPrice: 'free' }),
    'Hourly price must be a number',
  );
});

test('createVehicleTypeBody blocks an operator object reaching VehicleType.findOne({ name })', () => {
  assert.equal(
    firstMessage(createVehicleTypeBody, { name: { $ne: null }, description: 'x', hourlyPrice: 100 }),
    'Name, description, and hourly price are required',
  );
});

test('createVehicleTypeBody requires a real boolean for isPrivate', () => {
  parse(createVehicleTypeBody, { name: 'S', description: 'x', hourlyPrice: 1, isPrivate: 'false' });
  assert.equal(
    firstMessage(createVehicleTypeBody, {
      name: 'S',
      description: 'x',
      hourlyPrice: 1,
      isPrivate: 'sometimes',
    }),
    'isPrivate must be true or false',
  );
});

test('updateVehicleTypeBody accepts any subset and still types every field', () => {
  parse(updateVehicleTypeBody, {});
  parse(updateVehicleTypeBody, { hourlyPrice: 149 });
  parse(updateVehicleTypeBody, { name: 'Sedan', description: 'x', isPrivate: false });
  assert.equal(firstMessage(updateVehicleTypeBody, { hourlyPrice: -1 }), 'Hourly price must be at least 0');
  assert.equal(firstMessage(updateVehicleTypeBody, { name: { $ne: null } }), 'Name must be a string');
});

test('vehicleTypeIdParams accepts an ObjectId and nothing else', () => {
  parse(vehicleTypeIdParams, { id: OID });
  assert.equal(firstMessage(vehicleTypeIdParams, { id: 'all' }), 'Invalid vehicle type ID');
  assert.equal(firstMessage(vehicleTypeIdParams, {}), 'Invalid vehicle type ID');
});

test('listVehicleTypesQuery accepts the includePrivate flag both portals send', () => {
  parse(listVehicleTypesQuery, {});
  parse(listVehicleTypesQuery, { includePrivate: '1' });
  parse(listVehicleTypesQuery, { includePrivate: 'true' });
  assert.equal(
    firstMessage(listVehicleTypesQuery, { includePrivate: { $ne: null } }),
    'includePrivate must be a string',
  );
});
