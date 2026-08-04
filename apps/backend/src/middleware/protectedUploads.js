/**
 * Auth gate for /uploads.
 *
 * Everything under uploads/ is PII: driver's license photos, vehicle photos and
 * the investor data room. `express.static` on its own serves all of it to
 * anyone who can guess (or is given) a filename, so this middleware runs first:
 *
 *   /uploads/<file>            → any valid JWT
 *   /uploads/investor/<file>   → admin JWT only (data-room documents), EXCEPT
 *                                documents flagged isPublished, which the
 *                                anonymous /teams page links to by design.
 *
 * TOKEN IN QUERY STRING — deliberate, scoped exception.
 * The general authMiddleware no longer accepts `?token=` (it leaks into access
 * logs and Referer headers). These URLs, however, are consumed by browser
 * `<img>` / `<a download>` / iframe requests, which cannot set an Authorization
 * header. A query token is the only mechanism available, so it is accepted
 * HERE ONLY. Keep JWT lifetimes short and prefer short-lived signed URLs if
 * this ever needs to be shared outside the app.
 */

const path = require('path');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const InvestorDocument = require('../models/InvestorDocument');
const { sendUnauthorized, sendForbidden } = require('../utils/responseHelper');

/** Anything under this prefix is investor-confidential and admin-only. */
const INVESTOR_PREFIX = '/investor/';

/**
 * Investor documents with `isPublished: true` are surfaced on the ANONYMOUS
 * /teams page (GET /api/teams/documents is public, and its DTO links straight
 * to /uploads/investor/<storedFileName>). Gating those behind an admin token
 * would break that page, so the publish flag — the same flag the admin UI
 * toggles — is what decides. Unpublished documents stay admin-only.
 *
 * `path.basename` clamps the lookup so no traversal segment can reach it.
 */
async function isPublishedInvestorDoc(requestPath) {
  const storedFileName = path.basename(requestPath);
  if (!storedFileName) return false;
  const doc = await InvestorDocument.findOne({ storedFileName, isPublished: true })
    .select('_id')
    .lean();
  return Boolean(doc);
}

const extractUploadToken = (req) => {
  const header = req.header('Authorization');
  if (header && header.startsWith('Bearer ')) {
    return header.split(' ')[1];
  }
  // See file header: <img> tags cannot send an Authorization header.
  if (typeof req.query.token === 'string' && req.query.token.trim()) {
    return req.query.token.trim();
  }
  return null;
};

/**
 * Mount as: app.use('/uploads', requireUploadAuth, express.static(dir))
 * `req.path` here is relative to the mount point, e.g. "/investor/deck.pdf".
 */
const requireUploadAuth = async (req, res, next) => {
  const isInvestorPath = req.path.startsWith(INVESTOR_PREFIX);

  // Published data-room documents are public by design — checked before the
  // token requirement, since /teams visitors are anonymous.
  if (isInvestorPath) {
    try {
      if (await isPublishedInvestorDoc(req.path)) return next();
    } catch (err) {
      console.error('Published investor document lookup error:', err);
      return sendUnauthorized(res, 'Unable to verify document access');
    }
  }

  const token = extractUploadToken(req);
  if (!token) return sendUnauthorized(res, 'No token provided');

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return sendUnauthorized(res, 'Invalid or expired token');
  }

  req.user = { id: decoded.id, role: decoded.role };

  // Investor data room — re-check the role against the DB rather than trusting
  // the claim in the token, so a demoted admin loses access immediately.
  if (isInvestorPath) {
    try {
      const user = await User.findById(decoded.id).select('role active').lean();
      if (!user) return sendUnauthorized(res, 'User not found');
      if (user.role !== 'admin') return sendForbidden(res, 'Admin access required');
      if (!user.active) return sendForbidden(res, 'Account is deactivated');
    } catch (err) {
      console.error('Upload auth lookup error:', err);
      return sendUnauthorized(res, 'Invalid or expired token');
    }
  }

  return next();
};

module.exports = { requireUploadAuth };
module.exports.requireUploadAuth = requireUploadAuth;
