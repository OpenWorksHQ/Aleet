const User = require('../models/User');

/**
 * Safety net for sessions abandoned without logout (browser killed, no pagehide).
 * Normal tab close uses pagehide offline (~immediate) or a 2 min disconnect timer.
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
