/**
 * Reset passwords for local SAC/AQD testing.
 *
 * Usage:
 *   node src/seeders/resetTestDriverPasswords.js
 *   node src/seeders/resetTestDriverPasswords.js email1@x.com email2@x.com
 */

const path = require('path');
const mongoose = require('mongoose');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const User = require('../models/User');

const DEFAULT_PASSWORD = 'SacTest123!';

const DEFAULT_EMAILS = [
  'sanistraymail@gmail.com',
  'sanistraymail1@gmail.com',
  'dimondkhan02@gmail.com',
  'prokhan01@gmail.com',
];

async function main() {
  const emails = process.argv.slice(2).length > 0 ? process.argv.slice(2) : DEFAULT_EMAILS;
  const password = process.env.SAC_TEST_PASSWORD || DEFAULT_PASSWORD;

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ MongoDB connected\n');

  for (const email of emails) {
    const user = await User.findOne({ email: email.toLowerCase(), role: 'driver' });
    if (!user) {
      console.log(`⚠️  Not found: ${email}`);
      continue;
    }

    // Plain password — User pre-save hook will bcrypt-hash it once.
    user.password = password;
    await user.save();

    console.log(`✅ Password reset: ${email}`);
    console.log(`   Name: ${user.name || '(no name)'}`);
    console.log(`   ID:   ${user._id}`);
    console.log(`   Tier: ${user.driver?.tier || 'n/a'} | Status: ${user.driver?.status || 'n/a'}\n`);
  }

  console.log('🔑 Use these credentials on http://localhost:3002/login');
  console.log(`   Password for all listed accounts: ${password}\n`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('❌', err.message || err);
  process.exit(1);
});
