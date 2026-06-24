/**
 * Keeps driver.isOnline in sync with AQD eligibility.
 * Availability intent (Available/Unavailable) is never auto-cleared here.
 */
async function runPresenceSweep() {
  const { syncDenormalizedOnlineFlags } = require('./driverAvailabilityService');
  return syncDenormalizedOnlineFlags();
}

module.exports = { runPresenceSweep };
