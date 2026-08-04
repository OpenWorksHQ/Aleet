/**
 * encryptExistingSsns.js — one-time (idempotent) migration
 * ---------------------------------------------------------------------------
 * Encrypts every plaintext `driver.ssn` already sitting in the users
 * collection. New writes are encrypted automatically by the setter on
 * models/User.js; this backfills the rows that predate that change.
 *
 * Usage (from apps/backend):
 *   node src/seeders/encryptExistingSsns.js --dry-run     # report only
 *   node src/seeders/encryptExistingSsns.js               # apply
 *
 * Or from the monorepo root:
 *   node apps/backend/src/seeders/encryptExistingSsns.js --dry-run
 *
 * (No npm script is registered for it — this is a one-time backfill, not part
 * of the seed workflow.)
 *
 * Requires SSN_ENCRYPTION_KEY (64 hex chars). See .env.example.
 *
 * IDEMPOTENT: values already in the `enc:v1:` envelope are skipped, so
 * re-running is a no-op. Safe to run twice, or to run again after a partial
 * failure.
 *
 * WHY NO assertSeedingAllowed(): the guard in seedGuard.js exists to stop
 * *seeders* — which mint accounts with known, printed passwords — from
 * touching a live database. This is not a seeder. It creates nothing, prints
 * no secrets, and production is exactly where the plaintext SSNs it fixes
 * live. Blocking it there would defeat its purpose. seedGuard is still
 * required, for its other job: loading the canonical apps/backend/.env so this
 * script reads the same MONGODB_URI the server does.
 * ---------------------------------------------------------------------------
 */

// Side-effect require: loads apps/backend/.env (same file as src/server.js).
// assertSeedingAllowed is deliberately NOT called — see the header note.
require('./seedGuard');

const mongoose = require('mongoose');

const { encryptSSN, isEncrypted, hasKey, KEY_HEX_LENGTH } = require('../utils/ssnCrypto');

const BATCH_SIZE = 500;

async function encryptExistingSsns({ dryRun = false } = {}) {
  if (!hasKey()) {
    throw new Error(
      `SSN_ENCRYPTION_KEY is not set (or is not ${KEY_HEX_LENGTH} hex characters). ` +
      'Nothing would be encrypted. Generate one with:\n' +
      '  node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
    );
  }

  // Raw collection access on purpose: the schema getter would hand back
  // decrypted plaintext for already-migrated rows, and we would then re-encrypt
  // them with a fresh IV on every run — a rewrite storm, and not idempotent.
  // The driver-level cursor sees exactly what is on disk.
  const collection = mongoose.connection.collection('users');

  const filter = {
    'driver.ssn': { $exists: true, $nin: [null, ''] },
  };

  const cursor = collection.find(filter, { projection: { 'driver.ssn': 1 } });

  let scanned = 0;
  let alreadyEncrypted = 0;
  let toEncrypt = 0;
  let updated = 0;
  let failed = 0;
  let ops = [];

  const flush = async () => {
    if (!ops.length) return;
    if (!dryRun) {
      const res = await collection.bulkWrite(ops, { ordered: false });
      updated += res.modifiedCount || 0;
    }
    ops = [];
  };

  for await (const doc of cursor) {
    scanned += 1;
    const current = doc?.driver?.ssn;

    if (isEncrypted(current)) {
      alreadyEncrypted += 1;
      continue;
    }

    let ciphertext;
    try {
      ciphertext = encryptSSN(current);
    } catch (err) {
      failed += 1;
      console.error(`   ✖ ${doc._id}: ${err.message}`);
      continue;
    }

    // Defensive: encryptSSN passes values through unchanged when no key is
    // configured. hasKey() above should make this unreachable.
    if (!isEncrypted(ciphertext)) {
      failed += 1;
      console.error(`   ✖ ${doc._id}: value did not encrypt — skipped.`);
      continue;
    }

    toEncrypt += 1;
    ops.push({
      updateOne: {
        // Re-assert the pre-image so a concurrent write between the read and
        // the write is never clobbered.
        filter: { _id: doc._id, 'driver.ssn': current },
        update: { $set: { 'driver.ssn': ciphertext } },
      },
    });

    if (ops.length >= BATCH_SIZE) await flush();
  }

  await flush();

  console.log('\n────────────────────────────────────────────');
  console.log(dryRun ? '🔍 DRY RUN — nothing was written' : '🔐 SSN encryption migration');
  console.log('────────────────────────────────────────────');
  console.log(`   Drivers with an SSN scanned : ${scanned}`);
  console.log(`   Already encrypted (skipped) : ${alreadyEncrypted}`);
  console.log(`   Plaintext ${dryRun ? 'that would be encrypted' : 'encrypted'} : ${toEncrypt}`);
  if (!dryRun) console.log(`   Documents modified          : ${updated}`);
  if (failed) console.log(`   ⚠️  Failed                    : ${failed}`);
  console.log('────────────────────────────────────────────\n');

  if (dryRun && toEncrypt > 0) {
    console.log('   Re-run without --dry-run to apply.\n');
  }

  return { scanned, alreadyEncrypted, toEncrypt, updated, failed, dryRun };
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || args.includes('-n');

  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI is not set (expected in apps/backend/.env).');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected');

    const result = await encryptExistingSsns({ dryRun });
    if (result.failed > 0) process.exitCode = 1;
  } catch (err) {
    console.error('❌', err.message || err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  main();
}

module.exports = { encryptExistingSsns };
