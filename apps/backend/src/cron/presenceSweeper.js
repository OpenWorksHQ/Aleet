const User = require('../models/User');

/**
 * Presence sweeper — clears isOnline for drivers whose lastSeenAt is stale.
 * AQD already excludes stale lastSeenAt; this keeps the admin UI flag accurate.
 */
const { PRESENCE_FRESHNESS_MS } = require('../services/presenceService');

async function runPresenceSweep() {
    const cutoff = new Date(Date.now() - PRESENCE_FRESHNESS_MS);
    const result = await User.updateMany(
        {
            role: 'driver',
            'driver.isOnline': true,
            $or: [
                { 'driver.lastSeenAt': { $lt: cutoff } },
                { 'driver.lastSeenAt': null },
            ],
        },
        { $set: { 'driver.isOnline': false } }
    );
    if (result.modifiedCount > 0) {
        console.log(`[presence-sweeper] flipped ${result.modifiedCount} stale drivers offline`);
    }
    return result.modifiedCount;
}

module.exports = { runPresenceSweep, STALE_THRESHOLD_MS: PRESENCE_FRESHNESS_MS };
