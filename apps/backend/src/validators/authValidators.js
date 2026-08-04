/**
 * validators/authValidators.js
 * ---------------------------------------------------------------------------
 * Schemas for routes/authRoutes.js — customer signup, driver signup, login and
 * password reset.
 *
 * The password and OTP rules already live in services/authService.js. These
 * schemas MIRROR them (6 chars for signup/driver signup, 8 for reset) using the
 * service's exact wording; they never contradict or tighten them. Everything
 * semantic — email shape, OTP correctness, phone normalisation, per-role
 * conflict checks — is still the service's job.
 *
 * Two genuine holes are closed here:
 *
 *   1. `role` on /check-user and /password/forgot is written straight into a
 *      Mongo query (`query.role = role`). A `{ "$ne": "admin" }` there turns a
 *      scoped lookup into an unscoped one. It is now an enum.
 *
 *   2. `password` on /driver/signup/start was never checked before reaching
 *      `bcrypt.hash(String(password))` — a request without one hashed the
 *      literal string "undefined" and created a driver account with a
 *      guessable password. It is now required, matching the 6-character rule
 *      the driver-portal signup form enforces client-side.
 *
 * NOTE: the driver signup steps and /signup/complete are multipart/form-data
 * (multer). Every field arrives as a string, and `validate()` must be mounted
 * AFTER the multer middleware or `req.body` is still empty.
 * ---------------------------------------------------------------------------
 */

const {
  z,
  LIMITS,
  requiredString,
  optionalString,
  nullableString,
  booleanLike,
  stringOrStringArray,
  opaqueToken,
  httpUrl,
  enumOf,
} = require('./common');

/** Roles that may be used to scope a user lookup. */
const ROLES = ['customer', 'driver', 'admin'];

const roleField = enumOf('role', ROLES).optional().nullable();

/** JWTs minted by authService (signupToken / tempToken / driverToken / docsToken). */
const jwtField = (label, missingMessage) =>
  opaqueToken(label, { max: LIMITS.TOKEN, missingMessage });

/**
 * Passwords. `max` is a bcrypt-cost guard, not a product rule — bcrypt only
 * reads the first 72 bytes, so anything past that is pure hashing cost.
 */
const password = (min, message) =>
  z
    .string({ error: (issue) => (issue.input === undefined ? message : message) })
    .min(min, { error: message })
    .max(200, { error: 'Password must be at most 200 characters' });

// ── Customer signup ─────────────────────────────────────────────────────────

/** POST /api/auth/signup/start */
const signupStartBody = z.looseObject({
  identifier: requiredString('Phone number or email', {
    max: LIMITS.EMAIL,
    message: 'Phone number or email is required',
  }),
  name: nullableString('name', { max: LIMITS.SHORT_TEXT }),
  role: roleField,
});

/** POST /api/auth/signup/verify — the OTP itself is a 6-digit code. */
const signupVerifyBody = z.looseObject({
  identifier: requiredString('Identifier', {
    max: LIMITS.EMAIL,
    message: 'Identifier and OTP code are required',
  }),
  code: requiredString('OTP code', {
    max: 12,
    message: 'Identifier and OTP code are required',
  }),
});

/** POST /api/auth/signup/passcode — mirrors authService.setPasscode. */
const signupPasscodeBody = z.looseObject({
  signupToken: jwtField('signupToken', 'signupToken is required'),
  password: password(6, 'Password must be at least 6 characters'),
});

/**
 * POST /api/auth/signup/complete
 *
 * Loose on purpose: the controller destructures `{ tempToken, name, email,
 * ...profile }` and forwards `profile` to the registration service, so unknown
 * keys must survive. The keys the service actually reads are typed below.
 * `name` and `email` stay optional here because authService owns the
 * "Name is required" / "Valid email is required" messages and the phone-vs-email
 * flow distinction that decides which of them applies.
 */
const signupCompleteBody = z.looseObject({
  tempToken: jwtField('tempToken', 'tempToken is required'),
  name: nullableString('name', { max: LIMITS.SHORT_TEXT }),
  email: nullableString('email', { max: LIMITS.EMAIL }),
  ssn: nullableString('ssn', { max: 32 }),
  vehicleTypes: stringOrStringArray('vehicleTypes').optional().nullable(),
  permissions: stringOrStringArray('permissions').optional().nullable(),
});

// ── Driver signup ───────────────────────────────────────────────────────────

/** POST /api/auth/driver/signup/start */
const driverSignupStartBody = z.looseObject({
  name: requiredString('Name', { max: LIMITS.SHORT_TEXT }),
  phone: requiredString('Phone number', { max: 32 }),
  email: requiredString('Email', { max: LIMITS.EMAIL }),
  password: password(6, 'Password must be at least 6 characters'),
});

/** POST /api/auth/driver/signup/documents (multipart) */
const driverSignupDocumentsBody = z.looseObject({
  driverToken: jwtField('driverToken', 'driverToken is required'),
  ssn: nullableString('ssn', { max: 32 }),
  vehicleTypes: stringOrStringArray('vehicleTypes').optional().nullable(),
  hasOwnVehicle: booleanLike('hasOwnVehicle').optional().nullable(),
  hasForHireLicense: booleanLike('hasForHireLicense').optional().nullable(),
});

/** POST /api/auth/driver/signup/complete (multipart) */
const driverSignupCompleteBody = z.looseObject({
  docsToken: jwtField('docsToken', 'docsToken is required'),
  hasForHireLicense: booleanLike('hasForHireLicense').optional().nullable(),
  authorizeBackgroundCheck: booleanLike('authorizeBackgroundCheck').optional().nullable(),
});

// ── Login / account lookup / password reset ─────────────────────────────────

/**
 * POST /api/auth/login
 * `identifier`, `email` and `phone` are all left optional and only
 * type-checked: the controller coalesces them and owns the combined
 * "Identifier (email or phone) and password are required" message, which
 * clients already display. `expectedRole` never reaches a query — it only
 * selects a hard-coded lookup role — so a plain string is enough.
 */
const loginBody = z.looseObject({
  identifier: nullableString('identifier', { max: LIMITS.EMAIL }),
  email: nullableString('email', { max: LIMITS.EMAIL }),
  phone: nullableString('phone', { max: 32 }),
  password: optionalString('password', { max: 200 }).nullable(),
  expectedRole: optionalString('expectedRole', { max: 32 }).nullable(),
});

/**
 * POST /api/auth/check-user
 * `identifier` stays optional so the controller keeps emitting
 * "Identifier (email or phone) is required"; `role` is an enum because it is
 * used as a query filter.
 */
const checkUserBody = z.looseObject({
  identifier: nullableString('identifier', { max: LIMITS.EMAIL }),
  role: roleField,
});

/**
 * POST /api/auth/password/forgot
 * `resetBaseUrl` is interpolated into the link that gets emailed to the user,
 * so it must at least be an absolute http(s) URL. The allowed HOSTS are not
 * restricted here — see the note in the task report.
 */
const forgotPasswordBody = z.looseObject({
  email: nullableString('email', { max: LIMITS.EMAIL }),
  role: roleField,
  resetBaseUrl: httpUrl('resetBaseUrl').optional().nullable(),
});

/** POST /api/auth/password/reset — mirrors authService.resetPassword. */
const resetPasswordBody = z.looseObject({
  token: requiredString('Reset token', {
    max: 512,
    message: 'Reset token is required',
  }),
  password: password(8, 'Password must be at least 8 characters'),
});

module.exports = {
  ROLES,
  signupStartBody,
  signupVerifyBody,
  signupPasscodeBody,
  signupCompleteBody,
  driverSignupStartBody,
  driverSignupDocumentsBody,
  driverSignupCompleteBody,
  loginBody,
  checkUserBody,
  forgotPasswordBody,
  resetPasswordBody,
};
