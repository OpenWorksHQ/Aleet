const jwt = require('jsonwebtoken');

/**
 * Issue a JWT for the given user.
 * Admin / driver / partner sessions last 7 days (aligned with portal cookies).
 * Customer sessions also 7 days (frontend cookie is 30d; API still requires a valid JWT).
 * Override with JWT_EXPIRES_IN env (e.g. "7d", "24h").
 */
const generateToken = (id, role) => {
  const expiresIn = process.env.JWT_EXPIRES_IN
    || (role === 'admin' || role === 'driver' || role === 'partner' ? '7d' : '7d');
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn });
};

module.exports = generateToken;
