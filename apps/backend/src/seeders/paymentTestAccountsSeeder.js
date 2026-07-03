/**
 * Payment / membership test accounts for client QA (Stripe Test Mode).
 *
 * Creates 3 customer accounts:
 *   1. Regular non-member (saved card, no subscription)
 *   2. Standard membership subscriber ($89/hr plan)
 *   3. Founder 30 subscriber ($69/hr plan, invite flag set)
 *
 * Members get a Stripe test customer + default card (4242…) and a seeded
 * MonthlyHours balance for the current month.
 *
 * Usage (from apps/backend):
 *   npm run seed:payment-test-accounts
 *
 * Remove seeded users + Stripe customers:
 *   npm run seed:payment-test-accounts:revert
 */

const path = require('path');
const mongoose = require('mongoose');
const Stripe = require('stripe');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const User = require('../models/User');
const MonthlyHours = require('../models/MonthlyHours');
const TierSettings = require('../models/TierSettings');

const TEST_PASSWORD = 'AleetTest2026!';

const ACCOUNTS = [
  {
    key: 'regular',
    name: 'Client Test — Regular',
    email: 'client-test-regular@aleet.app',
    phone: '+15559001001',
    subscriptionStatus: 'non-subscriber',
    founder30Invited: false,
    plan: null,
    monthlyHoursUsed: null,
    attachCard: true,
  },
  {
    key: 'standard',
    name: 'Client Test — Standard Member',
    email: 'client-test-standard@aleet.app',
    phone: '+15559001002',
    subscriptionStatus: 'subscriber',
    founder30Invited: false,
    plan: 'standard',
    monthlyHoursUsed: 1, // 4 of 5 prepaid hrs left this month
    attachCard: true,
  },
  {
    key: 'founder30',
    name: 'Client Test — Founder 30',
    email: 'client-test-founder30@aleet.app',
    phone: '+15559001003',
    subscriptionStatus: 'subscriber',
    founder30Invited: true,
    plan: 'founder30',
    monthlyHoursUsed: 4, // 1 hr left — easy overage test on confirm
    attachCard: true,
  },
];

function currentYearMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

async function connectDB() {
  const mongoURI = process.env.MONGODB_URI;
  if (!mongoURI) throw new Error('MONGODB_URI is not set in apps/backend/.env');
  await mongoose.connect(mongoURI);
  console.log('✅ MongoDB connected');
}

async function attachTestCard(stripe, user) {
  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name,
    phone: user.phone,
    metadata: { userId: user._id.toString(), seeded: 'payment-test-accounts' },
  });

  // Stripe test-mode helper PM — no raw card numbers sent to the API
  const paymentMethod = await stripe.paymentMethods.attach('pm_card_visa', {
    customer: customer.id,
  });

  await stripe.customers.update(customer.id, {
    invoice_settings: { default_payment_method: paymentMethod.id },
  });

  return { customerId: customer.id, paymentMethodId: paymentMethod.id };
}

async function upsertAccount(stripe, settings, account) {
  const monthlyHours = Number(settings?.membershipMonthlyHours) || 5;
  const ratePerHour =
    account.plan === 'founder30'
      ? Number(settings?.founder30Rate) || 69
      : Number(settings?.membershipRate) || 89;
  const quarterlyCharge = ratePerHour * monthlyHours * 3;
  const nextBillingDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

  let user = await User.findOne({ email: account.email, role: 'customer' });

  if (!user) {
    user = new User({
      name: account.name,
      email: account.email,
      phone: account.phone,
      password: TEST_PASSWORD,
      role: 'customer',
      isPhoneVerified: true,
    });
  } else {
    user.name = account.name;
    user.phone = account.phone;
    user.password = TEST_PASSWORD;
    user.isPhoneVerified = true;
  }

  user.subscriptionStatus = account.subscriptionStatus;
  user.founder30Invited = account.founder30Invited;

  if (account.plan) {
    user.subscriptionDetails = {
      ...(user.subscriptionDetails?.toObject?.() || user.subscriptionDetails || {}),
      plan: account.plan,
      price: quarterlyCharge,
      billingCycle: settings?.membershipBillingCycle || 'quarterly',
      startDate: new Date(),
      nextBillingDate,
      isActive: true,
      monthlyHoursIncluded: monthlyHours,
    };
  } else {
    user.subscriptionDetails = {
      plan: null,
      price: null,
      billingCycle: null,
      startDate: null,
      nextBillingDate: null,
      paymentMethodId: null,
      stripeCustomerId: user.subscriptionDetails?.stripeCustomerId || null,
      isActive: false,
      monthlyHoursIncluded: 0,
    };
  }

  await user.save();

  if (account.attachCard) {
    if (user.subscriptionDetails?.stripeCustomerId) {
      try {
        await stripe.customers.del(user.subscriptionDetails.stripeCustomerId);
      } catch (_) {
        // ignore missing customer
      }
    }

    const { customerId, paymentMethodId } = await attachTestCard(stripe, user);
    user.subscriptionDetails.stripeCustomerId = customerId;
    user.subscriptionDetails.paymentMethodId = paymentMethodId;
    await user.save();
  }

  if (account.monthlyHoursUsed != null) {
    const yearMonth = currentYearMonth();
    await MonthlyHours.findOneAndUpdate(
      { user: user._id, yearMonth },
      { $set: { totalHoursUsed: account.monthlyHoursUsed } },
      { upsert: true, new: true }
    );
  }

  const hoursLeft =
    account.monthlyHoursUsed != null
      ? Math.max(0, monthlyHours - account.monthlyHoursUsed)
      : null;

  return {
    key: account.key,
    userId: user._id.toString(),
    email: account.email,
    phone: account.phone,
    password: TEST_PASSWORD,
    plan: account.plan,
    subscriptionStatus: user.subscriptionStatus,
    founder30Invited: user.founder30Invited,
    stripeCustomerId: user.subscriptionDetails?.stripeCustomerId || null,
    paymentMethodId: user.subscriptionDetails?.paymentMethodId || null,
    monthlyHoursUsed: account.monthlyHoursUsed,
    monthlyHoursRemaining: hoursLeft,
    yearMonth: account.monthlyHoursUsed != null ? currentYearMonth() : null,
  };
}

async function seed() {
  if (!process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_')) {
    throw new Error('Refusing to seed payment test accounts: STRIPE_SECRET_KEY must be a test key (sk_test_…)');
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  await connectDB();

  let settings = await TierSettings.findOne();
  if (!settings) settings = await TierSettings.create({});

  console.log('\n🌱 Seeding payment test accounts (Stripe Test Mode)…\n');

  const results = [];
  for (const account of ACCOUNTS) {
    const row = await upsertAccount(stripe, settings, account);
    results.push(row);
    console.log(`✅ ${account.key}: ${row.email} (${row.userId})`);
  }

  console.log('\n────────── Credentials for William ──────────\n');
  for (const r of results) {
    console.log(`【${r.key.toUpperCase()}】`);
    console.log(`  Email:    ${r.email}`);
    console.log(`  Phone:    ${r.phone}`);
    console.log(`  Password: ${r.password}`);
    console.log(`  User ID:  ${r.userId}`);
    if (r.plan) {
      console.log(`  Plan:     ${r.plan}`);
      console.log(`  Hours:    ${r.monthlyHoursUsed} used / ${r.monthlyHoursRemaining} free left (${r.yearMonth})`);
    }
    if (r.stripeCustomerId) {
      console.log(`  Stripe customer: ${r.stripeCustomerId}`);
      console.log(`  Saved card PM:   ${r.paymentMethodId}`);
    }
    console.log('');
  }

  console.log('Stripe publishable key (frontend):', process.env.STRIPE_PUBLISHABLE_KEY || '(not set in .env)');
  console.log('\nDone. Share the credentials above with your client.\n');
}

async function revert() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not set');
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  await connectDB();

  console.log('\n🧹 Reverting payment test accounts…\n');

  for (const account of ACCOUNTS) {
    const user = await User.findOne({ email: account.email, role: 'customer' });
    if (!user) {
      console.log(`⏭️  ${account.key}: not found`);
      continue;
    }

    const customerId = user.subscriptionDetails?.stripeCustomerId;
    if (customerId) {
      try {
        await stripe.customers.del(customerId);
        console.log(`   Deleted Stripe customer ${customerId}`);
      } catch (err) {
        console.log(`   Stripe customer delete skipped: ${err.message}`);
      }
    }

    await MonthlyHours.deleteMany({ user: user._id });
    await User.deleteOne({ _id: user._id });
    console.log(`✅ Removed ${account.email}`);
  }

  console.log('\nRevert complete.\n');
}

const cmd = process.argv[2] || 'seed';

(async () => {
  try {
    if (cmd === 'seed') await seed();
    else if (cmd === 'revert') await revert();
    else throw new Error(`Unknown command: ${cmd}. Use "seed" or "revert".`);
  } catch (err) {
    console.error('❌', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
