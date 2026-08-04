const test = require('node:test');
const assert = require('node:assert');

const { generateOTP } = require('./twilioService');

test('generateOTP returns a 6-digit numeric string', () => {
  for (let i = 0; i < 200; i += 1) {
    const otp = generateOTP();
    assert.strictEqual(typeof otp, 'string');
    assert.match(otp, /^\d{6}$/, `expected 6 digits, got "${otp}"`);
  }
});

test('generateOTP stays within 100000-999999 inclusive', () => {
  for (let i = 0; i < 500; i += 1) {
    const n = Number(generateOTP());
    assert.ok(n >= 100000, `${n} below range`);
    assert.ok(n <= 999999, `${n} above range`);
  }
});

test('generateOTP never emits a leading zero', () => {
  // A code padded from a smaller range (e.g. randomInt(0, 1000000)) would
  // produce "042318"; some SMS clients and form inputs drop the leading zero,
  // which silently breaks verification.
  for (let i = 0; i < 500; i += 1) {
    assert.notStrictEqual(generateOTP()[0], '0');
  }
});

test('generateOTP does not repeat over many draws', () => {
  // Not a randomness proof — a regression tripwire. A constant or
  // low-entropy source would collapse this set.
  const seen = new Set();
  for (let i = 0; i < 1000; i += 1) seen.add(generateOTP());
  assert.ok(seen.size > 950, `only ${seen.size} distinct codes in 1000 draws`);
});

test('generateOTP covers the full range, not just a sub-band', () => {
  // Guards against an off-by-one bound (e.g. randomInt(100000, 999999) can
  // never emit 999999) and against a truncated range.
  let sawLowDecile = false;
  let sawHighDecile = false;
  for (let i = 0; i < 5000; i += 1) {
    const n = Number(generateOTP());
    if (n < 190000) sawLowDecile = true;
    if (n > 910000) sawHighDecile = true;
    if (sawLowDecile && sawHighDecile) break;
  }
  assert.ok(sawLowDecile, 'never produced a code in the bottom of the range');
  assert.ok(sawHighDecile, 'never produced a code in the top of the range');
});
