const User = require('../models/User');

/**
 * Turns off drivers whose availability heartbeat has expired.
 * AQD already ignores stale heartbeats; this keeps DB/UI in sync.
 */
async function runPresenceSweep() {
  const { sweepStaleAvailability } = require('./driverAvailabilityService');
  return sweepStaleAvailability();
}

module.exports = { runPresenceSweep };
