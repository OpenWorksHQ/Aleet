/**
 * middleware/validate.js
 * ---------------------------------------------------------------------------
 * Route-boundary request validation backed by zod.
 *
 *     const { validate } = require('../middleware/validate');
 *     router.post('/start', authenticateJWT, validate({ body: startBookingBody }), startBooking);
 *
 * Contract, deliberately narrow:
 *
 *   - On failure it answers through `sendValidationError` from
 *     utils/responseHelper.js, i.e. HTTP 400 with the standard envelope
 *     `{ success: false, message, statusCode: 400, errors }`. Nothing else in
 *     the API shape changes — both Next.js frontends read `message` and pass
 *     `errors` through untouched, so the wire format is unchanged.
 *
 *   - `errors` is a field map: `{ "<dotted.path>": ["message", …] }`, with
 *     root-level problems under the `_` key. This matches the
 *     record-keyed-by-field shape the partner forms already parse.
 *
 *   - The response `message` is the FIRST issue's message verbatim. Schemas in
 *     src/validators therefore carry human-readable, field-named messages (and
 *     reuse a controller's original wording wherever one existed) so that
 *     replacing a hand-rolled check is a no-op on the wire.
 *
 *   - Only `req.body` is written back with the parsed value. `req.query` is a
 *     getter in Express 5 and cannot be assigned, and re-assigning `req.params`
 *     interferes with nested-router param merging — so those two are validated
 *     but left alone. All three parsed results are exposed on `req.validated`
 *     for handlers that want the sanitised copy.
 *
 *   - A missing body is treated as `{}`. Express 5 / body-parser 2 leave
 *     `req.body` undefined when a request carries no payload, and several
 *     clients legitimately POST with no body at all (e.g. subscription cancel).
 * ---------------------------------------------------------------------------
 */

const { sendValidationError } = require('../utils/responseHelper');

/** Request properties this middleware knows how to validate, in report order. */
const SOURCES = ['body', 'params', 'query'];

/**
 * Turn zod issues into `{ "path.to.field": ["message", …] }`.
 * Root-level issues (empty path) are collected under `_`.
 *
 * @param {Array<{ path: Array<string|number>, message: string }>} issues
 * @returns {Object<string, string[]>}
 */
function formatIssues(issues) {
  const fields = {};
  for (const issue of issues) {
    const key = issue.path && issue.path.length ? issue.path.join('.') : '_';
    if (!fields[key]) fields[key] = [];
    if (!fields[key].includes(issue.message)) fields[key].push(issue.message);
  }
  return fields;
}

/**
 * Build a validation middleware.
 *
 * @param {object} schemas
 * @param {import('zod').ZodType} [schemas.body]
 * @param {import('zod').ZodType} [schemas.params]
 * @param {import('zod').ZodType} [schemas.query]
 * @returns {import('express').RequestHandler}
 */
function validate(schemas = {}) {
  const active = SOURCES.filter((source) => schemas[source]);

  return function validateRequest(req, res, next) {
    const validated = {};

    for (const source of active) {
      const input = req[source] === undefined || req[source] === null ? {} : req[source];
      const result = schemas[source].safeParse(input);

      if (!result.success) {
        const { issues } = result.error;
        const message = (issues[0] && issues[0].message) || 'Validation failed';
        return sendValidationError(res, message, formatIssues(issues));
      }

      validated[source] = result.data;
    }

    // Body only — see the header note on req.query / req.params.
    if (Object.prototype.hasOwnProperty.call(validated, 'body')) {
      req.body = validated.body;
    }
    req.validated = validated;

    return next();
  };
}

module.exports = { validate, formatIssues };
