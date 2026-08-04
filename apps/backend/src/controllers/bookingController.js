/**
 * controllers/bookingController.js
 * ---------------------------------------------------------------------------
 * Thin barrel. The implementation was split, verbatim, into
 * controllers/booking/:
 *
 *   shared.js              distance/payout/validation helpers shared below
 *   quoteController.js     POST /preview, POST /start
 *   dispatchController.js  POST /confirm, POST /accept, GET /open-trips,
 *                          POST /driver-cancel
 *   lifecycleController.js PATCH /:id/complete, PATCH /:id/cancel
 *   queryController.js     GET /, GET /my, GET /:id, GET /stats
 *
 * This file stays so that both `require('../controllers/bookingController')`
 * and `require('../controllers/bookingController.js')` keep resolving and no
 * route file had to change.
 * ---------------------------------------------------------------------------
 */

module.exports = require('./booking');
