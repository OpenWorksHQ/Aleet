# Aleet Monorepo — Developer Guide

This document explains how the monorepo is structured, how to work on each app, and how to collaborate with the original standalone repositories.

---

## Table of Contents

1. [What Was Built](#what-was-built)
2. [Repository Layout](#repository-layout)
3. [Core Branches Per App](#core-branches-per-app)
4. [First-Time Setup](#first-time-setup)
5. [Running the Apps](#running-the-apps)
6. [Feature Branch Workflow](#feature-branch-workflow)
7. [Pushing Changes to Individual Repos](#pushing-changes-to-individual-repos)
8. [Pulling Changes from Individual Repos](#pulling-changes-from-individual-repos)
9. [Environment Variables](#environment-variables)
10. [CI/CD & Deployments](#cicd--deployments)
11. [Important Rules & Conventions](#important-rules--conventions)
12. [Troubleshooting](#troubleshooting)

---

## What Was Built

Three previously separate GitHub repositories were merged into a single **Turborepo + npm workspaces** monorepo using **git subtree**. This preserves the full commit history of each original repo inside the monorepo.


| Original Repo                                                                           | Monorepo Path        | Source Branch Used |
| --------------------------------------------------------------------------------------- | -------------------- | ------------------ |
| [OpenWorksHQ/Aleet-backend-c1](https://github.com/OpenWorksHQ/Aleet-backend-c1)         | `apps/backend`       | `dev`              |
| [raveintech/aleet-frontend](https://github.com/raveintech/aleet-frontend)               | `apps/frontend`      | `main`             |
| [raveintech/driver-aleet-frontend](https://github.com/raveintech/driver-aleet-frontend) | `apps/driver-portal` | `main`             |


### What was added at the root


| File / Folder        | Purpose                                                                |
| -------------------- | ---------------------------------------------------------------------- |
| `package.json`       | npm workspaces config + root scripts (`dev`, `build`, `lint`, `start`) |
| `turbo.json`         | Turborepo pipeline — runs tasks across all apps                        |
| `package-lock.json`  | Single lockfile for the entire workspace                               |
| `.github/workflows/` | Backend EC2 deploy workflow (`deploy-backend.yml`)                       |


Each app keeps its **own** `package.json`, scripts, and `.env` files. Nothing inside `apps/`* was rewritten — only relocated under the monorepo.

---

## Repository Layout

```
aleet-monorepo/
├── apps/
│   ├── backend/           # Express + MongoDB API (Node.js)
│   ├── frontend/          # Customer-facing Next.js app  → port 3001
│   └── driver-portal/     # Driver/admin Next.js app    → port 3002
├── .github/
│   └── workflows/
│       └── deploy-backend.yml
├── package.json           # Root workspace config
├── turbo.json             # Turborepo task pipeline
├── package-lock.json
├── .gitignore
└── DEVELOPER_GUIDE.md     # This file
```

### Git remotes (already configured)

The monorepo tracks each original repo as a named remote so you can push/pull subtrees:


| Remote name | URL                                                       | Maps to              |
| ----------- | --------------------------------------------------------- | -------------------- |
| `backend`   | `https://github.com/OpenWorksHQ/Aleet-backend-c1.git`     | `apps/backend`       |
| `frontend`  | `https://github.com/raveintech/aleet-frontend.git`        | `apps/frontend`      |
| `driver`    | `https://github.com/raveintech/driver-aleet-frontend.git` | `apps/driver-portal` |


---

## Core Branches Per App

These are the **integration branches** each app uses. Always branch off these when starting new work.


| App                                      | Core Branch | Deploy Target                                                                 |
| ---------------------------------------- | ----------- | ----------------------------------------------------------------------------- |
| **Backend** (`apps/backend`)             | `dev`       | AWS EC2 via GitHub Actions + PM2 (`aleet-backend`)                            |
| **Frontend** (`apps/frontend`)           | `main`      | [Vercel](https://vercel.com) — root directory `apps/frontend`                 |
| **Driver Portal** (`apps/driver-portal`) | `main`      | [Vercel](https://vercel.com) — root directory `apps/driver-portal`            |


> **Note:** The monorepo itself currently uses `master` as its default branch. The subtree remotes above still point to each app's original core branch (`dev` for backend, `main` for both frontends).

---

## First-Time Setup

### Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 10
- **Git**

### Clone & install

```bash
git clone <monorepo-url>
cd aleet-monorepo
npm install
```

### Install dependencies — root only

> **Run `npm install` only at the monorepo root. Do NOT run `npm install` inside `apps/backend`, `apps/frontend`, or `apps/driver-portal`.**

npm workspaces hoists all dependencies from a single root install. Running install inside individual app folders will create duplicate `node_modules` and can cause version conflicts.

```bash
# Correct
cd aleet-monorepo
npm install

# Wrong — do not do this
cd apps/frontend && npm install   # ❌
cd apps/backend && npm install    # ❌
```

### Environment files

Each app needs its own env file. These are **not committed** to git. Ask a team lead for the values, or copy from the original standalone repos if you still have them locally.


| App           | Env file location               |
| ------------- | ------------------------------- |
| Backend       | `apps/backend/.env`             |
| Frontend      | `apps/frontend/.env.local`      |
| Driver Portal | `apps/driver-portal/.env.local` |


---

## Running the Apps

### Run all three apps at once (recommended for full-stack work)

From the monorepo root:

```bash
npm run dev
```

This uses **concurrently** to start all three apps via npm workspaces (reliable on Windows). Turborepo is still used for `build`, `lint`, and `start`.

| App           | URL                            | Dev command (internal)              |
| ------------- | ------------------------------ | ----------------------------------- |
| Backend       | `http://localhost:5000`        | `nodemon --no-stdin src/server.js`  |
| Frontend      | `http://localhost:3001`        | `next dev -p 3001`                  |
| Driver Portal | `http://localhost:3002`        | `next dev --webpack -p 3002`        |

> Optional: `npm run dev:turbo` runs dev via Turborepo. On Windows this can fail when spawning all apps at once — use `npm run dev` instead.

### Run a single app

Use npm workspaces from the root:

```bash
# Backend only
npm run dev --workspace=apps/backend

# Frontend only
npm run dev --workspace=apps/frontend

# Driver portal only
npm run dev --workspace=apps/driver-portal
```

### Other root commands

```bash
npm run build    # Build all apps
npm run lint     # Lint all apps
npm run start    # Start all apps in production mode
```

### Backend seed scripts

```bash
npm run seed --workspace=apps/backend
npm run seed:admin --workspace=apps/backend
npm run seed:vehicles --workspace=apps/backend
```

---

## Feature Branch Workflow

This is the recommended flow for a new developer starting a feature.

### 1. Clone and set up

```bash
git clone <monorepo-url>
cd aleet-monorepo
npm install
# Add your .env files (see Environment Variables section)
```

### 2. Make sure you are on the latest monorepo code

```bash
git checkout master
git pull origin master
```

### 3. Create a feature branch from `master`

Branch naming convention: `feat/<short-description>` or `fix/<short-description>`

```bash
# Example: working on backend dispatch logic
git checkout -b feat/dispatch-tier-rules

# Example: working on frontend booking UI
git checkout -b feat/booking-time-picker

# Example: working on driver portal
git checkout -b feat/driver-presence-socket
```

> **Rule:** Always branch from `master` in the monorepo. Do not branch from old standalone repos — those are now read/sync targets only.

### 4. Work only inside the relevant app folder

```bash
# Backend work
cd apps/backend
# ... make changes ...

# Frontend work
cd apps/frontend
# ... make changes ...
```

Keep changes scoped to the app you are working on. Avoid editing files in other `apps/*` folders unless the feature genuinely spans multiple apps.

### 5. Commit with a clear message

```bash
git add apps/backend/src/services/dispatchService.js
git commit -m "feat(dispatch): add tier-based driver assignment logic"
```

Use conventional commit prefixes: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`.

### 6. Push your feature branch to the monorepo remote

```bash
git push -u origin feat/dispatch-tier-rules
```

### 7. Open a Pull Request

Open a PR targeting `master` in the monorepo. After merge, Vercel redeploys changed frontends automatically; the backend EC2 workflow runs only when `apps/backend` (or root lockfile) changes.

### 8. After merge — sync back to the standalone repo (optional)

If the team still uses the original standalone repos for deployment, sync your merged changes using `git subtree push` (see next section).

---

## Pushing Changes to Individual Repos

When changes in the monorepo need to go back to the original standalone GitHub repos, use **git subtree push**. This extracts only the commits that touched a specific app folder and pushes them to the corresponding remote branch.

> Always run these commands from the **monorepo root**.

### Push backend changes → `Aleet-backend-c1` (`dev` branch)

```bash
git subtree push --prefix=apps/backend backend dev
```

### Push frontend changes → `aleet-frontend` (`main` branch)

```bash
git subtree push --prefix=apps/frontend frontend main
```

### Push driver portal changes → `driver-aleet-frontend` (`main` branch)

```bash
git subtree push --prefix=apps/driver-portal driver main
```

### Push a feature branch to a standalone repo

If you need to push a monorepo feature branch to the standalone repo (e.g. for a PR review in the old repo):

```bash
# Example: push monorepo feat/my-feature branch to backend's dev
git subtree push --prefix=apps/backend backend feat/my-feature
```

### Important notes on subtree push

- Subtree push can be **slow** on large histories — this is normal.
- Only commits that modified files under the `--prefix` path are included.
- If subtree push fails with "non-fast-forward", fetch the remote first and use subtree pull to reconcile (see below), then push again.
- **Do not** manually copy files between repos — always use subtree to keep histories in sync.

---

## Pulling Changes from Individual Repos

If someone pushed directly to a standalone repo (or an old PR was merged there before the monorepo migration), pull those changes into the monorepo:

### Pull backend changes from `dev`

```bash
git subtree pull --prefix=apps/backend backend dev --squash
```

### Pull frontend changes from `main`

```bash
git subtree pull --prefix=apps/frontend frontend main --squash
```

### Pull driver portal changes from `main`

```bash
git subtree pull --prefix=apps/driver-portal driver main --squash
```

> `--squash` combines remote changes into a single monorepo commit, keeping the log cleaner. Omit `--squash` if you need the full granular history from the standalone repo.

---

## Environment Variables

### Backend (`apps/backend/.env`)

Key variables (ask team lead for full list):

```
PORT=
MONGODB_URI=
JWT_SECRET=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
GOOGLE_MAPS_API_KEY=
GMAIL_USER=
GMAIL_APP_PASSWORD=
FRONTEND_URL=
APP_BASE_URL=
```

### Frontend (`apps/frontend/.env.local`)

```
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_SOCKET_URL=
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
```

### Driver Portal (`apps/driver-portal/.env.local`)

```
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_SOCKET_URL=
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
```

> Never commit `.env` or `.env.local` files. They are listed in `.gitignore`.

---

## CI/CD & Deployments

### Frontend apps — Vercel

The customer frontend and driver portal deploy automatically through **Vercel** when changes are pushed to the connected branch. Each Vercel project points at the monorepo with its own root directory:


| App           | Vercel root directory | Production domain (example) |
| ------------- | --------------------- | --------------------------- |
| Frontend      | `apps/frontend`       | `https://aleet.app`         |
| Driver Portal | `apps/driver-portal`  | `https://portal.aleet.app`  |


**Vercel environment variables** must be set in each project's dashboard (never committed to git). See [Environment Variables](#environment-variables) for the required keys.

**Recommended Vercel settings for the monorepo:**

- Node.js 20
- Build command: `npm run build` (default)
- If install fails, set install command to: `cd ../.. && npm ci`

### Backend — AWS EC2

The backend deploys to **AWS EC2** via `.github/workflows/deploy-backend.yml`. A **self-hosted GitHub Actions runner** must be installed on the EC2 instance. On push to `main` or `master`, the workflow:

1. Checks out the monorepo
2. Writes `apps/backend/.env` from GitHub Actions secrets/vars
3. Installs backend workspace dependencies (`npm ci --workspace=swift-haven-backend`)
4. Restarts the `aleet-backend` PM2 process

| Workflow             | Triggers on                                      | Deploys                     |
| -------------------- | ------------------------------------------------ | --------------------------- |
| `deploy-backend.yml` | `apps/backend/**`, root `package.json` / lockfile | PM2 process `aleet-backend` on EC2 |

**What this means for developers:**

- Frontend and driver portal changes deploy via Vercel — no GitHub Actions workflow runs for those apps.
- Changing only `apps/frontend` or `apps/driver-portal` will **not** trigger a backend deploy.
- Changing `apps/backend` will trigger an EC2 deploy via the self-hosted runner.
- Changing root `package.json` or `package-lock.json` will also trigger a backend redeploy (shared workspace deps).

---

## Important Rules & Conventions

### Do

- Run `npm install` **only at the monorepo root**
- Keep each app's changes inside its own `apps/<name>/` folder
- Use `git subtree push` / `git subtree pull` to sync with standalone repos
- Branch from `master` in the monorepo for all new work
- Add `.env` files locally — never commit them
- Use conventional commit messages (`feat:`, `fix:`, `chore:`)

### Do not

- Run `npm install` inside individual `apps/`* folders
- Push directly to standalone repos without syncing back to the monorepo
- Edit shared root config (`package.json`, `turbo.json`) unless coordinating with the team
- Commit `node_modules/`, `.next/`, `.env`, or `.turbo/` directories

### Port assignments (local dev)


| App           | Port                                            |
| ------------- | ----------------------------------------------- |
| Backend       | Set via `PORT` in `apps/backend/.env`           |
| Frontend      | `3001` (hardcoded in `package.json` dev script) |
| Driver Portal | `3002` (hardcoded in `package.json` dev script) |


Make sure all three are running when doing full-stack integration testing.

### Package names (for `--filter` / `--workspace`)


| App folder           | npm package name        |
| -------------------- | ----------------------- |
| `apps/backend`       | `swift-haven-backend`   |
| `apps/frontend`      | `aleet-frontend`        |
| `apps/driver-portal` | `driver-aleet-frontend` |


---

## Troubleshooting

### Backend shows `localhost:undefined`

Your `apps/backend/.env` is missing `PORT`. Add it:

```
PORT=5000
```

The backend defaults to `5000` if `PORT` is not set, but you should always define it explicitly. This must match `NEXT_PUBLIC_API_URL` in the frontend and driver `.env.local` files (e.g. `http://localhost:5000`).

Copy from the example file if needed:

```bash
cp apps/backend/.env.example apps/backend/.env
# then fill in your real values
```

### `npm run dev` fails immediately (all 3 apps)

**Cause 1 — Ports already in use:** If you already ran an app individually, stop it before running `npm run dev`:

```bash
# Windows — find and kill processes on dev ports
netstat -ano | findstr ":5000 :3001 :3002"
taskkill /PID <pid> /F
```

**Cause 2 — Missing env files:** Each app needs its env file before starting:

```bash
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env.local
cp apps/driver-portal/.env.example apps/driver-portal/.env.local
```

### Backend crashes on start (`Neither apiKey nor config.authenticator provided`)

Your `apps/backend/.env` is empty or missing required keys like `STRIPE_SECRET_KEY`. Copy values from a team lead or your old standalone repo.

### `npm install` fails or packages are missing

Make sure you are at the monorepo root, not inside an app folder:

```bash
cd aleet-monorepo
rm -rf node_modules apps/*/node_modules
npm install
```

### Port already in use

```bash
# Windows — find and kill process on port 3001
netstat -ano | findstr :3001
taskkill /PID <pid> /F
```

### Subtree push rejected (non-fast-forward)

```bash
# Pull remote changes first, resolve any conflicts, then push
git subtree pull --prefix=apps/backend backend dev --squash
git subtree push --prefix=apps/backend backend dev
```

### Turborepo not found

```bash
# turbo is a devDependency at root — reinstall from root
npm install
npx turbo --version
```

### App starts but API calls fail

- Confirm the backend is running and `PORT` in `apps/backend/.env` matches `NEXT_PUBLIC_API_URL` in the frontend/driver `.env.local`.
- Confirm `NEXT_PUBLIC_SOCKET_URL` points to the backend socket server.

---

## Quick Reference

```bash
# Setup (once)
git clone <monorepo-url> && cd aleet-monorepo && npm install

# Run everything
npm run dev

# Run one app
npm run dev --workspace=apps/frontend

# New feature branch
git checkout master && git pull && git checkout -b feat/my-feature

# Push backend to standalone repo
git subtree push --prefix=apps/backend backend dev

# Push frontend to standalone repo
git subtree push --prefix=apps/frontend frontend main

# Push driver portal to standalone repo
git subtree push --prefix=apps/driver-portal driver main

# Pull latest from standalone backend
git subtree pull --prefix=apps/backend backend dev --squash
```

---

*For questions about env values, server access, or deployment credentials, contact the team lead.*