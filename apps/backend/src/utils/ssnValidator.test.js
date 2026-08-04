const test = require('node:test');
const assert = require('node:assert/strict');

const { validateSSN, SHAPE } = require('./ssnValidator');

// The generic message is deliberate — it must not tell a probing caller which
// rule they tripped. Only the format error is specific.
const GENERIC = 'Please double-check your SSN';
const FORMAT = 'SSN must be in the format XXX-XX-XXXX';
const REQUIRED = 'SSN is required';

test('accepts a well-formed SSN that breaks no SSA rule', () => {
  assert.deepEqual(validateSSN('123-45-6788'), { valid: true });
  assert.deepEqual(validateSSN('001-01-0001'), { valid: true });
  assert.deepEqual(validateSSN('899-99-9998'), { valid: true });
});

test('trims surrounding whitespace before validating', () => {
  assert.deepEqual(validateSSN('  123-45-6788  '), { valid: true });
  assert.deepEqual(validateSSN('\t123-45-6788\n'), { valid: true });
});

test('rejects missing or non-string input as "required"', () => {
  for (const input of [undefined, null, '', 0, false, 123456789, {}, ['123-45-6788']]) {
    assert.deepEqual(
      validateSSN(input),
      { valid: false, error: REQUIRED },
      `expected "required" for ${JSON.stringify(input)}`,
    );
  }
});

test('rejects anything that is not exactly XXX-XX-XXXX', () => {
  const malformed = [
    '123456789',        // no dashes
    '12-345-6788',      // dashes in the wrong place
    '123-4-56788',
    '123-45-678',       // serial too short
    '123-45-67888',     // serial too long
    '1234-45-6788',     // area too long
    '123 45 6788',      // spaces instead of dashes
    'abc-de-fghi',
    '123-45-678a',
    '123-45-6788-',
    '-123-45-6788',
  ];
  for (const input of malformed) {
    assert.deepEqual(
      validateSSN(input),
      { valid: false, error: FORMAT },
      `expected format error for "${input}"`,
    );
  }
});

test('rejects SSA-reserved area numbers 000, 666 and the 9XX ITIN range', () => {
  assert.deepEqual(validateSSN('000-45-6788'), { valid: false, error: GENERIC });
  assert.deepEqual(validateSSN('666-45-6788'), { valid: false, error: GENERIC });
  for (const area of ['900', '912', '987', '999']) {
    assert.deepEqual(
      validateSSN(`${area}-45-6788`),
      { valid: false, error: GENERIC },
      `expected ${area} (ITIN range) to be rejected`,
    );
  }
});

test('rejects a 00 group and a 0000 serial', () => {
  assert.deepEqual(validateSSN('123-00-6788'), { valid: false, error: GENERIC });
  assert.deepEqual(validateSSN('123-45-0000'), { valid: false, error: GENERIC });
});

test('rejects all-same-digit placeholders', () => {
  for (let d = 1; d <= 8; d++) {
    const ssn = `${d}${d}${d}-${d}${d}-${d}${d}${d}${d}`;
    assert.deepEqual(
      validateSSN(ssn),
      { valid: false, error: GENERIC },
      `expected placeholder ${ssn} to be rejected`,
    );
  }
  // 000-00-0000 and 999-99-9999 are already caught by the range rules, but must
  // still be rejected.
  assert.equal(validateSSN('000-00-0000').valid, false);
  assert.equal(validateSSN('999-99-9999').valid, false);
});

test('rejects the documented known-invalid numbers', () => {
  for (const ssn of ['078-05-1120', '219-09-9999', '123-45-6789']) {
    assert.deepEqual(
      validateSSN(ssn),
      { valid: false, error: GENERIC },
      `expected known-invalid ${ssn} to be rejected`,
    );
  }
});

test('a near-miss of a known-invalid number is still accepted', () => {
  // Only the exact published values are blocklisted.
  assert.deepEqual(validateSSN('078-05-1121'), { valid: true });
  assert.deepEqual(validateSSN('219-09-9998'), { valid: true });
});

test('non-format failures never reveal which rule was broken', () => {
  const ruleBreakers = ['000-45-6788', '666-45-6788', '912-45-6788', '123-00-6788', '123-45-0000', '111-11-1111', '078-05-1120'];
  const messages = new Set(ruleBreakers.map((s) => validateSSN(s).error));
  assert.deepEqual([...messages], [GENERIC]);
});

test('exports the shape regex used by callers', () => {
  assert.ok(SHAPE instanceof RegExp);
  assert.ok(SHAPE.test('123-45-6788'));
  assert.ok(!SHAPE.test('123456788'));
  // Must be anchored — a valid SSN embedded in junk is not a valid SSN.
  assert.ok(!SHAPE.test('xx123-45-6788xx'));
});
