const test = require('node:test');
const assert = require('node:assert/strict');
const { z } = require('zod');

const { validate, formatIssues } = require('./validate');

// ── Minimal Express doubles ─────────────────────────────────────────────────

function fakeRes() {
  const res = { statusCode: null, payload: null, ended: false };
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body) => {
    res.payload = body;
    res.ended = true;
    return res;
  };
  return res;
}

/** Runs a middleware and reports whether next() was reached. */
function run(middleware, req) {
  const res = fakeRes();
  let nextCalled = false;
  middleware(req, res, () => {
    nextCalled = true;
  });
  return { req, res, nextCalled };
}

const bodySchema = z.looseObject({
  bookingId: z.string({ error: 'bookingId is required' }).min(1, { error: 'bookingId is required' }),
  tip: z.number().optional(),
});

// ── Success path ────────────────────────────────────────────────────────────

test('calls next() and leaves the response untouched when everything parses', () => {
  const { res, nextCalled } = run(validate({ body: bodySchema }), {
    body: { bookingId: 'abc', tip: 5 },
  });

  assert.equal(nextCalled, true);
  assert.equal(res.ended, false);
  assert.equal(res.statusCode, null);
});

test('writes the parsed value back onto req.body', () => {
  const { req } = run(validate({ body: bodySchema }), { body: { bookingId: 'abc' } });
  assert.deepEqual(req.body, { bookingId: 'abc' });
});

test('loose schemas keep unknown body keys so pass-through controllers still work', () => {
  const { req } = run(validate({ body: bodySchema }), {
    body: { bookingId: 'abc', partnerCode: 'VIP', nested: { a: 1 } },
  });
  assert.equal(req.body.partnerCode, 'VIP');
  assert.deepEqual(req.body.nested, { a: 1 });
});

test('exposes every parsed source on req.validated', () => {
  const middleware = validate({
    body: bodySchema,
    params: z.object({ id: z.string() }),
    query: z.looseObject({ page: z.string().optional() }),
  });
  const { req } = run(middleware, {
    body: { bookingId: 'abc' },
    params: { id: '1' },
    query: { page: '2' },
  });

  assert.deepEqual(Object.keys(req.validated).sort(), ['body', 'params', 'query']);
  assert.deepEqual(req.validated.params, { id: '1' });
  assert.deepEqual(req.validated.query, { page: '2' });
});

test('never reassigns req.query or req.params (req.query is a getter in Express 5)', () => {
  const originalQuery = { page: '2' };
  const originalParams = { id: '1' };
  const middleware = validate({
    params: z.object({ id: z.string() }),
    query: z.looseObject({ page: z.string().optional() }),
  });

  const { req } = run(middleware, { query: originalQuery, params: originalParams });

  assert.equal(req.query, originalQuery, 'req.query must be the same object reference');
  assert.equal(req.params, originalParams, 'req.params must be the same object reference');
});

test('treats a missing body as {} — Express 5 leaves req.body undefined with no payload', () => {
  const optionalBody = z.looseObject({ reason: z.string().optional() });
  const { nextCalled, req } = run(validate({ body: optionalBody }), {});

  assert.equal(nextCalled, true);
  assert.deepEqual(req.body, {});
});

test('treats a null body as {}', () => {
  const optionalBody = z.looseObject({ reason: z.string().optional() });
  const { nextCalled } = run(validate({ body: optionalBody }), { body: null });
  assert.equal(nextCalled, true);
});

test('does nothing at all when no schemas are supplied', () => {
  const body = { anything: { $ne: null } };
  const { req, nextCalled, res } = run(validate(), { body });

  assert.equal(nextCalled, true);
  assert.equal(res.ended, false);
  assert.equal(req.body, body, 'body must not be replaced when nothing is validated');
});

// ── Failure path ────────────────────────────────────────────────────────────

test('rejects with the sendValidationError envelope: 400 + success/message/statusCode', () => {
  const { res, nextCalled } = run(validate({ body: bodySchema }), { body: {} });

  assert.equal(nextCalled, false, 'the handler must not run on invalid input');
  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.success, false);
  assert.equal(res.payload.statusCode, 400);
  assert.equal(res.payload.message, 'bookingId is required');
});

test('reports the first issue message verbatim so controller wording is preserved', () => {
  const schema = z.looseObject({
    action: z.enum(['accept', 'decline'], {
      error: 'Invalid action. Must be "accept" or "decline"',
    }),
  });
  const { res } = run(validate({ body: schema }), { body: { action: 'nope' } });

  assert.equal(res.payload.message, 'Invalid action. Must be "accept" or "decline"');
});

test('errors is a record keyed by dotted field path', () => {
  const schema = z.looseObject({
    stops: z.array(z.looseObject({ location: z.string({ error: 'location must be a string' }) })),
  });
  const { res } = run(validate({ body: schema }), { body: { stops: [{ location: 42 }] } });

  assert.deepEqual(res.payload.errors, { 'stops.0.location': ['location must be a string'] });
});

test('root-level issues land under the "_" key', () => {
  const schema = z.looseObject({}).refine(() => false, { error: 'whole body is wrong' });
  const { res } = run(validate({ body: schema }), { body: {} });

  assert.deepEqual(res.payload.errors, { _: ['whole body is wrong'] });
});

test('stops at the first failing source and does not run later schemas', () => {
  let queryParsed = false;
  const spyQuery = z.looseObject({}).refine(() => {
    queryParsed = true;
    return true;
  });

  const { res } = run(validate({ body: bodySchema, query: spyQuery }), {
    body: {},
    query: {},
  });

  assert.equal(res.statusCode, 400);
  assert.equal(queryParsed, false);
});

test('a rejected body is never written back onto the request', () => {
  const original = { bookingId: 123 };
  const { req } = run(validate({ body: bodySchema }), { body: original });
  assert.equal(req.body, original);
});

// ── formatIssues ────────────────────────────────────────────────────────────

test('formatIssues groups multiple messages per field and de-duplicates them', () => {
  const formatted = formatIssues([
    { path: ['a'], message: 'first' },
    { path: ['a'], message: 'second' },
    { path: ['a'], message: 'first' },
    { path: [], message: 'root' },
    { path: ['b', 0, 'c'], message: 'nested' },
  ]);

  assert.deepEqual(formatted, {
    a: ['first', 'second'],
    _: ['root'],
    'b.0.c': ['nested'],
  });
});
