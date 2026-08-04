/**
 * seeders/seedGuard.js
 * ---------------------------------------------------------------------------
 * Shared safety rail for every seeder in this directory.
 *
 * Two jobs:
 *
 *  1. ENV LOADING — every seeder must read the *same* env file the server reads
 *     (apps/backend/.env). Previously some seeders loaded `.env.local` and some
 *     called `dotenv.config()` with no path (cwd-relative), so running a seeder
 *     from the monorepo root silently found no MONGODB_URI. Requiring this
 *     module first loads the canonical file for all of them.
 *
 *  2. PRODUCTION GUARD — seeders create accounts with known, printed passwords.
 *     Running one against a production MONGODB_URI plants a usable backdoor.
 *     `assertSeedingAllowed()` refuses to run when NODE_ENV === 'production'
 *     unless ALLOW_PROD_SEED=true is explicitly set, and exits non-zero.
 *
 * Seed passwords come from env vars (see .env.example). The historical
 * hardcoded values remain as *local-dev defaults only*, and using one prints a
 * loud warning so nobody ships an account whose password is in the repo.
 * ---------------------------------------------------------------------------
 */

const path = require('path');

// Canonical env file — must match src/server.js.
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Refuse to seed against production unless explicitly overridden.
 * Exits the process with a non-zero code rather than throwing, so this is safe
 * to call at the top of any seeder entrypoint.
 *
 * @param {string} seederName Shown in the error output.
 */
function assertSeedingAllowed(seederName = 'seeder') {
  const isProduction = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
  if (!isProduction) return;

  if (String(process.env.ALLOW_PROD_SEED || '').toLowerCase() !== 'true') {
    console.error('\n============================================================');
    console.error('🛑  REFUSING TO SEED: NODE_ENV=production');
    console.error('============================================================');
    console.error(`   Seeder: ${seederName}`);
    console.error('   Seeders create accounts with known passwords that are');
    console.error('   printed to stdout. Running this against a production');
    console.error('   database creates a backdoor.');
    console.error('');
    console.error('   If you are certain this is what you want, re-run with:');
    console.error('     ALLOW_PROD_SEED=true <command>');
    console.error('============================================================\n');
    process.exit(1);
  }

  console.warn('\n⚠️  ALLOW_PROD_SEED=true — seeding a PRODUCTION database.');
  console.warn(`   Seeder: ${seederName}`);
  console.warn('   Make sure every SEED_* password env var is set to a strong,');
  console.warn('   non-default value and rotate them immediately afterwards.\n');
}

/**
 * Read a seed password from the environment, falling back to a documented
 * local-dev default (with a warning) when unset.
 *
 * @param {string} envVar     e.g. 'SEED_ADMIN_PASSWORD'
 * @param {string} devDefault Local-dev-only fallback.
 * @param {string} label      Human label for the warning, e.g. 'Super Admin'.
 * @returns {string}
 */
function resolveSeedPassword(envVar, devDefault, label = envVar) {
  const fromEnv = process.env[envVar];
  if (fromEnv && String(fromEnv).length > 0) return String(fromEnv);

  console.warn(
    `⚠️  ${envVar} is not set — using the local-dev default password for "${label}". ` +
    'This password is committed to the repo; never use it outside local development.'
  );
  return devDefault;
}

module.exports = { assertSeedingAllowed, resolveSeedPassword };
