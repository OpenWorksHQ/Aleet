# Aleet
 
Aleet Platform - Customer App, Driver App, Backend, Infrastructure and Documentation

---

## Table of Contents

1. [Repository Layout](#repository-layout)
2. [Prerequisites](#prerequisites)
3. [Install Dependencies](#install-dependencies)
4. [Branching & Pull Request Rules](#branching--pull-request-rules)
5. [Backend Setup](#backend-setup)
6. [Frontend Setup](#frontend-setup)
7. [Driver Portal Setup](#driver-portal-setup)
8. [Running the Apps](#running-the-apps)
9. [Important Rules & Conventions](#important-rules--conventions)
10. [Deployment & Operations](#deployment--operations)
11. [Troubleshooting](#troubleshooting)
12. [Quick Reference](#quick-reference)

---

## Repository Layout

```
Aleet/
├── apps/
│   ├── backend/           # Express + MongoDB API (Node.js)  → port 5000
│   ├── frontend/          # Customer-facing Next.js app       → port 3001
│   └── driver-portal/     # Driver/admin Next.js app          → port 3002
├── .github/
│   └── workflows/
│       └── deploy-backend.yml
├── package.json           # Root workspace config
├── turbo.json             # Turborepo task pipeline
├── package-lock.json
├── .gitignore
└── DEVELOPER_GUIDE.md     # This file
```

Aleet uses **Turborepo + npm workspaces**. Each app keeps its own `package.json`, scripts, and environment file, but dependencies are installed once from the root.

---

## Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 10
- **Git**

---

## Install Dependencies

> **Run `npm install` only at the project root. Do NOT run `npm install` inside `apps/backend`, `apps/frontend`, or `apps/driver-portal`.**

npm workspaces hoists all dependencies from a single root install. Running install inside individual app folders creates duplicate `node_modules` and can cause version conflicts.

```bash
# Correct
git clone <repo-url>
cd Aleet
npm install

# Wrong — do not do this
cd apps/frontend && npm install   # ❌
cd apps/backend && npm install    # ❌
```

---

## Branching & Pull Request Rules

> **These rules are mandatory for every developer.**

- **Always branch from `main`.** Make sure your local `main` is up to date first.
- **Never push directly to `main`.** All changes must go through a Pull Request.
- **Always open a PR** targeting `main` and have it reviewed before merging.
- Use a **descriptive branch prefix** based on the type of work:


| Prefix      | Use for                              | Example                    |
| ----------- | ------------------------------------ | -------------------------- |
| `feat/`     | New feature                          | `feat/payment-process`     |
| `fix/`      | Bug fix                              | `fix/booking-fee-rounding` |
| `chore/`    | Tooling, config, deps                | `chore/update-eslint`      |
| `refactor/` | Code restructure, no behavior change | `refactor/booking-helpers` |
| `docs/`     | Documentation only                   | `docs/api-guide`           |


### Standard workflow

```bash
# 1. Get the latest main
git checkout main
git pull origin main

# 2. Cut a new branch from main
git checkout -b feat/my-feature

# 3. Do your work and commit with conventional messages
git add <files>
git commit -m "feat(payments): add saved card support"

# 4. Push your branch (never main)
git push -u origin feat/my-feature

# 5. Open a Pull Request into main and request review
```

Use conventional commit prefixes in messages: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`.

---

## Backend Setup

**Location:** `apps/backend` — Express + MongoDB API, runs on **port 5000**.

### 1. Create the environment file

```bash
cp apps/backend/.env.example apps/backend/.env
```

Then fill in the values. Required keys:

```
# Server
PORT=5000
NODE_ENV=development
APP_BASE_URL=http://localhost:5000
FRONTEND_URL=http://localhost:3001
DRIVER_PORTAL_URL=http://localhost:3002
ALLOWED_ORIGINS=
API_URL=http://localhost:5000

# Database
MONGODB_URI=                 # MongoDB connection string

# Auth
JWT_SECRET=                  # secret used to sign JWT tokens
SESSION_SECRET=

# Stripe
STRIPE_SECRET_KEY=           # sk_test_xxx or sk_live_xxx
STRIPE_WEBHOOK_SECRET=       # whsec_xxx (from Stripe Dashboard → Webhooks)

# Twilio (SMS)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_MESSAGING_SERVICE_SID=
TWILIO_PHONE_NUMBER=

# AWS S3 (file uploads)
AWS_REGION=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=

# Checkr (driver background checks)
CHECKR_API_KEY=

# Google Maps (route/ETA validation)
GOOGLE_MAPS_API_KEY=
```

### 2. Run the backend

```bash
npm run dev --workspace=apps/backend
```

The server should log: `🚀 Server running on http://localhost:5000`

### 3. Seed scripts (optional)

```bash
npm run seed --workspace=apps/backend
npm run seed:admin --workspace=apps/backend
npm run seed:vehicles --workspace=apps/backend
```

### 4. Stripe webhooks (local)

To test Stripe webhooks locally, use the Stripe CLI:

```bash
stripe login
stripe listen --forward-to localhost:5000/api/payments/webhook
```

Copy the `whsec_...` value it prints into `STRIPE_WEBHOOK_SECRET` in your `.env`.

---

## Frontend Setup

**Location:** `apps/frontend` — Customer-facing Next.js app, runs on **port 3001**.

### 1. Create the environment file

The frontend uses `.env.local` (not committed to git):

```bash
cp apps/frontend/.env.example apps/frontend/.env.local
```

If no example exists, create `apps/frontend/.env.local` manually with the keys below.

### 2. Required environment variables

All client-exposed variables in Next.js **must** be prefixed with `NEXT_PUBLIC_`.

```
# Backend API base URL — must match the backend PORT
NEXT_PUBLIC_API_URL=http://localhost:5000

# Backend Socket.IO server URL (real-time updates)
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000

# Google Maps (address autocomplete, map display)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=

# Stripe publishable key (safe to expose — used by Stripe.js for card UI)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
```


| Variable                             | Purpose                                           | Example                 |
| ------------------------------------ | ------------------------------------------------- | ----------------------- |
| `NEXT_PUBLIC_API_URL`                | Base URL the app calls for REST endpoints         | `http://localhost:5000` |
| `NEXT_PUBLIC_SOCKET_URL`             | Socket.IO server for live updates                 | `http://localhost:5000` |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`    | Maps & address autocomplete                       | `AIza...`               |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe.js card collection (saved cards, checkout) | `pk_test_...`           |


> **Important:** `NEXT_PUBLIC_API_URL` must point at the same port the backend uses (`PORT` in the backend `.env`). If they don't match, all API calls will fail.

### 3. Run the frontend

```bash
npm run dev --workspace=apps/frontend
```

Open `http://localhost:3001`.

---

## Driver Portal Setup

**Location:** `apps/driver-portal` — Driver/admin Next.js app, runs on **port 3002**.

### 1. Create the environment file

```bash
cp apps/driver-portal/.env.example apps/driver-portal/.env.local
```

### 2. Required environment variables

```
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
```

Same variable meanings as the frontend table above.

### 3. Run the driver portal

```bash
npm run dev --workspace=apps/driver-portal
```

Open `http://localhost:3002`.

---

## Running the Apps

### Run all three apps at once (recommended for full-stack work)

From the project root:

```bash
npm run dev
```

This uses **concurrently** to start all three apps via npm workspaces (reliable on Windows).


| App           | URL                     | Dev command (internal)             |
| ------------- | ----------------------- | ---------------------------------- |
| Backend       | `http://localhost:5000` | `nodemon --no-stdin src/server.js` |
| Frontend      | `http://localhost:3001` | `next dev -p 3001`                 |
| Driver Portal | `http://localhost:3002` | `next dev --webpack -p 3002`       |


### Run a single app

```bash
npm run dev --workspace=apps/backend
npm run dev --workspace=apps/frontend
npm run dev --workspace=apps/driver-portal
```

### Other root commands

```bash
npm run build    # Build all apps
npm run lint     # Lint all apps
npm run start    # Start all apps in production mode
```

---

## Important Rules & Conventions

### Do

- Run `npm install` **only at the project root**
- Keep each app's changes inside its own `apps/<name>/` folder
- **Always branch from `main`** using a `feat/`, `fix/`, `chore/`, `refactor/`, or `docs/` prefix
- **Always open a PR** into `main` and get it reviewed before merging
- Add `.env` / `.env.local` files locally — never commit them
- Use conventional commit messages (`feat:`, `fix:`, `chore:`)

### Do not

- Run `npm install` inside individual `apps/*` folders
- **Push directly to `main`** — always go through a PR
- Edit shared root config (`package.json`, `turbo.json`) unless coordinating with the team
- Commit `node_modules/`, `.next/`, `.env`, `.env.local`, or `.turbo/` directories

### Port assignments (local dev)


| App           | Port                                                   |
| ------------- | ------------------------------------------------------ |
| Backend       | Set via `PORT` in `apps/backend/.env` (default `5000`) |
| Frontend      | `3001` (hardcoded in `package.json` dev script)        |
| Driver Portal | `3002` (hardcoded in `package.json` dev script)        |


Make sure all three are running when doing full-stack integration testing.

### Package names (for `--workspace`)


| App folder           | npm package name        |
| -------------------- | ----------------------- |
| `apps/backend`       | `swift-haven-backend`   |
| `apps/frontend`      | `aleet-frontend`        |
| `apps/driver-portal` | `driver-aleet-frontend` |


---

## Deployment & Operations

**Backend only.** `.github/workflows/deploy-backend.yml` deploys `apps/backend` on every push to `main`/`master` that touches the backend, the root `package.json`/`package-lock.json`, or the workflow itself. It runs on a **self-hosted GitHub Actions runner installed on the EC2 box** and restarts the app under **PM2** (process name `aleet-backend`). The frontends are not deployed by this workflow.

### What a deploy does, in order

1. `actions/checkout` — refreshes the working copy (this also runs `git clean -ffdx`, see below).
2. Creates/validates the persistent upload directory and links `apps/backend/uploads` to it.
3. `npm ci` at the root — **full** install including dev dependencies.
4. `node --check` over every file in `apps/backend/src` (syntax gate; the entrypoint is checked explicitly).
5. `npm test --workspace=swift-haven-backend` (`node --test src/`).
6. `npm ci --omit=dev --workspace=swift-haven-backend` — prunes back to production dependencies.
7. Generates `apps/backend/.env` from GitHub Secrets/Variables, `chmod 600`.
8. `pm2 restart aleet-backend`.
9. Health check — polls `http://127.0.0.1:$PORT/health` and fails the run if the process never answers.

Steps 3–5 are the quality gate: **if the tests or the syntax check fail, PM2 is never restarted** and the previously running build stays up. The `.env` is written *after* the tests on purpose, so a test can never pick up production credentials.

### Why `UPLOAD_DIR` must live outside the workspace

`actions/checkout` runs `git clean -ffdx` on an existing runner workspace. The `-x` flag deletes **gitignored** files, and `uploads` is listed in `apps/backend/.gitignore`. Any uploaded file stored under `$GITHUB_WORKSPACE` is therefore deleted on the next deploy — this is what was wiping driver's-license images, vehicle photos and investor documents.

The fix is `UPLOAD_DIR`, which points at a path **outside** `$GITHUB_WORKSPACE` (default `/var/lib/aleet/uploads`). The workflow creates it, creates the `investor/` subdirectory used by the data-room uploads, and symlinks `apps/backend/uploads` → `$UPLOAD_DIR` so the `/uploads` static route keeps resolving. `git clean` removes the *symlink*, never the directory it points at.

The workflow refuses to run if `UPLOAD_DIR` resolves inside `$GITHUB_WORKSPACE`. Do not move it back.

One-time setup on the EC2 host (or let the workflow create it, which requires passwordless `sudo`):

```bash
sudo mkdir -p /var/lib/aleet/uploads/investor
sudo chown -R <runner-user>:<runner-user> /var/lib/aleet/uploads
```

If you have a backup of the old `apps/backend/uploads`, copy it into `/var/lib/aleet/uploads` **before** the next deploy — the workflow can only rescue files that still exist in the workspace.

Setting `AWS_S3_BUCKET` switches uploads to S3 and makes `UPLOAD_DIR` irrelevant; leave it empty to keep using local disk.

### Cron sweeps must run on exactly one instance

`apps/backend/src/server.js` starts four in-process `setInterval` sweeps: dispatch offer escalation (1 min), presence sync (5 min), membership auto-renewal (1 hour), and stale-booking cancellation (15 min). Because they run inside the API process, **one process = one copy of every sweep**. `RUN_CRON_JOBS` is the flag that decides whether a process runs them, and the deploy sets it to `true` for this single-instance PM2 deploy.

If you ever scale PM2 past one instance (`pm2 scale`, cluster mode) or add a second host, `RUN_CRON_JOBS` must be `true` on **exactly one** instance and `false` everywhere else. Otherwise the membership renewal sweep charges saved cards once per instance and bookings get swept N times.

### Environment variables the deploy sets

Configure these in **GitHub → Settings → Secrets and variables → Actions**. Repo *variables* are non-sensitive; *secrets* are credentials.

| Variable | Kind | Default if unset | What breaks if it is wrong/unset |
| -------- | ---- | ---------------- | -------------------------------- |
| `UPLOAD_DIR` | variable | `/var/lib/aleet/uploads` | Uploads fall back to `apps/backend/uploads` and are deleted by the next deploy's `git clean -ffdx`. |
| `RUN_CRON_JOBS` | variable | `true` | `false` → no dispatch escalation, no presence sync, no membership renewals, no stale-booking cleanup. `true` on more than one instance → duplicate charges and duplicate sweeps. |
| `ALLOW_VERCEL_ORIGINS` | variable | `false` | `true` re-opens CORS to **every** `*.vercel.app` origin on the internet. Prefer listing specific preview URLs in `ALLOWED_ORIGINS`. **Before the next deploy:** because this is now opt-in, every browser origin that talks to the API — including Vercel-hosted frontends — must appear in `FRONTEND_URL`, `DRIVER_PORTAL_URL`, `APP_BASE_URL` or `ALLOWED_ORIGINS`, or its requests will be CORS-blocked. |
| `DRIVER_PORTAL_URL` | variable | empty | Read by `src/middleware/cors.js` but never written by the deploy until now — the `*.vercel.app` wildcard was masking it. Set it to the driver portal's production origin. |
| `NODE_ENV` | set to `production` by the workflow | — | Without it: the seeder safety guard (`src/seeders/seedGuard.js`) does not recognise the environment as production and will not refuse to seed/clear the live database, and the global error handler (`src/middleware/errorHandler.js`) returns raw error messages to clients instead of `Internal Server Error` — those messages routinely contain connection strings, API responses and file paths. |
| `AWS_S3_BUCKET` | variable | empty | Empty → local disk storage under `UPLOAD_DIR`. Set → uploads go to S3 (requires `AWS_REGION` + AWS credentials). |
| `PORT`, `APP_BASE_URL`, `API_URL`, `FRONTEND_URL`, `ALLOWED_ORIGINS`, `CURRENCY`, `TWILIO_PHONE_NUMBER`, `CHECKR_BASE_URL`, `CHECKR_DASHBOARD_BASE`, `AWS_REGION`, `GMAIL_FROM_EMAIL`, `INVESTOR_INBOX_EMAIL` | variables | — | `PORT` unset → the health check polls the wrong port and the deploy fails. Browser origins missing from `FRONTEND_URL`/`ALLOWED_ORIGINS` are rejected by CORS. |
| `MONGODB_URI`, `JWT_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `TWILIO_*`, `CHECKR_API_KEY`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `GOOGLE_MAPS_API_KEY`, `GMAIL_USER`, `GMAIL_APP_PASSWORD` | secrets | — | Credentials. Missing ones crash the app at boot or silently break that integration. |

### The generated `.env` is a secrets file

The workflow writes `apps/backend/.env` on a self-hosted runner whose workspace **persists between jobs**. It is created under `umask 077` and `chmod 600`. Never loosen those permissions, never `cat` it in a workflow step (that leaks it into the build log), and never copy it somewhere world-readable. It stays in the workspace only because `src/server.js` loads dotenv from a hardcoded `../.env`.

---

## Troubleshooting

### Backend shows `localhost:undefined`

Your `apps/backend/.env` is missing `PORT`. Add it:

```
PORT=5000
```

This must match `NEXT_PUBLIC_API_URL` in the frontend and driver `.env.local` files.

### `npm run dev` fails immediately (all 3 apps)

**Cause 1 — Ports already in use:** Stop any individually-running app first.

```bash
# Windows — find and kill processes on dev ports
netstat -ano | findstr ":5000 :3001 :3002"
taskkill /PID <pid> /F
```

**Cause 2 — Missing env files:** Each app needs its env file before starting.

```bash
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env.local
cp apps/driver-portal/.env.example apps/driver-portal/.env.local
```

### Backend crashes on start (`Neither apiKey nor config.authenticator provided`)

Your `apps/backend/.env` is empty or missing required keys like `STRIPE_SECRET_KEY`. Fill them in.

### `npm install` fails or packages are missing

Make sure you are at the project root, not inside an app folder:

```bash
cd Aleet
rm -rf node_modules apps/*/node_modules
npm install
```

### App starts but API calls fail

- Confirm the backend is running and `PORT` in `apps/backend/.env` matches `NEXT_PUBLIC_API_URL` in the frontend/driver `.env.local`.
- Confirm `NEXT_PUBLIC_SOCKET_URL` points to the backend socket server.

### Turborepo not found

```bash
npm install
npx turbo --version
```

---

## Quick Reference

```bash
# Setup (once)
git clone <repo-url> && cd Aleet && npm install

# Run everything
npm run dev

# Run one app
npm run dev --workspace=apps/frontend

# New feature branch (always from main, never push to main directly)
git checkout main && git pull origin main && git checkout -b feat/my-feature

# Push your branch and open a PR into main
git push -u origin feat/my-feature
```

---

*For questions about env values, server access, or deployment credentials, contact the team lead.*
