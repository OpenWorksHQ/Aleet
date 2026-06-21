const User = require('../models/User');

/**
 * Clears isOnline for drivers whose presenceUntil has expired.
 * AQD already ignores expired presenceUntil; this keeps admin UI accurate.
 */
const { SESSION_ABANDON_MS } = require('../services/presenceService');

async function runPresenceSweep() {
    const cutoff = new Date(Date.now() - SESSION_ABANDON_MS);
    const result = await User.updateMany(
        {
            role: 'driver',
            'driver.isOnline': true,
            $or: [
                { 'driver.presenceUntil': { $lt: new Date() } },
                { 'driver.presenceUntil': null },
                { 'driver.lastSeenAt': { $lt: cutoff } },
            ],
        },
        { $set: { 'driver.isOnline': false } },
    );
    if (result.modifiedCount > 0) {
        console.log(`[presence-sweeper] cleared ${result.modifiedCount} expired session(s)`);
    }
    return result.modifiedCount;
}

module.exports = { runPresenceSweep, SESSION_ABANDON_MS };
