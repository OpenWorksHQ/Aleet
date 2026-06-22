/**
 * SAC/AQD local test seeder
 *
 * Prepares the database so same-day availability can be tested without
 * manually editing Compass:
 *   1. Lowers sameDayMCT to 0 (easier pass) — backs up previous values first
 *   2. Ensures 4+ approved Pro drivers are counted as AQD (online + fresh lastSeenAt)
 *
 * Usage (from monorepo root):
 *   npm run seed:sac-aqd --workspace=swift-haven-backend
 *
 * Revert tier settings + mark seeded drivers offline:
 *   npm run seed:sac-aqd:revert --workspace=swift-haven-backend
 *
 * Optional:
 *   SAC_REGION_ID=69fa2e4ef573e68e2ca68ff0
 *   node src/seeders/sacAqdTestSeeder.js seed <regionId>
 *   SAC_MIN_DRIVERS=4
 */

const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const User = require('../models/User');
const Region = require('../models/Region');
const TierSettings = require('../models/TierSettings');
const Vehicle = require('../models/Vehicle');

const BACKUP_PATH = path.resolve(__dirname, '../../.sac-aqd-tier-backup.json');
const MIN_DRIVERS = Number(process.env.SAC_MIN_DRIVERS || 4);
const TEST_PASSWORD = 'SacTest123!';
const TEST_EMAIL_PREFIX = 'sac-pro-';
const TEST_EMAIL_DOMAIN = '@test.aleet.local';

const TEST_DRIVER_TEMPLATES = [
  { name: 'SAC Pro Driver 1', phone: '+15550001001', email: `${TEST_EMAIL_PREFIX}1${TEST_EMAIL_DOMAIN}` },
  { name: 'SAC Pro Driver 2', phone: '+15550001002', email: `${TEST_EMAIL_PREFIX}2${TEST_EMAIL_DOMAIN}` },
  { name: 'SAC Pro Driver 3', phone: '+15550001003', email: `${TEST_EMAIL_PREFIX}3${TEST_EMAIL_DOMAIN}` },
  { name: 'SAC Pro Driver 4', phone: '+15550001004', email: `${TEST_EMAIL_PREFIX}4${TEST_EMAIL_DOMAIN}` },
  { name: 'SAC Pro Driver 5', phone: '+15550001005', email: `${TEST_EMAIL_PREFIX}5${TEST_EMAIL_DOMAIN}` },
];

async function connectDB() {
  const mongoURI = process.env.MONGODB_URI;
  if (!mongoURI) {
    throw new Error('MONGODB_URI is not set in apps/backend/.env');
  }
  await mongoose.connect(mongoURI);
  console.log('✅ MongoDB connected');
}

async function resolveRegion() {
  const regionId = process.argv[3] || process.env.SAC_REGION_ID;
  if (regionId) {
    const region = await Region.findById(regionId);
    if (!region) throw new Error(`Region not found: ${regionId}`);
    return region;
  }
  const region = await Region.findOne({ isActive: true }).sort('name');
  if (!region) throw new Error('No active region found. Create a region in admin first.');
  return region;
}

async function backupTierSettings(current) {
  const payload = {
    backedUpAt: new Date().toISOString(),
    sameDayMCT: current?.sameDayMCT ?? 2,
    sameDayMinRB: current?.sameDayMinRB ?? 2,
    sameDayRBRatio: current?.sameDayRBRatio ?? 0.25,
  };
  fs.writeFileSync(BACKUP_PATH, JSON.stringify(payload, null, 2));
  console.log(`💾 Tier settings backed up → ${BACKUP_PATH}`);
  return payload;
}

async function applyTestTierSettings() {
  let settings = await TierSettings.findOne();
  if (!settings) {
    settings = await TierSettings.create({});
    console.log('ℹ️  Created default TierSettings document');
  }

  const backup = await backupTierSettings(settings);

  settings.sameDayMCT = 0;
  settings.sameDayMinRB = 2;
  settings.sameDayRBRatio = 0.25;
  await settings.save();

  console.log('⚙️  Tier settings updated for local SAC/AQD testing:');
  console.log(`   sameDayMCT: ${backup.sameDayMCT} → 0  (REVERT before production)`);
  console.log(`   sameDayMinRB: ${settings.sameDayMinRB}`);
  console.log(`   sameDayRBRatio: ${settings.sameDayRBRatio}`);
}

async function revertTierSettings() {
  if (!fs.existsSync(BACKUP_PATH)) {
    console.log('⚠️  No backup file found — restoring production defaults (MCT=2, minRB=2, rbRatio=0.25)');
    let settings = await TierSettings.findOne();
    if (!settings) settings = await TierSettings.create({});
    settings.sameDayMCT = 2;
    settings.sameDayMinRB = 2;
    settings.sameDayRBRatio = 0.25;
    await settings.save();
    return;
  }

  const backup = JSON.parse(fs.readFileSync(BACKUP_PATH, 'utf8'));
  let settings = await TierSettings.findOne();
  if (!settings) settings = await TierSettings.create({});

  settings.sameDayMCT = backup.sameDayMCT;
  settings.sameDayMinRB = backup.sameDayMinRB;
  settings.sameDayRBRatio = backup.sameDayRBRatio;
  await settings.save();

  console.log('↩️  Tier settings reverted from backup:');
  console.log(`   sameDayMCT: ${backup.sameDayMCT}`);
  console.log(`   sameDayMinRB: ${backup.sameDayMinRB}`);
  console.log(`   sameDayRBRatio: ${backup.sameDayRBRatio}`);
}

async function getDefaultVehicleTypeIds() {
  const types = await Vehicle.find().select('_id').limit(3).lean();
  return types.map((t) => t._id);
}

function aqdDriverUpdate(regionId) {
  const now = new Date();
  return {
  $set: {
    'driver.status': 'approved',
    'driver.tier': 'Pro',
    'driver.availabilityStatus': 'available',
    'driver.availabilityUpdatedAt': now,
    'driver.lastHeartbeatAt': now,
    'driver.isOnline': true,
    'driver.serveAllRegions': true,
    'driver.regions': [regionId],
    active: true,
  },
  };
}

async function promoteExistingDrivers(region, vehicleTypeIds) {
  const now = new Date();

  // Prefer drivers already approved or close — exclude our sac test emails for this pass
  const candidates = await User.find({
    role: 'driver',
    email: { $not: new RegExp(`^${TEST_EMAIL_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`) },
  })
    .sort({
      'driver.status': 1,
      'driver.tier': 1,
    })
    .limit(50);

  const promoted = [];
  for (const driver of candidates) {
    if (promoted.length >= MIN_DRIVERS) break;

    await User.updateOne(
      { _id: driver._id },
      {
        $set: {
          'driver.status': 'approved',
          'driver.tier': 'Pro',
          'driver.availabilityStatus': 'available',
          'driver.availabilityUpdatedAt': now,
          'driver.lastHeartbeatAt': now,
          'driver.isOnline': true,
          'driver.serveAllRegions': true,
          'driver.regions': [region._id],
          active: true,
          ...(vehicleTypeIds.length > 0 && (!driver.driver?.vehicleTypes?.length)
            ? { 'driver.vehicleTypes': vehicleTypeIds }
            : {}),
        },
      },
    );

    promoted.push({
      id: String(driver._id),
      name: driver.name || driver.email || driver.phone,
      email: driver.email || '(no email)',
      source: 'existing',
    });
  }

  return promoted;
}

async function ensureTestDrivers(region, vehicleTypeIds, needed) {
  const created = [];
  if (needed <= 0) return created;

  const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 10);

  for (let i = 0; i < needed && i < TEST_DRIVER_TEMPLATES.length; i++) {
    const tpl = TEST_DRIVER_TEMPLATES[i];
    const existing = await User.findOne({ email: tpl.email, role: 'driver' });

    if (existing) {
      await User.updateOne({ _id: existing._id }, aqdDriverUpdate(region._id));
      created.push({ id: String(existing._id), name: tpl.name, email: tpl.email, source: 'test-existing' });
      continue;
    }

    const user = new User({
      name: tpl.name,
      email: tpl.email,
      phone: tpl.phone,
      password: hashedPassword,
      role: 'driver',
      isPhoneVerified: true,
      active: true,
      driver: {
        tier: 'Pro',
        status: 'approved',
        backgroundCheck: true,
        vehicleTypes: vehicleTypeIds,
        regions: [region._id],
        serveAllRegions: true,
        isOnline: true,
        availabilityStatus: 'available',
        availabilityUpdatedAt: new Date(),
        lastHeartbeatAt: new Date(),
        driverRating: 4.8,
      },
    });

    await user.save();
    created.push({ id: String(user._id), name: tpl.name, email: tpl.email, source: 'test-created' });
  }

  return created;
}

async function countAqd(regionId) {
  const { aqdDriverFilter } = require('../services/driverAvailabilityService');
  return User.countDocuments(aqdDriverFilter(regionId));
}

async function seedSacAqd() {
  const region = await resolveRegion();
  const vehicleTypeIds = await getDefaultVehicleTypeIds();

  console.log(`\n📍 Target region: ${region.name} (${region._id})`);
  console.log(`🎯 Minimum AQD drivers: ${MIN_DRIVERS}\n`);

  await applyTestTierSettings();

  const promoted = await promoteExistingDrivers(region, vehicleTypeIds);
  console.log(`\n👥 Promoted ${promoted.length} existing driver(s) to online approved Pro`);

  const stillNeeded = Math.max(0, MIN_DRIVERS - promoted.length);
  const created = await ensureTestDrivers(region, vehicleTypeIds, stillNeeded);
  if (created.length > 0) {
    console.log(`➕ Ensured ${created.length} dedicated SAC test driver(s)`);
  }

  const allDrivers = [...promoted, ...created];
  const aqd = await countAqd(region._id);

  console.log('\n📋 Drivers now counted toward AQD (simulated online):');
  allDrivers.forEach((d, idx) => {
    console.log(`   ${idx + 1}. ${d.name} <${d.email}> [${d.source}] id=${d.id}`);
  });

  if (created.length > 0 || stillNeeded > 0) {
    console.log(`\n🔑 SAC test driver login (driver portal http://localhost:3002/login):`);
    console.log(`   Password for all sac-pro-* accounts: ${TEST_PASSWORD}`);
  }

  console.log(`\n📊 Current AQD for region: ${aqd}`);
  console.log(`\n🧪 Re-test in browser:`);
  console.log(`   http://localhost:5000/api/regions/${region._id}/same-day-status`);
  console.log('\n⚠️  REMINDER: Run seed:sac-aqd:revert before production / client demo on real rules.');
  console.log('   (Restores sameDayMCT and marks sac-pro-* drivers offline)\n');
}

async function revertSacAqd() {
  await revertTierSettings();

  const result = await User.updateMany(
    {
      role: 'driver',
      email: { $regex: `^${TEST_EMAIL_PREFIX}`, $options: 'i' },
    },
    {
      $set: {
        'driver.isOnline': false,
        'driver.availabilityStatus': 'off',
        'driver.lastHeartbeatAt': null,
        'driver.availabilityUpdatedAt': null,
        'driver.presenceUntil': null,
        'driver.presenceMode': null,
      },
    },
  );

  console.log(`\n🔌 Marked ${result.modifiedCount} sac-pro-* test driver(s) offline`);
  console.log('ℹ️  Existing drivers promoted for testing were left as-is (online).');
  console.log('   Flip them offline manually in Compass if needed.\n');
}

async function main() {
  const cmd = process.argv[2] || 'seed';

  try {
    await connectDB();

    if (cmd === 'revert') {
      await revertSacAqd();
    } else if (cmd === 'seed') {
      await seedSacAqd();
    } else {
      console.log('Usage: node src/seeders/sacAqdTestSeeder.js [seed|revert]');
      process.exit(1);
    }
  } catch (err) {
    console.error('❌', err.message || err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  main();
}

module.exports = { seedSacAqd, revertSacAqd };
