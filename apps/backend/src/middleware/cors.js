/**
 * CORS for Express + Socket.IO.
 *
 * Allows local dev, configured FRONTEND_URL / DRIVER_PORTAL_URL / ALLOWED_ORIGINS,
 * and all *.vercel.app deployments (preview + production) unless disabled.
 */

function addOrigin(origins, value) {
  if (!value || typeof value !== 'string') return;
  const trimmed = value.trim();
  if (!trimmed) return;
  try {
    origins.add(new URL(trimmed).origin);
  } catch {
    // ignore invalid URLs
  }
}

function buildAllowedOrigins() {
  const origins = new Set();

  addOrigin(origins, process.env.FRONTEND_URL);
  addOrigin(origins, process.env.DRIVER_PORTAL_URL);
  addOrigin(origins, process.env.APP_BASE_URL);

  if (process.env.ALLOWED_ORIGINS) {
    for (const part of process.env.ALLOWED_ORIGINS.split(',')) {
      addOrigin(origins, part);
    }
  }

  // Local dev defaults
  addOrigin(origins, 'http://localhost:3001');
  addOrigin(origins, 'http://localhost:3002');
  addOrigin(origins, 'http://127.0.0.1:3001');
  addOrigin(origins, 'http://127.0.0.1:3002');

  return origins;
}

const VERCEL_ORIGIN_RE = /^https:\/\/[\w.-]+\.vercel\.app$/;

function isOriginAllowed(origin) {
  if (!origin) return true;

  const allowed = buildAllowedOrigins();
  if (allowed.has(origin)) return true;

  if (process.env.ALLOW_VERCEL_ORIGINS !== 'false' && VERCEL_ORIGIN_RE.test(origin)) {
    return true;
  }

  return false;
}

const ALLOW_HEADERS = [
  'Origin',
  'X-Requested-With',
  'Content-Type',
  'Accept',
  'Authorization',
  'X-Partner-Token',
  'ngrok-skip-browser-warning',
].join(', ');

const ALLOW_METHODS = 'GET, POST, PUT, DELETE, PATCH, OPTIONS';

function applyCorsHeaders(req, res) {
  const origin = req.headers.origin;

  if (origin && isOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else if (!origin) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Methods', ALLOW_METHODS);
  res.setHeader('Access-Control-Allow-Headers', ALLOW_HEADERS);
  res.setHeader('Access-Control-Max-Age', '86400');
}

/** Express middleware — mount before routes and body parsers. */
function corsMiddleware(req, res, next) {
  applyCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  return next();
}

/** Socket.IO cors option — mirrors Express allow-list. */
function getSocketCorsConfig() {
  return {
    origin(origin, callback) {
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked origin: ${origin}`));
      }
    },
    methods: ['GET', 'POST'],
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Partner-Token', 'ngrok-skip-browser-warning'],
    credentials: true,
  };
}

module.exports = {
  corsMiddleware,
  getSocketCorsConfig,
  isOriginAllowed,
};
