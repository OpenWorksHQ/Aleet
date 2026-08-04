/**
 * validators/common.js
 * ---------------------------------------------------------------------------
 * Shared zod building blocks for the request schemas in this directory.
 *
 * Design rules (deliberate — read before adding schemas):
 *
 *  1. VALIDATE, DON'T TRANSFORM. No `.trim()`, no `z.coerce`, no `.default()`
 *     on request fields. `middleware/validate.js` writes the parsed value back
 *     onto `req.body`, so a transform here would silently change what every
 *     controller sees. Schemas only ever accept or reject.
 *
 *  2. TYPE SAFETY FIRST, BUSINESS RULES SECOND. The main job is stopping
 *     type-confusion payloads — `{ "$ne": null }`, arrays where a string is
 *     expected, 10 MB strings — from reaching Mongo, Stripe or a regex.
 *     Semantic rules that controllers/services already enforce (ISO date
 *     shape, min booking hours, OTP correctness) are left where they are so
 *     their exact error messages keep working.
 *
 *  3. BE PERMISSIVE ABOUT SHAPE. Objects that are forwarded wholesale to a
 *     service (booking bodies, signup profiles) use `z.looseObject` so unknown
 *     keys survive. Any key that is actually *consumed* downstream must still
 *     be declared here, otherwise loose mode lets an operator object through.
 *
 *  4. MESSAGES MATTER. `validate.js` reports the first issue's message as the
 *     response `message`, which both Next.js frontends surface to users.
 *     Where a controller already had a hand-rolled check, reuse its exact
 *     wording so the wire format is unchanged.
 * ---------------------------------------------------------------------------
 */

const { z } = require('zod');

/** 24-char hex — the only thing Mongoose will accept without a CastError. */
const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

/** Plain decimal number, optionally signed. Used for "number or numeric string". */
const NUMERIC_RE = /^[+-]?(\d+(\.\d*)?|\.\d+)$/;

/** Generous ceilings — high enough for real content, low enough to stop DoS. */
const LIMITS = {
  ID: 100,
  TOKEN: 4096,
  SHORT_TEXT: 200,
  ADDRESS: 500,
  LONG_TEXT: 2000,
  EMAIL: 254,
  URL: 2048,
};

/**
 * Required string field.
 *
 * @param {string} label   Field name as it should appear in the error message.
 * @param {object} [opts]
 * @param {number} [opts.max]      Max length (default 500).
 * @param {string} [opts.message]  Override for BOTH the missing and the
 *                                 wrong-type message. Use this to preserve a
 *                                 controller's original wording verbatim.
 * @param {string} [opts.missingMessage] Override the missing message only,
 *                                 when a controller words "required"
 *                                 differently from "invalid".
 */
function requiredString(label, { max = LIMITS.ADDRESS, message, missingMessage } = {}) {
  const missing = missingMessage || message || `${label} is required`;
  const wrongType = message || `${label} must be a string`;
  return z
    .string({ error: (issue) => (issue.input === undefined ? missing : wrongType) })
    .min(1, { error: missing })
    .max(max, { error: `${label} must be at most ${max} characters` });
}

/**
 * Optional string field. Absent is fine; present-but-not-a-string is not.
 * Empty strings are allowed — plenty of forms post "" for untouched inputs.
 */
function optionalString(label, { max = LIMITS.ADDRESS } = {}) {
  return z
    .string({ error: () => `${label} must be a string` })
    .max(max, { error: `${label} must be at most ${max} characters` })
    .optional();
}

/** Optional string that may also be explicitly `null` (common in JSON clients). */
function nullableString(label, opts) {
  return optionalString(label, opts).nullable();
}

/** Required 24-char hex ObjectId. */
function objectId(label, { message, missingMessage } = {}) {
  const missing = missingMessage || message || `${label} is required`;
  const invalid = message || `${label} must be a valid ID`;
  return z
    .string({ error: (issue) => (issue.input === undefined ? missing : invalid) })
    .regex(OBJECT_ID_RE, { error: invalid });
}

/** Optional 24-char hex ObjectId. */
function optionalObjectId(label, opts) {
  return objectId(label, opts).optional();
}

/**
 * A number, or a string that cleanly parses as one (multipart/form-data and
 * query strings only ever carry strings). Rejects booleans, arrays, objects,
 * `NaN`, `Infinity` and the empty string.
 *
 * @param {string} label
 * @param {object} [opts]
 * @param {number} [opts.min]      Inclusive lower bound.
 * @param {number} [opts.max]      Inclusive upper bound.
 * @param {boolean} [opts.integer] Require a whole number.
 * @param {string} [opts.message]  Override the wrong-type message.
 * @param {string} [opts.missingMessage] Override the message used when the
 *                                 field is absent entirely.
 */
function numberLike(label, { min, max, integer = false, message, missingMessage } = {}) {
  const wrongType = message || `${label} must be a number`;
  const missing = missingMessage || wrongType;
  return z
    .union([z.number(), z.string()], {
      error: (issue) => (issue.input === undefined ? missing : wrongType),
    })
    .superRefine((value, ctx) => {
      if (typeof value === 'string' && !NUMERIC_RE.test(value.trim())) {
        ctx.addIssue({ code: 'custom', message: wrongType });
        return;
      }
      const parsed = typeof value === 'number' ? value : Number(value.trim());
      if (!Number.isFinite(parsed)) {
        ctx.addIssue({ code: 'custom', message: wrongType });
        return;
      }
      if (integer && !Number.isInteger(parsed)) {
        ctx.addIssue({ code: 'custom', message: `${label} must be a whole number` });
        return;
      }
      if (min !== undefined && parsed < min) {
        ctx.addIssue({ code: 'custom', message: `${label} must be at least ${min}` });
        return;
      }
      if (max !== undefined && parsed > max) {
        ctx.addIssue({ code: 'custom', message: `${label} must be at most ${max}` });
      }
    });
}

/**
 * Money-ish field: a non-negative amount with a hard ceiling.
 * Negative amounts are rejected outright rather than silently clamped —
 * nothing legitimate sends them, and they are the classic payment-tampering
 * probe.
 */
function amount(label, { min = 0, max = 1_000_000, message, missingMessage } = {}) {
  return numberLike(label, { min, max, message, missingMessage });
}

/**
 * `true` / `false`, or the strings `"true"` / `"false"` that multipart forms
 * produce. Anything else (including 0/1 and "yes") is rejected.
 */
function booleanLike(label) {
  return z.custom(
    (value) => typeof value === 'boolean' || value === 'true' || value === 'false',
    { error: `${label} must be true or false` },
  );
}

/**
 * A single string, or an array of strings — the shape multipart forms produce
 * for a repeated field (`vehicleTypes` is sent once per selection).
 */
function stringOrStringArray(label, { maxItems = 50, maxLength = LIMITS.SHORT_TEXT } = {}) {
  return z.unknown().superRefine((value, ctx) => {
    if (Array.isArray(value) && value.length > maxItems) {
      ctx.addIssue({ code: 'custom', message: `${label} must contain at most ${maxItems} items` });
      return;
    }
    const items = Array.isArray(value) ? value : [value];
    for (const item of items) {
      if (typeof item !== 'string') {
        ctx.addIssue({
          code: 'custom',
          message: `${label} must be a string or an array of strings`,
        });
        return;
      }
      if (item.length > maxLength) {
        ctx.addIssue({
          code: 'custom',
          message: `${label} entries must be at most ${maxLength} characters`,
        });
        return;
      }
    }
  });
}

/** Array of ObjectId strings (add-on ids, region ids, …). */
function objectIdArray(label, { maxItems = 50 } = {}) {
  return z
    .array(objectId(`Each ${label} entry`), { error: `${label} must be an array` })
    .max(maxItems, { error: `${label} must contain at most ${maxItems} items` });
}

/**
 * An opaque token (JWT, reset token, Stripe id). Restricted to the characters
 * those tokens actually use so nothing exotic reaches `jwt.verify`, a hash, or
 * a Stripe URL path.
 */
function opaqueToken(label, { max = LIMITS.TOKEN, message, missingMessage } = {}) {
  const missing = missingMessage || message || `${label} is required`;
  const invalid = message || `${label} is invalid`;
  return z
    .string({ error: (issue) => (issue.input === undefined ? missing : invalid) })
    .min(1, { error: missing })
    .max(max, { error: `${label} must be at most ${max} characters` })
    .regex(/^[A-Za-z0-9._~+/=-]+$/, { error: invalid });
}

/**
 * A Stripe object id such as `pm_…`, `pi_…`, `cs_test_…`, `acct_…`.
 * Checkout session ids are the longest of these (~66-90 chars), hence the
 * 255-char ceiling rather than the shorter LIMITS.ID.
 */
function stripeId(label, { prefix, message, missingMessage, max = 255 } = {}) {
  const invalid = message || `${label} is invalid`;
  const missing = missingMessage || `${label} is required`;
  let schema = z
    .string({ error: (issue) => (issue.input === undefined ? missing : invalid) })
    .min(1, { error: missing })
    .max(max, { error: `${label} must be at most ${max} characters` })
    .regex(/^[A-Za-z0-9_]+$/, { error: invalid });
  if (prefix) {
    schema = schema.regex(new RegExp(`^${prefix}`), { error: invalid });
  }
  return schema;
}

/**
 * Absolute http(s) URL. Used for `resetBaseUrl`, which is echoed into a
 * password-reset email — a non-URL there is either a bug or a phishing probe.
 */
function httpUrl(label, { max = LIMITS.URL } = {}) {
  return z
    .string({ error: () => `${label} must be a string` })
    .max(max, { error: `${label} must be at most ${max} characters` })
    .refine((value) => /^https?:\/\/[^\s]+$/i.test(value), {
      error: `${label} must be an http(s) URL`,
    });
}

/**
 * Enum with a message that lists the accepted values.
 *
 * @param {string} label
 * @param {string[]} values
 * @param {object} [opts]
 * @param {string} [opts.message]         Message for a value outside the set.
 * @param {string} [opts.missingMessage]  Message when the field is absent.
 *                                        Controllers often word "required"
 *                                        differently from "invalid".
 */
function enumOf(label, values, { message, missingMessage } = {}) {
  const quoted = values.map((v) => `"${v}"`).join(' or ');
  const invalid = message || `${label} must be ${quoted}`;
  const missing = missingMessage || invalid;
  return z.enum(values, {
    error: (issue) => (issue.input === undefined ? missing : invalid),
  });
}

/** Body schemas that accept no fields at all still need to reject junk types. */
const emptyBody = z.looseObject({});

module.exports = {
  z,
  OBJECT_ID_RE,
  NUMERIC_RE,
  LIMITS,
  requiredString,
  optionalString,
  nullableString,
  objectId,
  optionalObjectId,
  numberLike,
  amount,
  booleanLike,
  stringOrStringArray,
  objectIdArray,
  opaqueToken,
  stripeId,
  httpUrl,
  enumOf,
  emptyBody,
};
