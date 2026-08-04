// Loads apps/backend/.env (same file as src/server.js) and exposes the
// production guard — must be required before anything reads process.env.
const { assertSeedingAllowed, resolveSeedPassword } = require('./seedGuard');

const mongoose = require('mongoose');
const User = require('../models/User');

// Local-dev-only fallbacks. These are public (they live in git), so they must
// never be used anywhere but a developer's own machine. Override with the
// matching SEED_*_PASSWORD env vars — see .env.example.
const DEV_DEFAULT_PASSWORDS = {
  superAdmin: 'admin123456',
  bookingManager: 'manager123456',
  userManager: 'user123456',
};

// Built lazily so the env vars are read at seed time, not at import time.
const buildTestAdmins = () => [
  {
    name: 'Super Admin',
    email: 'admin@swifthaven.com',
    phone: '+1234567890',
    password: resolveSeedPassword('SEED_ADMIN_PASSWORD', DEV_DEFAULT_PASSWORDS.superAdmin, 'Super Admin'),
    role: 'admin',
    admin: {
      permissions: ['super-admin', 'manage-users', 'view-reports', 'manage-bookings']
    }
  },

  {
    name: 'Booking Manager',
    email: 'booking.manager@swifthaven.com',
    phone: '+1234567891',
    password: resolveSeedPassword('SEED_BOOKING_MANAGER_PASSWORD', DEV_DEFAULT_PASSWORDS.bookingManager, 'Booking Manager'),
    role: 'admin',
    admin: {
      permissions: ['manage-bookings', 'view-reports']
    }
  },
  {
    name: 'User Manager',
    email: 'user.manager@swifthaven.com',
    phone: '+1234567892',
    password: resolveSeedPassword('SEED_USER_MANAGER_PASSWORD', DEV_DEFAULT_PASSWORDS.userManager, 'User Manager'),
    role: 'admin',
    admin: {
      permissions: ['manage-users', 'view-reports']
    }
  }
];

// Connect to MongoDB
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI;
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

// Seed admin users
const seedAdmins = async () => {
  assertSeedingAllowed('adminSeeder.seedAdmins');

  try {
    console.log('🚀 Starting admin seeding process...');

    const testAdmins = buildTestAdmins();

    // Check if admins already exist
    const existingAdmins = await User.find({ role: 'admin' });
    if (existingAdmins.length > 0) {
      console.log(`⚠️  Found ${existingAdmins.length} existing admin(s). Skipping...`);
      return;
    }

    // Create admin users
    const createdAdmins = [];
    for (const adminData of testAdmins) {
      // Check if user with email already exists
      const existingUser = await User.findOne({ email: adminData.email });
      if (existingUser) {
        console.log(`⚠️  User with email ${adminData.email} already exists. Skipping...`);
        continue;
      }

      // Create new admin user
      const admin = new User(adminData);
      await admin.save();
      // Keep the plaintext alongside the doc — indexing back into testAdmins by
      // position is wrong as soon as one entry is skipped.
      createdAdmins.push({ doc: admin, password: adminData.password });
      console.log(`✅ Created admin: ${admin.name} (${admin.email})`);
    }

    if (createdAdmins.length > 0) {
      console.log(`\n🎉 Successfully created ${createdAdmins.length} admin user(s)!`);
      console.log('\n📋 Admin Credentials:');
      createdAdmins.forEach(({ doc: admin, password }) => {
        console.log(`\n👤 ${admin.name}`);
        console.log(`   Email: ${admin.email}`);
        console.log(`   Password: ${password}`);
        console.log(`   Permissions: ${admin.admin.permissions.join(', ')}`);
      });
    } else {
      console.log('ℹ️  No new admin users were created.');
    }

  } catch (error) {
    console.error('❌ Error seeding admin users:', error.message);
  }
};

// Clear all admin users (use with caution)
const clearAdmins = async () => {
  assertSeedingAllowed('adminSeeder.clearAdmins');

  try {
    console.log('🗑️  Clearing all admin users...');
    const result = await User.deleteMany({ role: 'admin' });
    console.log(`✅ Deleted ${result.deletedCount} admin user(s)`);
  } catch (error) {
    console.error('❌ Error clearing admin users:', error.message);
  }
};

// Main function
const main = async () => {
  const command = process.argv[2];

  // Fail before opening a connection, not after.
  assertSeedingAllowed('adminSeeder');

  try {
    await connectDB();

    switch (command) {
      case 'seed':
        await seedAdmins();
        break;
      case 'clear':
        await clearAdmins();
        break;
      case 'reset':
        await clearAdmins();
        await seedAdmins();
        break;
      default:
        console.log('📖 Usage:');
        console.log('  npm run seed:admin          - Seed admin users');
        console.log('  npm run seed:admin:clear    - Clear all admin users');
        console.log('  npm run seed:admin:reset    - Clear and reseed admin users');
        console.log('\n🔧 Or run directly:');
        console.log('  node src/seeders/adminSeeder.js [seed|clear|reset]');
    }

    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
    process.exit(0);

  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  seedAdmins,
  clearAdmins,
  connectDB
};
