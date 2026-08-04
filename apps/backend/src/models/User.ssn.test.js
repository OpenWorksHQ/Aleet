/**
 * Proves the driver.ssn setter/getter wiring on the User schema.
 *
 * No MongoDB: mongoose documents can be constructed, cast, and read entirely
 * in memory. Only the update-payload casting helper is reached through the
 * query API, which likewise needs no connection.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

process.env.SSN_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');

const mongoose = require('mongoose');
const User = require('./User');
const { isEncrypted } = require('../utils/ssnCrypto');
const { maskSSN } = require('../utils/maskSSN');

const PLAIN = '123-45-6789';

/** What is actually persisted, bypassing the getter. */
const rawSsn = (doc) => doc.get('driver.ssn', null, { getters: false });

const newDriver = (driver) =>
  new User({ phone: '+15550000000', role: 'driver', driver });

test('constructing a driver encrypts the SSN at rest', () => {
  const user = newDriver({ ssn: PLAIN });
  assert.ok(isEncrypted(rawSsn(user)), 'stored value must be enc:v1:...');
  assert.ok(!rawSsn(user).includes('6789'));
});

test('reading driver.ssn transparently decrypts', () => {
  const user = newDriver({ ssn: PLAIN });
  assert.equal(user.driver.ssn, PLAIN);
});

test('assigning after construction is encrypted too', () => {
  const user = newDriver({});
  user.driver.ssn = '987-65-4321';
  assert.ok(isEncrypted(rawSsn(user)));
  assert.equal(user.driver.ssn, '987-65-4321');

  const dotted = newDriver({});
  dotted.set('driver.ssn', '111-22-3333');
  assert.ok(isEncrypted(rawSsn(dotted)));
  assert.equal(dotted.driver.ssn, '111-22-3333');
});

test('setters run on findByIdAndUpdate payloads (userController update path)', () => {
  // userController.updateDriverProfile does:
  //   updateData['driver.ssn'] = ssn;  await User.findByIdAndUpdate(id, { $set: updateData })
  const query = User.findByIdAndUpdate(
    new mongoose.Types.ObjectId(),
    { $set: { 'driver.ssn': PLAIN, 'driver.tier': 'Pro' } },
    { new: true },
  );
  const cast = query._castUpdate(query._update, query._mongooseOptions);
  assert.ok(
    isEncrypted(cast.$set['driver.ssn']),
    'the dotted-path update must be encrypted before it reaches mongo',
  );
  assert.equal(cast.$set['driver.tier'], 'Pro', 'other fields untouched');
});

test('a legacy plaintext row still reads and masks correctly', () => {
  // hydrate() models a document loaded straight from mongo — exactly what a
  // pre-migration row looks like.
  const legacy = User.hydrate({
    _id: new mongoose.Types.ObjectId(),
    phone: '+15550000001',
    role: 'driver',
    driver: { ssn: PLAIN },
  });
  assert.equal(legacy.driver.ssn, PLAIN);
  assert.equal(maskSSN(legacy.driver.ssn), '***-**-6789');
});

test('an encrypted row masks to the same value a legacy row does', () => {
  const encryptedAtRest = rawSsn(newDriver({ ssn: PLAIN }));
  const migrated = User.hydrate({
    _id: new mongoose.Types.ObjectId(),
    phone: '+15550000002',
    role: 'driver',
    driver: { ssn: encryptedAtRest },
  });
  assert.equal(maskSSN(migrated.driver.ssn), '***-**-6789');
});

test('a missing SSN stays null rather than becoming a ciphertext', () => {
  const user = newDriver({ ssn: null });
  assert.equal(rawSsn(user), null);
  assert.equal(user.driver.ssn, null);
  assert.equal(maskSSN(user.driver.ssn), null);

  const absent = newDriver({});
  assert.equal(absent.driver.ssn, undefined);
  assert.equal(maskSSN(absent.driver.ssn), null);
});

test('an undecryptable row yields null, not a corrupted value', () => {
  const foreign = crypto.randomBytes(32).toString('hex');
  const savedKey = process.env.SSN_ENCRYPTION_KEY;
  process.env.SSN_ENCRYPTION_KEY = foreign;
  const written = rawSsn(newDriver({ ssn: PLAIN }));
  process.env.SSN_ENCRYPTION_KEY = savedKey;

  const doc = User.hydrate({
    _id: new mongoose.Types.ObjectId(),
    phone: '+15550000003',
    role: 'driver',
    driver: { ssn: written },
  });

  // The getter logs and returns null; masking a null yields null ("no SSN on
  // file") instead of a plausible-looking wrong number.
  assert.equal(doc.driver.ssn, null);
  assert.equal(maskSSN(doc.driver.ssn), null);
});

test('toObject()/lean-shaped output exposes ciphertext, never plaintext', () => {
  // Getters do not run for toObject()/toJSON() or .lean(). That is safe here:
  // what escapes is the envelope, not the SSN. Documented on the schema path.
  const user = newDriver({ ssn: PLAIN });
  const plainObject = user.toObject();
  assert.ok(isEncrypted(plainObject.driver.ssn));
  assert.ok(!JSON.stringify(plainObject).includes('6789'));
});
