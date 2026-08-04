/**
 * Rate limiters (express-rate-limit v8).
 *
 * Three tiers:
 *   generalLimiter — broad ceiling for every /api route (abuse / scraping guard)
 *   authLimiter    — /api/auth: credential stuffing + password-reset spam
 *   smsLimiter     — the handful of auth endpoints that send billable Twilio SMS
 *   mapsLimiter    — /api/maps: public Google Maps proxy (burns GOOGLE_MAPS_API_KEY quota)
 *
 * All limits are per-IP and overridable by env so operators can tune without a
 * code change. Webhook paths are always skipped — Stripe/Checkr retry bursts
 * must never be throttled, and they are authenticated by signature, not by IP.
 *
 * NOTE: behind a proxy (ngrok / Railway / nginx) `app.set('trust proxy', ...)`
 * must be configured in server.js or every request looks like it came from the
 * proxy IP and one client can exhaust the whole bucket.
 */

const rateLimit = require('express-rate-limit');
const { sendError } = require('../utils/responseHelper');

const MINUTE = 60 * 1000;

/** Read a positive integer from env, falling back to `fallback`. */
const envInt = (name, fallback) => {
  const parsed = Number.parseInt(process.env[name], 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

/** Stripe / Checkr webhooks are signature-verified and must never be throttled. */
const isWebhook = (req) => /\/webhooks?(\/|$)/i.test(req.originalUrl || req.path || '');

/**
 * Shared factory so every limiter answers in the standard envelope
 * ({ success:false, message, statusCode }) instead of express-rate-limit's
 * default plain-text body.
 */
const makeLimiter = ({ windowMs, limit, message }) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8', // RateLimit / RateLimit-Policy headers
    legacyHeaders: false,
    skip: isWebhook,
    handler: (req, res) => sendError(res, 429, message),
  });

// Broad ceiling on the whole API surface. Generous enough for admin dashboards
// that poll, tight enough to stop scraping and brute force.
const generalLimiter = makeLimiter({
  windowMs: envInt('RATE_LIMIT_WINDOW_MS', 15 * MINUTE),
  limit: envInt('RATE_LIMIT_MAX', 1000),
  message: 'Too many requests. Please slow down and try again shortly.',
});

// Login / signup / password reset. A full customer signup is 4 calls, so this
// still allows several complete flows per window from one NAT'd office.
const authLimiter = makeLimiter({
  windowMs: envInt('AUTH_RATE_LIMIT_WINDOW_MS', 15 * MINUTE),
  limit: envInt('AUTH_RATE_LIMIT_MAX', 30),
  message: 'Too many authentication attempts. Please try again in a few minutes.',
});

// Endpoints that spend real money per call (Twilio SMS on signup/start, email
// on password reset). Deliberately far stricter than authLimiter.
const smsLimiter = makeLimiter({
  windowMs: envInt('SMS_RATE_LIMIT_WINDOW_MS', 15 * MINUTE),
  limit: envInt('SMS_RATE_LIMIT_MAX', 5),
  message: 'Too many verification requests. Please wait a few minutes before trying again.',
});

// Public Google Maps proxy. Autocomplete fires per (debounced) keystroke, so a
// single booking session is ~20 calls — the window is short and the cap sized
// for a few concurrent booking flows behind one IP.
const mapsLimiter = makeLimiter({
  windowMs: envInt('MAPS_RATE_LIMIT_WINDOW_MS', 5 * MINUTE),
  limit: envInt('MAPS_RATE_LIMIT_MAX', 100),
  message: 'Too many address lookups. Please wait a moment and try again.',
});

module.exports = {
  generalLimiter,
  authLimiter,
  smsLimiter,
  mapsLimiter,
};
