const test = require('node:test');
const assert = require('node:assert/strict');

const { maskSSN } = require('./maskSSN');

test('masks everything but the last four digits', () => {
  assert.equal(maskSSN('123-45-6788'), '***-**-6788');
  assert.equal(maskSSN('123456788'), '***-**-6788');
});

test('strips any non-digit separators before masking', () => {
  assert.equal(maskSSN('123 45 6788'), '***-**-6788');
  assert.equal(maskSSN('123.45.6788'), '***-**-6788');
  assert.equal(maskSSN('123/45/6788'), '***-**-6788');
});

test('coerces non-string input rather than throwing', () => {
  assert.equal(maskSSN(123456788), '***-**-6788');
});

test('returns null for missing values, never the string "null"', () => {
  for (const input of [undefined, null, '', 0, false, NaN]) {
    assert.equal(maskSSN(input), null, `expected null for ${String(input)}`);
  }
});

test('never emits more than the last four digits', () => {
  const masked = maskSSN('123-45-6788');
  assert.ok(!masked.includes('123'));
  assert.ok(!masked.includes('45-67'));
  assert.equal(masked.replace(/\D/g, ''), '6788');
});

test('short inputs degrade to a shorter tail instead of padding', () => {
  // Fewer than four digits simply yields whatever is there — still no full SSN.
  assert.equal(maskSSN('88'), '***-**-88');
  assert.equal(maskSSN('---'), '***-**-');
});
