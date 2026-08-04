/**
 * utils/ssnCrypto.js
 * ---------------------------------------------------------------------------
 * Encryption-at-rest for driver SSNs (AES-256-GCM, Node's built-in crypto).
 *
 * WHY: `driver.ssn` was stored as plaintext. `select: false` keeps it out of
 * query results and API responses are masked, but the raw digits still sat in
 * the collection, in every backup, and in any mongodump. This module makes the
 * value at rest unreadable without SSN_ENCRYPTION_KEY.
 *
 * STORED FORMAT (self-describing, single string, safe for a String path):
 *
 *     enc:v1:<iv_b64>:<tag_b64>:<ciphertext_b64>
 *
 *   - `enc`   fixed marker so `isEncrypted()` is a cheap, unambiguous test
 *             (a real SSN is digits and dashes, so it can never collide)
 *   - `v1`    version tag — a future v2 (new algorithm or new key derivation)
 *             can be added without guessing at old rows
 *   - iv      12 random bytes, base64 — fresh per encryption
 *   - tag     16-byte GCM auth tag, base64 — tamper detection
 *   - ct      ciphertext, base64
 *
 * A constant AAD ("ssn:v1") is authenticated alongside the ciphertext so a
 * blob copied from some other future encrypted field cannot be replayed into
 * the SSN column and decrypt cleanly.
 *
 * KEY: env var SSN_ENCRYPTION_KEY — exactly 64 hex characters (32 bytes).
 *   Generate one with:
 *     node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *
 * KEY-MISSING BEHAVIOR (deliberate, see README of this file):
 *   - NODE_ENV=production + no key  → throws. Writing an SSN as plaintext is
 *     precisely the bug this module exists to fix, so it must never happen
 *     silently on a live database.
 *   - any other NODE_ENV + no key   → degrades to passthrough (values stay
 *     plaintext) after ONE loud warning, so local dev and the test suite keep
 *     working without provisioning a key.
 *   - key present but malformed     → throws in every environment. That is a
 *     typo in configuration, not an absence of configuration.
 *
 * BACKWARD COMPATIBILITY: rows written before this change hold plaintext.
 * `decryptSSN()` returns any non-`enc:` value unchanged, so a legacy driver's
 * SSN still masks correctly. The migration in
 * src/seeders/encryptExistingSsns.js converts those rows in place.
 * ---------------------------------------------------------------------------
 */

const crypto = require('node:crypto');

const ALGORITHM = 'aes-256-gcm';
const PREFIX = 'enc';
const VERSION = 'v1';
const IV_BYTES = 12; // GCM standard nonce length
const TAG_BYTES = 16;
const KEY_BYTES = 32; // AES-256
const KEY_HEX_LENGTH = KEY_BYTES * 2;
const AAD = Buffer.from(`${PREFIX}:${VERSION}:ssn`, 'utf8');

/** Thrown for any recoverable-by-a-human crypto/config failure. */
class SsnCryptoError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SsnCryptoError';
  }
}

const GENERATE_HINT =
  'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"';

const isProduction = () =>
  String(process.env.NODE_ENV || '').toLowerCase() === 'production';

// --- key resolution ---------------------------------------------------------

// Cached against the raw env string so a test (or a rotation-in-process) that
// swaps SSN_ENCRYPTION_KEY is picked up without a restart.
let cachedRaw = null;
let cachedKey = null;
let warnedAboutMissingKey = false;

/**
 * @returns {Buffer|null} the 32-byte key, or null when unset in a non-prod env.
 * @throws {SsnCryptoError} when unset in production, or malformed anywhere.
 */
function getKey() {
  const raw = process.env.SSN_ENCRYPTION_KEY;

  if (!raw) {
    cachedRaw = null;
    cachedKey = null;
    if (isProduction()) {
      throw new SsnCryptoError(
        'SSN_ENCRYPTION_KEY is not set. Refusing to handle SSNs unencrypted in production. ' +
        GENERATE_HINT,
      );
    }
    if (!warnedAboutMissingKey) {
      warnedAboutMissingKey = true;
      console.warn(
        '\n⚠️  SSN_ENCRYPTION_KEY is not set — SSNs will be stored as PLAINTEXT.\n' +
        '   This is tolerated outside production only. Set the key before any\n' +
        `   deploy that touches real driver data. ${GENERATE_HINT}\n`,
      );
    }
    return null;
  }

  if (raw === cachedRaw && cachedKey) return cachedKey;

  const trimmed = String(raw).trim();
  if (!/^[0-9a-fA-F]+$/.test(trimmed) || trimmed.length !== KEY_HEX_LENGTH) {
    // Malformed is always fatal — including in dev. Silently falling back to
    // plaintext because someone fat-fingered the key is how this bug returns.
    throw new SsnCryptoError(
      `SSN_ENCRYPTION_KEY must be exactly ${KEY_HEX_LENGTH} hex characters ` +
      `(${KEY_BYTES} bytes); received ${trimmed.length} character(s). ${GENERATE_HINT}`,
    );
  }

  cachedRaw = raw;
  cachedKey = Buffer.from(trimmed, 'hex');
  return cachedKey;
}

/** True when a usable key is configured. Never throws. */
function hasKey() {
  try {
    return getKey() !== null;
  } catch {
    return false;
  }
}

// --- format detection -------------------------------------------------------

const B64 = '[A-Za-z0-9+/]+={0,2}';
const ENCRYPTED_RE = new RegExp(`^${PREFIX}:v\\d+:${B64}:${B64}:${B64}$`);

/**
 * Does this value use the encrypted-at-rest envelope?
 *
 * Legacy plaintext ("123-45-6789", "123456789") is digits/dashes only and can
 * never match. Used by the decrypt path for passthrough and by the migration
 * to stay idempotent.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
function isEncrypted(value) {
  return typeof value === 'string' && ENCRYPTED_RE.test(value);
}

// --- public API -------------------------------------------------------------

/**
 * Encrypt an SSN for storage.
 *
 * - falsy input (null/undefined/'') → returned unchanged, nothing to protect
 * - already-encrypted input         → returned unchanged (idempotent, so a
 *                                     re-save or a re-run of the migration
 *                                     never double-wraps)
 * - no key outside production       → returned unchanged (plaintext), warned
 *
 * @param {string|null|undefined} plaintext
 * @returns {string|null|undefined}
 */
function encryptSSN(plaintext) {
  if (plaintext === null || plaintext === undefined || plaintext === '') {
    return plaintext;
  }

  const value = String(plaintext);
  if (isEncrypted(value)) return value;

  const key = getKey(); // throws in production when unset
  if (!key) return value; // dev/test passthrough

  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  cipher.setAAD(AAD);
  const ciphertext = Buffer.concat([
    cipher.update(value, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    PREFIX,
    VERSION,
    iv.toString('base64'),
    tag.toString('base64'),
    ciphertext.toString('base64'),
  ].join(':');
}

/**
 * Decrypt a stored SSN.
 *
 * - falsy input                     → returned unchanged
 * - legacy plaintext (not `enc:`)   → returned UNCHANGED. Rows predating this
 *                                     change must keep working; masking a
 *                                     legacy value still yields ***-**-6789.
 * - tampered ciphertext / auth tag  → throws (GCM authentication failure).
 *                                     Never returns partial or garbage output.
 *
 * @param {string|null|undefined} stored
 * @returns {string|null|undefined}
 * @throws {SsnCryptoError}
 */
function decryptSSN(stored) {
  if (stored === null || stored === undefined || stored === '') return stored;

  const value = String(stored);
  if (!isEncrypted(value)) return value; // legacy plaintext passthrough

  const parts = value.split(':');
  const [, version, ivB64, tagB64, ctB64] = parts;
  if (version !== VERSION) {
    throw new SsnCryptoError(
      `Unsupported SSN ciphertext version "${version}" — this build understands ${VERSION}.`,
    );
  }

  const key = getKey();
  if (!key) {
    // Encrypted data but no key: we cannot recover it, and returning the
    // envelope would mask into a meaningless value. Fail loudly instead.
    throw new SsnCryptoError(
      'SSN_ENCRYPTION_KEY is not set but this value is encrypted — cannot decrypt. ' +
      'Set the same key that was used to write it.',
    );
  }

  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const ciphertext = Buffer.from(ctB64, 'base64');

  if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) {
    throw new SsnCryptoError('Malformed encrypted SSN: bad IV or auth tag length.');
  }

  try {
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAAD(AAD);
    decipher.setAuthTag(tag);
    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    // Wrong key, flipped bit, or a swapped auth tag. GCM catches all three.
    throw new SsnCryptoError(
      'Failed to decrypt SSN: authentication failed (wrong key or tampered value).',
    );
  }
}

module.exports = {
  encryptSSN,
  decryptSSN,
  isEncrypted,
  hasKey,
  SsnCryptoError,
  // exported for tests / migration reporting
  ENCRYPTED_PREFIX: `${PREFIX}:${VERSION}:`,
  KEY_HEX_LENGTH,
};
