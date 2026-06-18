# SAC/AQD Same-Day Availability — Testing Guide

This document explains how same-day booking availability works in Aleet, what was fixed, how to test locally, what to revert after testing, and a summary you can share with stakeholders.

---

## Table of Contents

1. [Overview](#overview)
2. [When Same-Day Booking Is ON](#when-same-day-booking-is-on)
3. [The Formula](#the-formula)
4. [Who Counts Toward AQD](#who-counts-toward-aqd)
5. [What Turns Same-Day OFF](#what-turns-same-day-off)
6. [Architecture & Key Files](#architecture--key-files)
7. [Bug Fixes Applied](#bug-fixes-applied)
8. [Local Testing Setup](#local-testing-setup)
9. [Manual Test Scenarios](#manual-test-scenarios)
10. [Seed Scripts & Commands](#seed-scripts--commands)
11. [After Testing — What to Revert](#after-testing--what-to-revert)
12. [Test Again Later](#test-again-later)
13. [Client Summary (Copy/Paste)](#client-summary-copypaste)

---

## Overview

**SAC/AQD** = Same-day availability controlled by **Active Qualified Drivers (AQD)**.

Same-day booking for a region is **ON** only when the backend formula passes and no admin/region block is active. The live status is exposed at:

```
GET /api/regions/:regionId/same-day-status
```

**Local URLs**

| App | URL |
|-----|-----|
| Customer frontend | http://localhost:3001 |
| Driver portal | http://localhost:3002 |
| Backend API | http://localhost:5000 |

---

## When Same-Day Booking Is ON

Same-day is **ON** when **all** of the following are true:

### 1. Region is eligible

| Check | Required |
|-------|----------|
| Region is active | `isActive: true` |
| No admin force-off | `sameDayManualBlock: false` |

If either fails → same-day is **OFF** regardless of driver count.

### 2. Formula passes

```
AQD − RB − CL ≥ MCT
```

See [The Formula](#the-formula) below.

### 3. Enough qualified drivers are online

With **production defaults** (`MCT = 2`, `RB` minimum = 2, `CL = 0`):

| Online qualified drivers (AQD) | RB | Calculation | Same-day |
|------------------------------|-----|-------------|----------|
| 0–3 | 2 | e.g. 3 − 2 − 0 = 1 | **OFF** |
| **4+** | 2 | e.g. 4 − 2 − 0 = 2 | **ON** |

> **Short rule:** With default production settings and no active trips, you need **at least 4 online approved Pro or Diamond drivers** in the region.

**Note:** **S-Level** drivers do **not** count toward AQD. Both **Pro** and **Diamond** count.

### 4. Pickup is same-day

- Pickup within **24 hours** of now counts as same-day.
- The customer booking wizard and backend both enforce this window.

---

## The Formula

```
AQD − RB − CL ≥ MCT
```

| Term | Name | Meaning | Default (production) |
|------|------|---------|----------------------|
| **AQD** | Active Qualified Drivers | Approved Pro/Diamond drivers, online, fresh presence, serving the region | Live count from DB |
| **RB** | Reserved Buffer | Buffer held back for reliability | `max(2, ceil(25% × AQD))` |
| **CL** | Committed Load | Drivers on overlapping active trips | Count of assigned drivers on **Confirmed** / **In Progress** bookings whose trip window overlaps the evaluated window |
| **MCT** | Minimum Coverage Threshold | Minimum free drivers required after buffer and commitments | **2** |

**RB examples**

| AQD | RB calculation | RB |
|-----|----------------|-----|
| 4 | max(2, ceil(4 × 0.25)) = max(2, 1) | 2 |
| 8 | max(2, ceil(8 × 0.25)) = max(2, 2) | 2 |
| 12 | max(2, ceil(12 × 0.25)) = max(2, 3) | 3 |

**CL note:** A driver on a trip at 8am does **not** block a 6pm same-day slot unless the trip windows overlap.

Configurable in MongoDB collection `tiersettings`:

- `sameDayMCT`
- `sameDayMinRB`
- `sameDayRBRatio`

---

## Who Counts Toward AQD

A driver is included in AQD only when **all** of these are true:

| Requirement | Value |
|-------------|-------|
| Role | `driver` |
| Status | `approved` |
| Tier | **Pro** or **Diamond** (not S-Level) |
| Online | `driver.isOnline: true` |
| Fresh presence | `driver.lastSeenAt` within the **last 5 minutes** |
| Region | `serveAllRegions: true` **OR** region ID in `driver.regions` |

### How online/offline works

| Event | Backend behavior |
|-------|------------------|
| Driver opens driver portal | Socket.IO connects → `isOnline: true`, `lastSeenAt` updated |
| Driver logs out / closes app | Socket disconnects → `isOnline: false` |
| Driver idle but connected | Heartbeat + keep-alive keep `lastSeenAt` fresh |
| Crashed socket / no disconnect event | Presence sweeper marks offline after **5+ minutes** stale |

**Driver portal:** http://localhost:3002/login — there is no manual online/offline toggle; the socket connection **is** the presence signal.

---

## What Turns Same-Day OFF

- Formula fails: `AQD − RB − CL < MCT`
- Drivers log out → AQD drops
- More trips assigned → CL rises
- Admin sets **Force OFF** on region (`sameDayManualBlock: true`)
- Region marked inactive (`isActive: false`)
- Stale presence: driver appears online in UI but `lastSeenAt` older than 5 minutes

---

## Architecture & Key Files

### Backend

| File | Purpose |
|------|---------|
| `apps/backend/src/services/availabilityService.js` | AQD formula engine (`computeSameDayStatus`) |
| `apps/backend/src/controllers/regionController.js` | `GET /api/regions/:id/same-day-status` |
| `apps/backend/src/sockets/driverPresence.js` | Driver online/offline on socket connect/disconnect |
| `apps/backend/src/cron/presenceSweeper.js` | Safety net for stale/crashed sockets |
| `apps/backend/src/models/User.js` | `driver.isOnline`, `driver.lastSeenAt`, tier, status |
| `apps/backend/src/models/Region.js` | `isActive`, `sameDayManualBlock` |
| `apps/backend/src/models/TierSettings.js` | `sameDayMCT`, `sameDayMinRB`, `sameDayRBRatio` |

### Customer frontend

| File | Purpose |
|------|---------|
| `apps/frontend/lib/use-same-day-availability.ts` | Fetches + polls same-day status in booking wizard |
| `apps/frontend/lib/api/regions.ts` | API client for same-day endpoint |
| `apps/frontend/app/components/booking/same-day-notice.tsx` | UI notice + booking gate |

### Driver portal

| File | Purpose |
|------|---------|
| `apps/driver-portal/lib/socket.ts` | Driver socket client + keep-alive heartbeat |
| `apps/driver-portal/app/components/driver/driver-presence-socket.tsx` | Mounts socket in driver layout |
| `apps/driver-portal/app/components/admin/regions/regions-list.tsx` | Admin regions same-day display (live refresh) |
| `apps/driver-portal/lib/admin-socket.ts` | Admin `driver:presence` events |

### Test seeders

| File | Purpose |
|------|---------|
| `apps/backend/src/seeders/sacAqdTestSeeder.js` | Promote drivers + lower MCT for local testing |
| `apps/backend/src/seeders/resetTestDriverPasswords.js` | Reset known passwords for test driver logins |

---

## Bug Fixes Applied

| # | Issue | Fix | File(s) |
|---|-------|-----|---------|
| 1 | Admin regions page showed stale AQD after load | Re-fetch regions on `driver:presence` socket event (2s debounce) | `regions-list.tsx`, `admin-api.ts` |
| 2 | Customer wizard checked same-day only once | Poll same-day API every **60 seconds** while same-day pickup selected | `use-same-day-availability.ts` |
| 3 | Idle connected drivers dropped from AQD after ~5 min | Bump `lastSeenAt` on Engine.IO heartbeat | `driverPresence.js` |
| 4 | `lastSeenAt` not updated without UI interaction | Driver app emits `driver:heartbeat` every **2 minutes** | `socket.ts` |

**These code fixes should be deployed to production.** They are not test-only changes.

---

## Local Testing Setup

### Prerequisites

- All three apps running: `npm run dev` from monorepo root
- MongoDB connected (`apps/backend/.env` → `MONGODB_URI`)
- `JWT_SECRET` set in `apps/backend/.env` (required for login)
- Frontend env: `NEXT_PUBLIC_API_URL=http://localhost:5000`
- Driver portal env: `NEXT_PUBLIC_SOCKET_URL=http://localhost:5000`

### Verify backend

```
http://localhost:5000/health
```

Expected: `{ "status": "Aleet Backend is running" }`

### Prepare test data

```bash
# From monorepo root — seed AQD for a specific region
node apps/backend/src/seeders/sacAqdTestSeeder.js seed <REGION_ID>

# Reset passwords for default test driver emails
npm run seed:reset-driver-passwords --workspace=swift-haven-backend
```

**Example region used in testing:**

- Washington DC — `69fa2e4ef573e68e2ca68ff0`

### Test driver logins

**URL:** http://localhost:3002/login  
**Password (after reset script):** `SacTest123!`

| Email | Notes |
|-------|-------|
| `sanistraymail@gmail.com` | Promoted for testing |
| `sanistraymail1@gmail.com` | Promoted for testing |
| `dimondkhan02@gmail.com` | Promoted for testing |
| `prokhan01@gmail.com` | Promoted for testing |

> These are real accounts in the database. Passwords were reset for local testing only.

---

## Manual Test Scenarios

### API check (no UI)

```
GET http://localhost:5000/api/regions/<REGION_ID>/same-day-status
```

**Expected when ON (production rules, CL=0, 4+ drivers online):**

```json
{
  "success": true,
  "data": {
    "aqd": 4,
    "rb": 2,
    "cl": 0,
    "mct": 2,
    "formulaPass": true,
    "available": true,
    "reason": null
  }
}
```

**Expected when OFF:**

```json
{
  "formulaPass": false,
  "available": false,
  "reason": "insufficient_coverage"
}
```

### Test A — Driver goes online

1. Log in at http://localhost:3002/login
2. Land on `/driver` (socket connects automatically)
3. Hit same-day API → `aqd` should increase
4. Backend log: `[socket] driver connected: <userId>`

### Test B — Driver goes offline

1. Log out or close driver portal tab
2. Hit same-day API → `aqd` should decrease
3. Backend log: `[presence] socket disconnected for <userId>`

### Test C — Multiple drivers (4+ online)

1. Open **4 incognito/private browser windows**
2. Log in with a different test driver in each
3. Hit same-day API → `aqd >= 4`, `available: true` (production MCT)

### Test D — Customer booking wizard

1. Open http://localhost:3001/booking
2. Log in as customer
3. Select **today** + test region
4. Same-day notice should show available or unavailable
5. Wait up to **60 seconds** after a driver logs out → notice should update

### Test E — Admin regions page

1. Log in as admin at http://localhost:3002/login
2. Go to **Admin → Regions**
3. Watch Same-Day column (`ON` / `OFF` + AQD · RB · CL · need MCT)
4. Log a driver in/out in another tab → regions list should refresh within ~2 seconds

### Test F — Idle driver stays online

1. Log in one driver, leave app open without clicking
2. Wait 6+ minutes
3. In MongoDB: `isOnline` should stay `true`, `lastSeenAt` should keep updating
4. `aqd` should not drop while socket is alive

---

## Seed Scripts & Commands

All commands run from **monorepo root** unless noted.

| Command | Purpose |
|---------|---------|
| `npm run seed:sac-aqd --workspace=swift-haven-backend` | Seed first active region (promote drivers + lower MCT) |
| `node apps/backend/src/seeders/sacAqdTestSeeder.js seed <REGION_ID>` | Seed specific region |
| `npm run seed:sac-aqd:revert --workspace=swift-haven-backend` | Revert tier settings + offline sac-pro-* test drivers |
| `npm run seed:reset-driver-passwords --workspace=swift-haven-backend` | Reset passwords for 4 default test emails to `SacTest123!` |

### What `seed:sac-aqd` does

1. Backs up current `TierSettings` to `apps/backend/.sac-aqd-tier-backup.json`
2. Sets `sameDayMCT` to **0** (easier local pass — **revert before production**)
3. Promotes up to 4 existing drivers to: `approved`, `Pro`, `isOnline: true`, fresh `lastSeenAt`
4. Creates `sac-pro-*@test.aleet.local` drivers if not enough existing drivers
5. Prints current AQD count and API URL to re-test

### Optional environment variables

| Variable | Purpose |
|----------|---------|
| `SAC_REGION_ID` | Target region (alternative to CLI arg) |
| `SAC_MIN_DRIVERS` | Minimum drivers to promote (default: 4) |
| `SAC_TEST_PASSWORD` | Password for reset script (default: `SacTest123!`) |

---

## After Testing — What to Revert

### Must revert (test-only database changes)

```bash
npm run seed:sac-aqd:revert --workspace=swift-haven-backend
```

This:

- Restores `sameDayMCT`, `sameDayMinRB`, `sameDayRBRatio` from `apps/backend/.sac-aqd-tier-backup.json`
- Marks `sac-pro-*@test.aleet.local` drivers offline

### Should review manually

| Item | Action |
|------|--------|
| **4 Gmail test drivers** | Set `driver.isOnline: false` in Compass if they should not appear online |
| **Passwords** | Drivers should reset passwords — test password was `SacTest123!` |
| **Other promoted drivers** | Filter `users` where `driver.isOnline: true` and clear any test leftovers |
| **Tier settings** | Confirm `sameDayMCT` is **2** in production (verify after revert) |

### Do NOT revert (keep and deploy)

| Item | Reason |
|------|--------|
| SAC/AQD code fixes (polling, heartbeat, admin refresh) | These are the actual bug fixes |
| Local `JWT_SECRET` | Only affects your machine; production has its own |

### Verify production tier settings in MongoDB Compass

Collection: `tiersettings`

```json
{
  "sameDayMCT": 2,
  "sameDayMinRB": 2,
  "sameDayRBRatio": 0.25
}
```

---

## Test Again Later

When you need to run another test cycle:

```bash
# 1. Seed drivers + lower MCT for easier testing
node apps/backend/src/seeders/sacAqdTestSeeder.js seed <REGION_ID>

# 2. Reset test driver passwords
npm run seed:reset-driver-passwords --workspace=swift-haven-backend

# 3. Test (driver portal, API, customer booking)

# 4. Revert when done
npm run seed:sac-aqd:revert --workspace=swift-haven-backend
```

---

## Client Summary (Copy/Paste)

> Hi,
>
> I've completed testing of the same-day (SAC/AQD) availability logic. Here is a summary.
>
> **When same-day booking is ON**
>
> Same-day is enabled for a region only when:
> 1. The region is active and not manually blocked by admin
> 2. The formula **AQD − RB − CL ≥ MCT** passes
>
> - **AQD** = approved **Pro or Diamond** drivers who are **online** (driver app connected, last activity within 5 minutes) and serve that region
> - **RB** = reserved buffer (25% of AQD, minimum 2)
> - **CL** = drivers already committed to overlapping active trips
> - **MCT** = minimum coverage threshold (**2** in production)
>
> With default production settings and no active trips, **at least 4 online qualified (Pro/Diamond) drivers** are required in the region. **S-Level drivers do not count** toward AQD.
>
> **What was fixed**
>
> - Admin regions page now updates same-day status in real time when drivers go online/offline
> - Customer booking wizard re-checks availability every 60 seconds
> - Idle connected drivers no longer incorrectly drop off AQD
> - Driver app sends keep-alive signals so presence stays accurate
>
> **Testing note**
>
> For local testing we temporarily lowered MCT and used test driver accounts. That is reverted before any production demo. Production rules (MCT = 2, minimum 4 drivers) are unchanged.
>
> Ready for live testing when EC2 is turned back on.
>
> Thanks,
> Azeem

---

## Quick Reference

| Question | Answer |
|----------|--------|
| Minimum drivers for same-day ON (production)? | **4** online approved Pro/Diamond (with CL=0, MCT=2) |
| Do S-Level drivers count? | **No** |
| Do Diamond drivers count? | **Yes** |
| How is "online" determined? | Socket connection + `lastSeenAt` within 5 min |
| Same-day API endpoint | `GET /api/regions/:regionId/same-day-status` |
| Revert test changes | `npm run seed:sac-aqd:revert --workspace=swift-haven-backend` |
| Reset test passwords | `npm run seed:reset-driver-passwords --workspace=swift-haven-backend` |

---

*For environment setup and monorepo commands, see [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md).*
