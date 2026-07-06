/**
 * utils/membershipHours.js
 * ---------------------------------------------------------------------------
 * Shared helper for computing a member's used hours across the current
 * billing quarter (calendar-approximated as "this month + the 2 preceding
 * months", matching subscriptionController.getSubscriptionStatus).
 *
 * IMPORTANT: Memberships are billed quarterly with a POOLED 15-hour balance
 * (5 hrs/month × 3 months), NOT a hard 5-hour-per-month cap. A member who
 * uses 0 hours in month 1 and 8 hours in month 2 has NOT overspent — they're
 * still within their 15-hour quarterly pool. Any code that checks "has this
 * member run out of free hours?" must compare against the QUARTERLY total,
 * not a single month's usage. This helper is the single source of truth for
 * that calculation so bookingController, subscriptionController, and
 * adminMembershipController never drift out of sync again.
 * ---------------------------------------------------------------------------
 */

function quarterYearMonths(referenceDate = new Date()) {
    const ref = new Date(referenceDate);
    return [0, 1, 2].map(offset => {
        const d = new Date(ref.getFullYear(), ref.getMonth() - offset, 1);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });
}

/**
 * @param {import('mongoose').Model} MonthlyHours
 * @param {string|ObjectId} userId
 * @param {Date|string} [referenceDate] Defaults to now. Pass the booking's
 *   startDate when checking a specific trip so the right quarter is used.
 * @returns {Promise<number>} total hours used across the 3-month quarter window
 */
async function getQuarterlyUsedHours(MonthlyHours, userId, referenceDate = new Date()) {
    const months = quarterYearMonths(referenceDate);
    const records = await MonthlyHours.find({ user: userId, yearMonth: { $in: months } });
    return records.reduce((sum, r) => sum + (r.totalHoursUsed || 0), 0);
}

module.exports = { quarterYearMonths, getQuarterlyUsedHours };
