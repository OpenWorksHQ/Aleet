const test = require('node:test');
const assert = require('node:assert/strict');

const {
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
} = require('./authValidators');

const JWT = 'eyJhbGciOiJIUzI1NiJ9.eyJ0eXBlIjoic2lnbnVwX2NvbXBsZXRlIn0.abc-DEF_123';
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

// ── signup step 1 ───────────────────────────────────────────────────────────

test('signupStartBody accepts the exact payload apps/frontend sends', () => {
  parse(signupStartBody, { identifier: 'ada@example.com', role: 'customer' });
  parse(signupStartBody, { identifier: '+14155550123', role: 'driver' });
  parse(signupStartBody, { identifier: 'ada@example.com', name: 'Ada', role: 'customer' });
  parse(signupStartBody, { identifier: 'ada@example.com' });
});

test('signupStartBody reuses the authService message for a missing identifier', () => {
  assert.equal(firstMessage(signupStartBody, {}), 'Phone number or email is required');
  assert.equal(firstMessage(signupStartBody, { identifier: '' }), 'Phone number or email is required');
});

test('signupStartBody role is an allow-list — it is used to scope a Mongo lookup', () => {
  assert.deepEqual(ROLES, ['customer', 'driver', 'admin']);
  assert.equal(
    firstMessage(signupStartBody, { identifier: 'a@b.co', role: { $ne: 'admin' } }),
    'role must be "customer" or "driver" or "admin"',
  );
  assert.equal(
    firstMessage(signupStartBody, { identifier: 'a@b.co', role: 'superuser' }),
    'role must be "customer" or "driver" or "admin"',
  );
});

test('signupStartBody caps the identifier so a huge value never reaches Twilio', () => {
  assert.equal(signupStartBody.safeParse({ identifier: 'a'.repeat(255) }).success, false);
});

// ── signup step 2 (OTP) ─────────────────────────────────────────────────────

test('signupVerifyBody accepts a 6-digit OTP as authService generates it', () => {
  parse(signupVerifyBody, { identifier: 'ada@example.com', code: '123456' });
});

test('signupVerifyBody reuses the authService "required" message for both fields', () => {
  assert.equal(firstMessage(signupVerifyBody, {}), 'Identifier and OTP code are required');
  assert.equal(
    firstMessage(signupVerifyBody, { identifier: 'ada@example.com' }),
    'Identifier and OTP code are required',
  );
});

test('signupVerifyBody blocks an operator object being compared against a stored OTP', () => {
  assert.equal(
    firstMessage(signupVerifyBody, { identifier: { $ne: null }, code: '123456' }),
    'Identifier and OTP code are required',
  );
  assert.equal(
    firstMessage(signupVerifyBody, { identifier: 'ada@example.com', code: { $ne: null } }),
    'Identifier and OTP code are required',
  );
});

test('signupVerifyBody caps the OTP length', () => {
  assert.match(
    firstMessage(signupVerifyBody, { identifier: 'a@b.co', code: '1'.repeat(13) }),
    /OTP code must be at most 12 characters/,
  );
});

// ── signup step 3 (passcode) ────────────────────────────────────────────────

test('signupPasscodeBody mirrors the 6-character rule in authService.setPasscode', () => {
  parse(signupPasscodeBody, { signupToken: JWT, password: 'hunter2' });
  assert.equal(
    firstMessage(signupPasscodeBody, { signupToken: JWT, password: 'short' }),
    'Password must be at least 6 characters',
  );
  assert.equal(
    firstMessage(signupPasscodeBody, { signupToken: JWT }),
    'Password must be at least 6 characters',
  );
});

test('signupPasscodeBody rejects an absurd password before bcrypt burns CPU on it', () => {
  assert.match(
    firstMessage(signupPasscodeBody, { signupToken: JWT, password: 'a'.repeat(201) }),
    /Password must be at most 200 characters/,
  );
});

test('signupPasscodeBody requires a token shaped like a JWT', () => {
  assert.equal(firstMessage(signupPasscodeBody, { password: 'hunter2' }), 'signupToken is required');
  assert.equal(
    firstMessage(signupPasscodeBody, { signupToken: 'not a jwt', password: 'hunter2' }),
    'signupToken is invalid',
  );
  assert.equal(
    firstMessage(signupPasscodeBody, { signupToken: { $ne: null }, password: 'hunter2' }),
    'signupToken is invalid',
  );
});

// ── signup step 4 (complete) ────────────────────────────────────────────────

test('signupCompleteBody accepts the frontend JSON payload', () => {
  parse(signupCompleteBody, { tempToken: JWT, name: 'Ada Lovelace', email: 'ada@example.com' });
});

test('signupCompleteBody stays loose so the ...profile spread keeps working', () => {
  const parsed = parse(signupCompleteBody, {
    tempToken: JWT,
    name: 'Ada',
    email: 'ada@example.com',
    vehicleTypes: [OID],
    ssn: '123-45-6788',
    marketingOptIn: 'true',
  });
  assert.deepEqual(parsed.vehicleTypes, [OID]);
  assert.equal(parsed.marketingOptIn, 'true');
});

test('signupCompleteBody leaves name/email requiredness to authService', () => {
  // authService owns "Name is required" and "Valid email is required", and only
  // applies the email rule on the phone flow — so neither is required here.
  parse(signupCompleteBody, { tempToken: JWT });
});

test('signupCompleteBody still types the profile fields it forwards', () => {
  assert.equal(firstMessage(signupCompleteBody, { tempToken: JWT, name: { $ne: null } }), 'name must be a string');
  assert.equal(
    firstMessage(signupCompleteBody, { tempToken: JWT, vehicleTypes: [{ $ne: null }] }),
    'vehicleTypes must be a string or an array of strings',
  );
  assert.equal(firstMessage(signupCompleteBody, {}), 'tempToken is required');
});

// ── driver signup ───────────────────────────────────────────────────────────

test('driverSignupStartBody accepts the driver-portal payload', () => {
  parse(driverSignupStartBody, {
    name: 'Grace Hopper',
    phone: '+14155550123',
    email: 'grace@example.com',
    password: 'hunter2',
  });
});

test('driverSignupStartBody now requires a password — it used to hash the string "undefined"', () => {
  assert.equal(
    firstMessage(driverSignupStartBody, {
      name: 'Grace',
      phone: '+14155550123',
      email: 'grace@example.com',
    }),
    'Password must be at least 6 characters',
  );
});

test('driverSignupStartBody mirrors the 6-character rule the signup form enforces', () => {
  assert.equal(
    firstMessage(driverSignupStartBody, {
      name: 'Grace',
      phone: '+14155550123',
      email: 'grace@example.com',
      password: 'abc',
    }),
    'Password must be at least 6 characters',
  );
});

test('driverSignupStartBody rejects operator objects in the conflict-lookup fields', () => {
  for (const field of ['name', 'phone', 'email']) {
    const body = {
      name: 'Grace',
      phone: '+14155550123',
      email: 'grace@example.com',
      password: 'hunter2',
      [field]: { $ne: null },
    };
    assert.equal(driverSignupStartBody.safeParse(body).success, false, `${field} must be typed`);
  }
});

test('driverSignupDocumentsBody accepts the multipart string values multer produces', () => {
  parse(driverSignupDocumentsBody, {
    driverToken: JWT,
    hasForHireLicense: 'false',
    hasOwnVehicle: 'true',
    ssn: '123-45-6788',
    vehicleTypes: [OID, OID],
  });
  parse(driverSignupDocumentsBody, { driverToken: JWT, vehicleTypes: OID });
  parse(driverSignupDocumentsBody, { driverToken: JWT });
});

test('driverSignupDocumentsBody rejects a non-boolean flag and a non-string ssn', () => {
  assert.equal(
    firstMessage(driverSignupDocumentsBody, { driverToken: JWT, hasOwnVehicle: 'maybe' }),
    'hasOwnVehicle must be true or false',
  );
  assert.equal(
    firstMessage(driverSignupDocumentsBody, { driverToken: JWT, ssn: { $ne: null } }),
    'ssn must be a string',
  );
  assert.equal(firstMessage(driverSignupDocumentsBody, {}), 'driverToken is required');
});

test('driverSignupCompleteBody keeps the controller message for a missing docsToken', () => {
  parse(driverSignupCompleteBody, { docsToken: JWT, authorizeBackgroundCheck: 'true' });
  assert.equal(firstMessage(driverSignupCompleteBody, {}), 'docsToken is required');
  assert.equal(
    firstMessage(driverSignupCompleteBody, { docsToken: JWT, authorizeBackgroundCheck: 1 }),
    'authorizeBackgroundCheck must be true or false',
  );
});

// ── login ───────────────────────────────────────────────────────────────────

test('loginBody accepts both the modern and legacy field combinations', () => {
  parse(loginBody, { identifier: 'ada@example.com', password: 'hunter2', expectedRole: 'driver' });
  parse(loginBody, { email: 'ada@example.com', password: 'hunter2' });
  parse(loginBody, { phone: '+14155550123', password: 'hunter2' });
});

test('loginBody leaves the combined "required" message to the controller', () => {
  // userController owns "Identifier (email or phone) and password are required".
  parse(loginBody, {});
  parse(loginBody, { identifier: 'ada@example.com' });
});

test('loginBody blocks credential fields being submitted as operator objects', () => {
  assert.equal(
    firstMessage(loginBody, { identifier: { $ne: null }, password: 'x' }),
    'identifier must be a string',
  );
  assert.equal(
    firstMessage(loginBody, { email: { $regex: '.*' }, password: 'x' }),
    'email must be a string',
  );
  assert.equal(
    firstMessage(loginBody, { identifier: 'a@b.co', password: { $ne: null } }),
    'password must be a string',
  );
});

test('loginBody caps password length so bcrypt.compare is never handed a megabyte', () => {
  assert.equal(
    loginBody.safeParse({ identifier: 'a@b.co', password: 'x'.repeat(201) }).success,
    false,
  );
});

// ── check-user ──────────────────────────────────────────────────────────────

test('checkUserBody accepts the frontend payload and an omitted role', () => {
  parse(checkUserBody, { identifier: 'ada@example.com', role: 'customer' });
  parse(checkUserBody, { identifier: '+14155550123' });
  parse(checkUserBody, {});
});

test('checkUserBody role cannot become a Mongo operator — it scopes the lookup query', () => {
  assert.equal(
    firstMessage(checkUserBody, { identifier: 'a@b.co', role: { $ne: 'customer' } }),
    'role must be "customer" or "driver" or "admin"',
  );
  assert.equal(
    firstMessage(checkUserBody, { identifier: 'a@b.co', role: ['customer', 'admin'] }),
    'role must be "customer" or "driver" or "admin"',
  );
});

// ── forgot / reset password ─────────────────────────────────────────────────

test('forgotPasswordBody accepts both frontends payloads', () => {
  parse(forgotPasswordBody, {
    email: 'ada@example.com',
    role: 'customer',
    resetBaseUrl: 'https://app.example.com/login/forgot-password',
  });
  parse(forgotPasswordBody, {
    email: 'grace@example.com',
    role: 'driver',
    resetBaseUrl: 'http://localhost:3001/reset-password',
  });
  parse(forgotPasswordBody, { email: 'ada@example.com' });
});

test('forgotPasswordBody role is an allow-list — it is used as a query filter', () => {
  assert.equal(
    firstMessage(forgotPasswordBody, { email: 'a@b.co', role: { $ne: 'admin' } }),
    'role must be "customer" or "driver" or "admin"',
  );
});

test('forgotPasswordBody rejects a resetBaseUrl that is not an absolute http(s) URL', () => {
  // The value is interpolated into the link emailed to the user.
  assert.equal(
    firstMessage(forgotPasswordBody, { email: 'a@b.co', resetBaseUrl: 'javascript:alert(1)' }),
    'resetBaseUrl must be an http(s) URL',
  );
  assert.equal(
    firstMessage(forgotPasswordBody, { email: 'a@b.co', resetBaseUrl: { $ne: null } }),
    'resetBaseUrl must be a string',
  );
});

test('forgotPasswordBody leaves the email-shape message to authService', () => {
  // authService owns "Valid email is required" and the enumeration-safe reply.
  parse(forgotPasswordBody, {});
  parse(forgotPasswordBody, { email: 'not-an-email' });
});

test('resetPasswordBody mirrors the 8-character rule in authService.resetPassword', () => {
  parse(resetPasswordBody, { token: 'a'.repeat(64), password: 'hunter22' });
  assert.equal(
    firstMessage(resetPasswordBody, { token: 'a'.repeat(64), password: 'hunter2' }),
    'Password must be at least 8 characters',
  );
  assert.equal(
    firstMessage(resetPasswordBody, { token: 'a'.repeat(64) }),
    'Password must be at least 8 characters',
  );
});

test('resetPasswordBody requires a token and rejects an operator object', () => {
  assert.equal(firstMessage(resetPasswordBody, { password: 'hunter22' }), 'Reset token is required');
  assert.equal(
    firstMessage(resetPasswordBody, { token: { $ne: null }, password: 'hunter22' }),
    'Reset token is required',
  );
});

test('resetPasswordBody caps the token length before it is sha256-hashed and looked up', () => {
  assert.match(
    firstMessage(resetPasswordBody, { token: 'a'.repeat(513), password: 'hunter22' }),
    /Reset token must be at most 512 characters/,
  );
});
