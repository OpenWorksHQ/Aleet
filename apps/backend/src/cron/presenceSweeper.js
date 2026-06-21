const User = require('../models/User');

/**
 * Safety net for sessions abandoned without logout (browser killed, etc.).
 * Normal backgrounding (10–20+ min) does NOT clear isOnline — only explicit
 * logout or 24h with zero heartbeats.
 */
const { SESSION_ABANDON_MS } = require('../services/presenceService');

async function runPresenceSweep() {
    const cutoff = new Date(Date.now() - SESSION_ABANDON_MS);
    const result = await User.updateMany(
        {
            role: 'driver',
            'driver.isOnline': true,
            $or: [
                { 'driver.lastSeenAt': { $lt: cutoff } },
                { 'driver.lastSeenAt': null },
            ],
        },
        { $set: { 'driver.isOnline': false } },
    );
    if (result.modifiedCount > 0) {
        console.log(`[presence-sweeper] flipped ${result.modifiedCount} abandoned sessions offline`);
    }
    return result.modifiedCount;
}

module.exports = { runPresenceSweep, SESSION_ABANDON_MS };
