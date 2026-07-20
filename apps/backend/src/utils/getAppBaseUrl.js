/**
 * Customer-facing frontend base URL for Stripe redirects, email links, etc.
 * Prefer APP_BASE_URL; fall back to FRONTEND_URL (set on production EC2).
 */
function getAppBaseUrl() {
  const base =
    process.env.APP_BASE_URL ||
    process.env.FRONTEND_URL ||
    'http://localhost:3001';
  return base.replace(/\/$/, '');
}

module.exports = { getAppBaseUrl };
