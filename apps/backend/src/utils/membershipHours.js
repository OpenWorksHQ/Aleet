/**
 * utils/membershipHours.js
 * ---------------------------------------------------------------------------
 * Membership hour balance helpers.
 *
 * Product rules (per client / project spec):
 *   - 5 included hours per calendar month
 *   - Billed quarterly → 15 hours total per 3-month cycle
 *   - Included hours are applied first; overage bills at the locked member rate
 *     ($89 standard / $69 Founder 30)
 *   - Monthly allotment soft-caps usage: a member cannot burn next month's
 *     hours early. freeLeft = min(monthlyRemaining, quarterlyRemaining)
 *
 * Example: 0 used this month, 0 used this quarter, book 6 hours
 *   → 5 hrs included + 1 hr overage @ member rate (+ booking fee)
 * ---------------------------------------------------------------------------
 */

function yearMonthKey(referenceDate = new Date()) {
    const ref = new Date(referenceDate);
    return `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, '0')}`;
}

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
 * @param {Date|string} [referenceDate]
 * @returns {Promise<number>} hours used in the calendar month of referenceDate
 */
async function getMonthlyUsedHours(MonthlyHours, userId, referenceDate = new Date()) {
    const yearMonth = yearMonthKey(referenceDate);
    const record = await MonthlyHours.findOne({ user: userId, yearMonth }).lean();
    return Number(record?.totalHoursUsed || 0);
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

/**
 * Included hours still available for a trip.
 * Soft monthly cap + hard quarterly ceiling.
 */
function computeFreeHoursLeft({
    monthlyUsed = 0,
    quarterlyUsed = 0,
    monthlyIncluded = 5,
    quarterlyIncluded = 15,
} = {}) {
    const monthlyRemaining = Math.max(0, Number(monthlyIncluded) - Number(monthlyUsed || 0));
    const quarterlyRemaining = Math.max(0, Number(quarterlyIncluded) - Number(quarterlyUsed || 0));
    return Math.min(monthlyRemaining, quarterlyRemaining);
}

/**
 * Load monthly + quarterly usage and return free hours left for pricing.
 */
async function getMembershipHourBalance(MonthlyHours, userId, settings, referenceDate = new Date()) {
    const monthlyIncluded = Number(settings?.membershipMonthlyHours) || 5;
    const quarterlyIncluded = monthlyIncluded * 3;

    const [monthlyUsed, quarterlyUsed] = await Promise.all([
        getMonthlyUsedHours(MonthlyHours, userId, referenceDate),
        getQuarterlyUsedHours(MonthlyHours, userId, referenceDate),
    ]);

    const freeHoursLeft = computeFreeHoursLeft({
        monthlyUsed,
        quarterlyUsed,
        monthlyIncluded,
        quarterlyIncluded,
    });

    return {
        monthlyIncluded,
        quarterlyIncluded,
        monthlyUsed: Number(monthlyUsed.toFixed(4)),
        quarterlyUsed: Number(quarterlyUsed.toFixed(4)),
        monthlyRemaining: Number(Math.max(0, monthlyIncluded - monthlyUsed).toFixed(4)),
        quarterlyRemaining: Number(Math.max(0, quarterlyIncluded - quarterlyUsed).toFixed(4)),
        freeHoursLeft: Number(freeHoursLeft.toFixed(4)),
    };
}

module.exports = {
    yearMonthKey,
    quarterYearMonths,
    getMonthlyUsedHours,
    getQuarterlyUsedHours,
    computeFreeHoursLeft,
    getMembershipHourBalance,
};
