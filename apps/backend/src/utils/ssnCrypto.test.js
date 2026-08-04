const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

// Set a key BEFORE requiring the module so nothing observes the unset state.
// These tests never touch MongoDB and never read the real .env.
const TEST_KEY = crypto.randomBytes(32).toString('hex');
process.env.SSN_ENCRYPTION_KEY = TEST_KEY;

const {
  encryptSSN,
  decryptSSN,
  isEncrypted,
  hasKey,
  SsnCryptoError,
  KEY_HEX_LENGTH,
} = require('./ssnCrypto');
const { maskSSN } = require('./maskSSN');

const PLAIN = '123-45-6789';

/** Run `fn` with a temporarily patched environment, always restoring it. */
const withEnv = (patch, fn) => {
  const saved = {};
  for (const [k, v] of Object.entries(patch)) {
    saved[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  try {
    return fn();
  } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
};

// ---------------------------------------------------------------------------
// round trip
// ---------------------------------------------------------------------------

test('round-trips an SSN back to the original value', () => {
  const encrypted = encryptSSN(PLAIN);
  assert.notEqual(encrypted, PLAIN);
  assert.equal(decryptSSN(encrypted), PLAIN);
});

test('round-trips undashed and unusual-but-valid inputs', () => {
  for (const input of ['123456789', '000-00-0000', '987-65-4321']) {
    assert.equal(decryptSSN(encryptSSN(input)), input, `failed for ${input}`);
  }
});

test('ciphertext never contains the plaintext digits', () => {
  const encrypted = encryptSSN(PLAIN);
  assert.ok(!encrypted.includes('123'));
  assert.ok(!encrypted.includes('6789'));
  assert.ok(!encrypted.includes(PLAIN));
});

test('uses the self-describing enc:v1 envelope with five parts', () => {
  const encrypted = encryptSSN(PLAIN);
  const parts = encrypted.split(':');
  assert.equal(parts.length, 5);
  assert.equal(parts[0], 'enc');
  assert.equal(parts[1], 'v1');
  assert.equal(Buffer.from(parts[2], 'base64').length, 12); // IV
  assert.equal(Buffer.from(parts[3], 'base64').length, 16); // GCM auth tag
  assert.ok(Buffer.from(parts[4], 'base64').length > 0);    // ciphertext
});

// ---------------------------------------------------------------------------
// random IV
// ---------------------------------------------------------------------------

test('the same input encrypts differently every call (random IV)', () => {
  const a = encryptSSN(PLAIN);
  const b = encryptSSN(PLAIN);
  const c = encryptSSN(PLAIN);
  assert.notEqual(a, b);
  assert.notEqual(b, c);
  assert.notEqual(a, c);
  // ...but all still decrypt to the same value.
  for (const v of [a, b, c]) assert.equal(decryptSSN(v), PLAIN);
});

test('20 encryptions of one value produce 20 distinct ciphertexts', () => {
  const seen = new Set();
  for (let i = 0; i < 20; i += 1) seen.add(encryptSSN(PLAIN));
  assert.equal(seen.size, 20);
});

// ---------------------------------------------------------------------------
// tamper detection
// ---------------------------------------------------------------------------

test('tampering with the ciphertext is detected, not silently decrypted', () => {
  const parts = encryptSSN(PLAIN).split(':');
  const ct = Buffer.from(parts[4], 'base64');
  ct[0] ^= 0xff; // flip a bit
  parts[4] = ct.toString('base64');
  const tampered = parts.join(':');

  assert.ok(isEncrypted(tampered), 'still looks like our envelope');
  assert.throws(() => decryptSSN(tampered), SsnCryptoError);
});

test('tampering with the auth tag is detected', () => {
  const parts = encryptSSN(PLAIN).split(':');
  const tag = Buffer.from(parts[3], 'base64');
  tag[0] ^= 0xff;
  parts[3] = tag.toString('base64');
  assert.throws(() => decryptSSN(parts.join(':')), SsnCryptoError);
});

test('tampering with the IV is detected', () => {
  const parts = encryptSSN(PLAIN).split(':');
  const iv = Buffer.from(parts[2], 'base64');
  iv[0] ^= 0xff;
  parts[2] = iv.toString('base64');
  assert.throws(() => decryptSSN(parts.join(':')), SsnCryptoError);
});

test('a truncated IV or auth tag is rejected before decryption', () => {
  const parts = encryptSSN(PLAIN).split(':');
  parts[2] = Buffer.from([1, 2, 3]).toString('base64');
  assert.throws(() => decryptSSN(parts.join(':')), /Malformed encrypted SSN/);
});

test('a value encrypted under a different key cannot be decrypted', () => {
  const foreign = withEnv(
    { SSN_ENCRYPTION_KEY: crypto.randomBytes(32).toString('hex') },
    () => encryptSSN(PLAIN),
  );
  assert.throws(() => decryptSSN(foreign), SsnCryptoError);
});

test('an unknown envelope version is rejected rather than guessed at', () => {
  const bumped = encryptSSN(PLAIN).replace('enc:v1:', 'enc:v9:');
  assert.throws(() => decryptSSN(bumped), /Unsupported SSN ciphertext version/);
});

// ---------------------------------------------------------------------------
// isEncrypted
// ---------------------------------------------------------------------------

test('isEncrypted recognises our own output', () => {
  assert.equal(isEncrypted(encryptSSN(PLAIN)), true);
});

test('isEncrypted treats legacy plaintext SSNs as not encrypted', () => {
  for (const legacy of [
    '123-45-6789',
    '123456789',
    '111-22-3333',
    '000-00-0000',
    '123 45 6789',
  ]) {
    assert.equal(isEncrypted(legacy), false, `${legacy} must read as plaintext`);
  }
});

test('isEncrypted rejects non-strings and near-miss shapes', () => {
  for (const value of [
    null,
    undefined,
    '',
    0,
    123456789,
    {},
    [],
    'enc',
    'enc:v1',
    'enc:v1:onlytwo',
    'enc:v1:a:b',          // four parts, not five
    'encrypted:v1:a:b:c',  // wrong marker
    'enc:v1:a:b:c:d',      // six parts
  ]) {
    assert.equal(isEncrypted(value), false, `expected false for ${JSON.stringify(value)}`);
  }
});

// ---------------------------------------------------------------------------
// backward compatibility — legacy plaintext rows
// ---------------------------------------------------------------------------

test('legacy plaintext passes through decryptSSN unchanged', () => {
  assert.equal(decryptSSN('123-45-6789'), '123-45-6789');
  assert.equal(decryptSSN('123456789'), '123456789');
});

test('falsy values pass through both directions untouched', () => {
  for (const value of [null, undefined, '']) {
    assert.equal(encryptSSN(value), value);
    assert.equal(decryptSSN(value), value);
  }
});

test('encryptSSN is idempotent — re-encrypting a ciphertext is a no-op', () => {
  const once = encryptSSN(PLAIN);
  const twice = encryptSSN(once);
  assert.equal(twice, once);
  assert.equal(decryptSSN(twice), PLAIN);
});

// ---------------------------------------------------------------------------
// masking still works for both legacy and encrypted values
// ---------------------------------------------------------------------------

test('masking a decrypted SSN matches masking the original', () => {
  assert.equal(maskSSN(decryptSSN(encryptSSN(PLAIN))), '***-**-6789');
});

test('masking a legacy plaintext SSN is unchanged by the migration', () => {
  // Exactly what a pre-migration row yields through the model getter.
  assert.equal(maskSSN(decryptSSN('123-45-6789')), '***-**-6789');
  assert.equal(maskSSN(decryptSSN('123456789')), '***-**-6789');
});

test('masking the RAW ciphertext would leak nothing real (defence in depth)', () => {
  const encrypted = encryptSSN(PLAIN);
  const masked = maskSSN(encrypted);
  assert.ok(!masked.includes('6789'), 'ciphertext must not reveal the real tail');
});

// ---------------------------------------------------------------------------
// key handling
// ---------------------------------------------------------------------------

test('hasKey reflects whether a usable key is configured', () => {
  assert.equal(hasKey(), true);
  withEnv({ SSN_ENCRYPTION_KEY: undefined, NODE_ENV: 'test' }, () => {
    assert.equal(hasKey(), false);
  });
  withEnv({ SSN_ENCRYPTION_KEY: 'not-hex' }, () => {
    assert.equal(hasKey(), false);
  });
});

test('a malformed key is fatal in every environment', () => {
  withEnv({ SSN_ENCRYPTION_KEY: 'abc123', NODE_ENV: 'development' }, () => {
    assert.throws(() => encryptSSN(PLAIN), /must be exactly 64 hex characters/);
  });
  withEnv({ SSN_ENCRYPTION_KEY: 'z'.repeat(KEY_HEX_LENGTH) }, () => {
    assert.throws(() => encryptSSN(PLAIN), /must be exactly 64 hex characters/);
  });
});

test('a missing key in production is fatal — never a silent plaintext write', () => {
  withEnv({ SSN_ENCRYPTION_KEY: undefined, NODE_ENV: 'production' }, () => {
    assert.throws(() => encryptSSN(PLAIN), /SSN_ENCRYPTION_KEY is not set/);
  });
});

test('a missing key outside production degrades to plaintext passthrough', () => {
  withEnv({ SSN_ENCRYPTION_KEY: undefined, NODE_ENV: 'development' }, () => {
    assert.equal(encryptSSN(PLAIN), PLAIN);
    assert.equal(decryptSSN(PLAIN), PLAIN);
  });
});

test('a missing key still refuses to fake-decrypt real ciphertext', () => {
  const encrypted = encryptSSN(PLAIN);
  withEnv({ SSN_ENCRYPTION_KEY: undefined, NODE_ENV: 'development' }, () => {
    assert.throws(() => decryptSSN(encrypted), /cannot decrypt/);
  });
});

test('key rotation in-process is picked up without a restart', () => {
  const underOriginal = encryptSSN(PLAIN);
  const newKey = crypto.randomBytes(32).toString('hex');
  withEnv({ SSN_ENCRYPTION_KEY: newKey }, () => {
    const underNew = encryptSSN(PLAIN);
    assert.equal(decryptSSN(underNew), PLAIN);
    // Old ciphertext is NOT readable under the new key — see the report note
    // about rotation requiring a re-encrypt pass.
    assert.throws(() => decryptSSN(underOriginal), SsnCryptoError);
  });
  // Back on the original key the original ciphertext reads fine again.
  assert.equal(decryptSSN(underOriginal), PLAIN);
});

test('whitespace around the configured key is tolerated', () => {
  withEnv({ SSN_ENCRYPTION_KEY: `  ${TEST_KEY}\n` }, () => {
    assert.equal(decryptSSN(encryptSSN(PLAIN)), PLAIN);
  });
});
