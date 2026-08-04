// utils/backgroundJobs.js
//
// In-process sweeps (dispatch escalation, presence sync, membership renewal,
// stale booking cancellation).
//
// WHY THIS IS GATED: these run on setInterval inside the web process, so under
// PM2 cluster mode (or any multi-replica deploy) every job runs once per
// instance, concurrently. runMembershipRenewalSweep charges saved cards — N
// instances means N simultaneous attempts at the same member before
// nextBillingDate advances. Only ONE process may run them.
//
// Selection rules (first match wins):
//   RUN_CRON_JOBS=true / false      → explicit operator override
//   NODE_APP_INSTANCE set (PM2)     → only instance "0" runs them
//   neither set (local dev, single) → enabled, so nothing silently stops
//
// The long-term fix is to move these to a dedicated worker process or a
// distributed lock; the flag is the minimum safe guard.

const MINUTE = 60 * 1000;

/** Decide whether this process owns the scheduled jobs. */
const shouldRunBackgroundJobs = () => {
  const flag = process.env.RUN_CRON_JOBS;
  if (flag !== undefined && flag !== '') {
    return flag === 'true';
  }
  if (process.env.NODE_APP_INSTANCE !== undefined) {
    return process.env.NODE_APP_INSTANCE === '0';
  }
  return true;
};

/** setInterval wrapper that never lets a rejected promise kill the process. */
const scheduleSweep = (label, fn, intervalMs) =>
  setInterval(() => {
    Promise.resolve()
      .then(fn)
      .catch((e) => console.error(`${label} error:`, e?.message || e));
  }, intervalMs);

/**
 * Start every recurring sweep — no-op on instances that don't own them.
 * @returns {boolean} whether the jobs were started in this process
 */
const startBackgroundJobs = () => {
  if (!shouldRunBackgroundJobs()) {
    console.log(
      `⏸️  Background jobs disabled in this process (NODE_APP_INSTANCE=${process.env.NODE_APP_INSTANCE ?? 'unset'}, RUN_CRON_JOBS=${process.env.RUN_CRON_JOBS ?? 'unset'})`,
    );
    return false;
  }

  const { escalateExpiredOffers } = require('../services/dispatchService');
  const { runPresenceSweep } = require('../cron/presenceSweeper');
  const { runMembershipRenewalSweep } = require('../cron/membershipRenewalJob');
  const { runStaleBookingCancelSweep } = require('../cron/staleBookingCancelJob');

  // Dispatch escalation sweep — every minute, escalate unanswered stage-1 trip
  // offers (advance bookings) to stage 2 (Pro + Diamond). Same-day offers have a
  // single stage so they aren't touched here.
  scheduleSweep('Escalation sweep', escalateExpiredOffers, 1 * MINUTE);

  // Presence sync — refreshes isOnline for admin UI; does not clear availability intent.
  scheduleSweep('Availability sync', runPresenceSweep, 5 * MINUTE);

  // Membership auto-renewal — charges saved cards for members whose quarterly
  // (or monthly/annually) nextBillingDate has passed. Checked hourly; each
  // member is only actually charged once since nextBillingDate advances after
  // a successful charge.
  scheduleSweep('Membership renewal sweep', runMembershipRenewalSweep, 60 * MINUTE);

  // Auto-cancel past Pending/Confirmed trips that never completed — keeps
  // customer trip history accurate (Active / Completed / Cancelled).
  scheduleSweep('Stale booking cancel sweep', runStaleBookingCancelSweep, 15 * MINUTE);

  // Run once shortly after boot so orphans clear without waiting for first interval.
  setTimeout(() => {
    runStaleBookingCancelSweep().catch((e) => {
      console.error('Stale booking cancel sweep (boot) error:', e?.message || e);
    });
  }, 20 * 1000);

  console.log('⏱️  Background jobs started in this process');
  return true;
};

module.exports = { startBackgroundJobs, shouldRunBackgroundJobs };
