/**
 * cron/membershipRenewalJob.js
 * ---------------------------------------------------------------------------
 * Quarterly (or monthly/annually, per TierSettings.membershipBillingCycle)
 * auto-renewal sweep. Finds active subscribers whose nextBillingDate has
 * passed and charges their saved default card for another cycle.
 *
 * Runs on an interval from server.js (no extra dependency like node-cron —
 * follows the same pattern as cron/presenceSweeper.js).
 * ---------------------------------------------------------------------------
 */

const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const User = require('../models/User');
const TierSettings = require('../models/TierSettings');

const CURRENCY = 'usd';

function computeQuarterlyCharge(settings, plan) {
    const isFounder   = plan === 'founder30';
    const ratePerHour = isFounder
        ? (Number(settings?.founder30Rate)  || 69)
        : (Number(settings?.membershipRate) || 89);
    const monthlyHours   = Number(settings?.membershipMonthlyHours) || 5;
    const quarterlyHours = monthlyHours * 3;
    return { ratePerHour, monthlyHours, quarterlyCharge: ratePerHour * quarterlyHours };
}

function computeNextBillingDate(settings, from = new Date()) {
    const cycle = settings?.membershipBillingCycle || 'quarterly';
    if (cycle === 'monthly')  return new Date(from.getFullYear(), from.getMonth() + 1, from.getDate());
    if (cycle === 'annually') return new Date(from.getFullYear() + 1, from.getMonth(), from.getDate());
    return new Date(from.getTime() + 90 * 24 * 3600 * 1000); // quarterly default
}

/**
 * Charges one member's saved card for their next billing cycle.
 * Non-fatal on failure — logs and moves on so one bad card doesn't block the sweep.
 */
async function renewOneMember(user, settings) {
    const plan = user.subscriptionDetails?.plan || 'standard';
    const customerId = user.subscriptionDetails?.stripeCustomerId;

    if (!customerId) {
        console.error(`⚠️ Membership renewal skipped for ${user._id}: no Stripe customer on file`);
        return { userId: user._id.toString(), ok: false, reason: 'no_stripe_customer' };
    }

    const customer = await stripe.customers.retrieve(customerId);
    const defaultPmId = customer.invoice_settings?.default_payment_method;
    if (!defaultPmId) {
        console.error(`⚠️ Membership renewal skipped for ${user._id}: no default saved card`);
        return { userId: user._id.toString(), ok: false, reason: 'no_default_card' };
    }

    const { ratePerHour, monthlyHours, quarterlyCharge } = computeQuarterlyCharge(settings, plan);

    const paymentIntent = await stripe.paymentIntents.create({
        amount:         Math.round(quarterlyCharge * 100),
        currency:       CURRENCY,
        customer:       customerId,
        payment_method: defaultPmId,
        confirm:        true,
        off_session:    true,
        description:    `Aleet ${plan === 'founder30' ? 'Founder 30' : 'Standard'} Membership — quarterly renewal`,
        metadata: {
            userId: user._id.toString(),
            type:   'subscription_renewal',
            plan
        }
    });

    if (paymentIntent.status !== 'succeeded') {
        console.error(`⚠️ Membership renewal for ${user._id} requires further action: ${paymentIntent.status}`);
        return { userId: user._id.toString(), ok: false, reason: `payment_intent_${paymentIntent.status}` };
    }

    const nextBillingDate = computeNextBillingDate(settings);
    await User.findByIdAndUpdate(user._id, {
        'subscriptionDetails.nextBillingDate':       nextBillingDate,
        'subscriptionDetails.price':                 quarterlyCharge,
        'subscriptionDetails.stripePaymentIntentId':  paymentIntent.id,
        'subscriptionDetails.updatedAt':              new Date(),
        'subscriptionDetails.monthlyHoursIncluded':   monthlyHours
    });

    console.log(`💳 Membership renewed for ${user._id} (${plan}) — $${quarterlyCharge} — next billing: ${nextBillingDate.toISOString()}`);
    return { userId: user._id.toString(), ok: true, amountCharged: quarterlyCharge, nextBillingDate };
}

/**
 * Sweeps all active subscribers whose nextBillingDate has passed and renews them.
 * Called on an interval from server.js.
 */
async function runMembershipRenewalSweep() {
    const settings = await TierSettings.findOne().lean();

    const dueMembers = await User.find({
        subscriptionStatus: 'subscriber',
        'subscriptionDetails.isActive': true,
        'subscriptionDetails.nextBillingDate': { $lte: new Date() }
    });

    if (dueMembers.length === 0) return { processed: 0, results: [] };

    const results = [];
    for (const user of dueMembers) {
        try {
            results.push(await renewOneMember(user, settings));
        } catch (err) {
            console.error(`❌ Membership renewal failed for ${user._id}:`, err?.message || err);
            results.push({ userId: user._id.toString(), ok: false, reason: err?.message || 'unknown_error' });
        }
    }

    console.log(`🔄 Membership renewal sweep: ${results.filter(r => r.ok).length}/${results.length} succeeded`);
    return { processed: results.length, results };
}

module.exports = { runMembershipRenewalSweep, computeQuarterlyCharge, computeNextBillingDate };
