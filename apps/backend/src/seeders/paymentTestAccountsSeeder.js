/**
 * seeders/paymentTestAccountsSeeder.js
 * ---------------------------------------------------------------------------
 * Creates 3 test customer accounts for Stripe Test-Mode payment/membership QA,
 * exactly as requested by the client:
 *
 *   1. Founder 30       — founder30 plan, saved test Visa card, fresh 15-hr
 *                         quarterly balance (0 used) so overage/deduction/late-night
 *                         scenarios can be exercised from a clean slate.
 *   2. Standard Member  — standard plan, saved test Visa card, fresh 15-hr
 *                         quarterly balance (0 used).
 *   3. Regular guest     — no membership, saved test Visa card too (so "saved
 *                         card charging" can be tested for non-members as well,
 *                         per the client's "all users can save cards" clarification).
 *
 * Run with:
 *   npm run seed:payment-test-accounts          (create/update the 3 accounts)
 *   npm run seed:payment-test-accounts:revert   (delete the 3 accounts + their Stripe customers)
 * ---------------------------------------------------------------------------
 */

const mongoose = require('mongoose');
const Stripe = require('stripe');

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const User = require('../models/User');
const MonthlyHours = require('../models/MonthlyHours');
const TierSettings = require('../models/TierSettings');

const TEST_PASSWORD = 'AleetTest123!';

const ACCOUNTS = [
    {
        key: 'founder30',
        name: 'Test Founder 30 Member',
        email: 'test.founder30@aleet.app',
        phone: '+15550000301',
        plan: 'founder30'
    },
    {
        key: 'standard',
        name: 'Test Standard Member',
        email: 'test.standard@aleet.app',
        phone: '+15550000302',
        plan: 'standard'
    },
    {
        key: 'regular',
        name: 'Test Regular Guest',
        email: 'test.regular@aleet.app',
        phone: '+15550000303',
        plan: null
    }
];

async function connectDB() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected successfully');
}

/**
 * Creates a Stripe customer + attaches Stripe's canonical test Visa payment
 * method token (pm_card_visa). This is the Stripe-documented way to attach a
 * "saved card" in Test Mode without submitting raw card numbers through the
 * API directly (which Stripe blocks for PCI reasons).
 */
async function createStripeCustomerWithSavedCard(account) {
    const customer = await stripe.customers.create({
        email: account.email,
        phone: account.phone,
        name: account.name,
        metadata: { seededTestAccount: 'true', accountKey: account.key }
    });

    const paymentMethod = await stripe.paymentMethods.attach('pm_card_visa', {
        customer: customer.id
    });

    await stripe.customers.update(customer.id, {
        invoice_settings: { default_payment_method: paymentMethod.id }
    });

    return { customerId: customer.id, paymentMethodId: paymentMethod.id };
}

async function seedOne(account, settings) {
    let user = await User.findOne({ email: account.email });

    const isMember = !!account.plan;
    const monthlyHours = Number(settings?.membershipMonthlyHours) || 5;
    const quarterlyHours = monthlyHours * 3;
    const ratePerHour = account.plan === 'founder30'
        ? (Number(settings?.founder30Rate)  || 69)
        : (Number(settings?.membershipRate) || 89);
    const quarterlyCharge = ratePerHour * quarterlyHours;

    let stripeInfo;
    if (user?.subscriptionDetails?.stripeCustomerId) {
        // Reuse existing customer, but make sure a saved card is attached.
        try {
            const cards = await stripe.paymentMethods.list({
                customer: user.subscriptionDetails.stripeCustomerId,
                type: 'card'
            });
            if (cards.data.length > 0) {
                stripeInfo = { customerId: user.subscriptionDetails.stripeCustomerId, paymentMethodId: cards.data[0].id };
            }
        } catch (_) { /* customer may have been deleted in Stripe test-data resets — recreate below */ }
    }
    if (!stripeInfo) {
        stripeInfo = await createStripeCustomerWithSavedCard(account);
    }

    const subscriptionDetails = isMember ? {
        plan: account.plan,
        price: quarterlyCharge,
        billingCycle: settings?.membershipBillingCycle || 'quarterly',
        startDate: new Date(),
        nextBillingDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        paymentMethodId: stripeInfo.paymentMethodId,
        stripeCustomerId: stripeInfo.customerId,
        isActive: true,
        monthlyHoursIncluded: monthlyHours
    } : {
        stripeCustomerId: stripeInfo.customerId,
        paymentMethodId: stripeInfo.paymentMethodId
    };

    if (!user) {
        user = new User({
            name: account.name,
            email: account.email,
            phone: account.phone,
            password: TEST_PASSWORD,
            role: 'customer',
            isPhoneVerified: true,
            subscriptionStatus: isMember ? 'subscriber' : 'non-subscriber',
            founder30Invited: account.plan === 'founder30',
            subscriptionDetails
        });
    } else {
        user.subscriptionStatus = isMember ? 'subscriber' : 'non-subscriber';
        if (account.plan === 'founder30') user.founder30Invited = true;
        user.subscriptionDetails = { ...(user.subscriptionDetails?.toObject?.() || user.subscriptionDetails || {}), ...subscriptionDetails };
        if (!user.password) user.password = TEST_PASSWORD; // preserve existing password if already set
    }

    await user.save();

    // Fresh quarterly balance: remove any existing MonthlyHours records for the
    // current quarter so the account starts at 0 used / full hours remaining.
    if (isMember) {
        const now = new Date();
        const monthsToClear = [0, 1, 2].map(offset => {
            const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        });
        await MonthlyHours.deleteMany({ user: user._id, yearMonth: { $in: monthsToClear } });
    }

    return {
        role: account.key,
        name: user.name,
        email: user.email,
        phone: user.phone,
        password: TEST_PASSWORD,
        plan: account.plan || 'none (regular / non-member)',
        stripeCustomerId: stripeInfo.customerId,
        savedCard: 'Visa •••• 4242 (Stripe test card, pm_card_visa)',
        hourBalance: isMember ? `${quarterlyHours} hrs / quarter (0 used)` : 'N/A — pay-per-ride',
        quarterlyCharge: isMember ? `$${quarterlyCharge}` : 'N/A'
    };
}

async function seed() {
    const settings = await TierSettings.findOne() || await TierSettings.create({});
    const summary = [];
    for (const account of ACCOUNTS) {
        console.log(`\n🌱 Seeding ${account.key}...`);
        summary.push(await seedOne(account, settings));
    }

    console.log('\n================= TEST ACCOUNTS READY (Stripe Test Mode) =================');
    for (const s of summary) {
        console.log(`\n👤 ${s.name}  [${s.role}]`);
        console.log(`   Login:            ${s.email}  /  ${s.password}`);
        console.log(`   Plan:             ${s.plan}`);
        console.log(`   Stripe Customer:  ${s.stripeCustomerId}`);
        console.log(`   Saved Card:       ${s.savedCard}`);
        console.log(`   Hour Balance:     ${s.hourBalance}`);
        console.log(`   Quarterly Charge: ${s.quarterlyCharge}`);
    }
    console.log('\n=============================================================================');
    console.log('All cards are Stripe TEST MODE only (pm_card_visa) — no real money moves.');
    console.log('Use Stripe test card 4242 4242 4242 4242 (any future date/CVC) for any NEW charges made through the UI.\n');
}

async function revert() {
    for (const account of ACCOUNTS) {
        const user = await User.findOne({ email: account.email });
        if (!user) {
            console.log(`ℹ️  ${account.email} not found — skipping`);
            continue;
        }
        const customerId = user.subscriptionDetails?.stripeCustomerId;
        if (customerId) {
            try {
                await stripe.customers.del(customerId);
                console.log(`🗑️  Deleted Stripe customer ${customerId}`);
            } catch (err) {
                console.error(`⚠️  Could not delete Stripe customer ${customerId}:`, err.message);
            }
        }
        await MonthlyHours.deleteMany({ user: user._id });
        await User.deleteOne({ _id: user._id });
        console.log(`🗑️  Deleted user ${account.email}`);
    }
}

async function main() {
    const command = process.argv[2];
    await connectDB();

    try {
        if (command === 'revert') {
            await revert();
        } else {
            await seed();
        }
    } finally {
        await mongoose.connection.close();
        console.log('🔌 MongoDB connection closed');
    }
}

if (require.main === module) {
    main().catch((err) => {
        console.error('❌ Seeding failed:', err);
        process.exit(1);
    });
}

module.exports = { seed, revert };
