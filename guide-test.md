# Aleet — Full Manual Testing Guide

Step-by-step guide for testing the platform before client handoff or production deployment. Written for developers new to the product — follow each section in order the first time, then use the checklists for regression testing.

---

## Table of Contents

1. [Before You Start](#before-you-start)
2. [Test Environments](#test-environments)
3. [Test Accounts & Data](#test-accounts--data)
4. [How to Report a Bug](#how-to-report-a-bug)
5. [Customer Frontend Tests](#customer-frontend-tests)
6. [Driver Portal Tests](#driver-portal-tests)
7. [Admin Portal Tests](#admin-portal-tests)
8. [SAC/AQD Same-Day Availability](#sacaqd-same-day-availability)
9. [Dispatch & Trip Visibility](#dispatch--trip-visibility)
10. [Backend API Smoke Tests](#backend-api-smoke-tests)
11. [Pre-Delivery Checklist](#pre-delivery-checklist)
12. [Known Limitations (Not Bugs)](#known-limitations-not-bugs)

---

## Before You Start

### What you need running

| Service | Local | Production-like |
|---------|-------|-----------------|
| Backend API | `npm run dev --workspace=swift-haven-backend` | EC2 + `https://backend.aleet.app` |
| Customer frontend | http://localhost:3001 | Vercel / https://aleet.app |
| Driver portal | http://localhost:3002 | Vercel / https://portal.aleet.app |
| MongoDB | Atlas (via `.env`) | Same Atlas cluster |
| ngrok (optional) | Expose local backend to Vercel | Not needed when EC2 is live |

**Run all three locally (easiest):**

```bash
cd aleet
npm run dev
```

### URLs quick reference

| App | Local | Production (examples) |
|-----|-------|-------------------------|
| Customer | http://localhost:3001 | https://aleet-frontend-ebon.vercel.app |
| Driver/Admin | http://localhost:3002 | https://portal.aleet.app |
| Backend | http://localhost:5000 | https://backend.aleet.app |
| Health check | http://localhost:5000/health | `GET /health` on backend URL |

### Browser tips

- Use **Chrome Incognito** for each different user (customer, driver 1, driver 2, admin).
- Keep **one driver per browser window** when testing dispatch.
- Open **DevTools → Network** to confirm API calls succeed (status 200).

---

## Test Environments

### A. Full local (recommended for development)

- All apps on localhost
- `NEXT_PUBLIC_API_URL=http://localhost:5000` in frontend `.env.local` files
- No ngrok needed

### B. Vercel frontend + local backend (ngrok)

1. Start backend locally
2. Run `ngrok http 5000`
3. Set Vercel env `NEXT_PUBLIC_API_URL` = ngrok HTTPS URL
4. Redeploy Vercel after env or code changes
5. Keep ngrok + backend running during tests

**When ngrok URL changes:** update Vercel env → redeploy. Backend CORS does not need updating for each new ngrok URL.

### C. Full production

- Frontends on Vercel
- Backend on EC2
- All production env vars and secrets configured

---

## Test Accounts & Data

### Seed scripts (local / staging DB only)

```bash
# Admin + sample users
npm run seed --workspace=swift-haven-backend

# SAC/AQD test drivers (lowers MCT temporarily — revert after!)
node apps/backend/src/seeders/sacAqdTestSeeder.js seed <REGION_ID>

# Reset test driver passwords
npm run seed:reset-driver-passwords --workspace=swift-haven-backend

# Revert SAC test tier settings
npm run seed:sac-aqd:revert --workspace=swift-haven-backend
```

### Default seed credentials (if seed was run)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@swifthaven.com | admin123456 |
| Customer | customer@swifthaven.com | customer123456 |
| Driver | driver@swifthaven.com | driver123456 |

### SAC test drivers (after password reset script)

Password: `SacTest123!`

- sanistraymail@gmail.com
- sanistraymail1@gmail.com
- dimondkhan02@gmail.com
- prokhan01@gmail.com

### Driver must have for trip visibility

For a **Pro** or **Diamond** driver to see an available trip:

| Requirement | Why |
|-------------|-----|
| `driver.status` = `approved` | Unapproved drivers blocked |
| Tier = **Pro** or **Diamond** (same-day) | S-Level not offered same-day trips |
| **Vehicle type** matches booking | Pro/Diamond must have booking's vehicle in `driver.vehicleTypes` |
| **Region** matches | `serveAllRegions: true` OR region in `driver.regions` |
| Trip in **Available** tab | Status `Pending`, not yet accepted |

Check in **MongoDB Compass** → `users` collection if a driver does not see trips.

---

## How to Report a Bug

When something fails, capture:

1. **What you did** (steps 1, 2, 3…)
2. **What you expected**
3. **What actually happened**
4. **URL** (local or Vercel)
5. **User role** (customer / driver / admin)
6. **Screenshot** of UI + **Network tab** (failed request URL + response)
7. **Backend terminal** error if any

---

## Customer Frontend Tests

**App:** http://localhost:3001 or Vercel URL  
**Login:** `/login`

### CF-1: Health & homepage

| Step | Action | Expected |
|------|--------|----------|
| 1 | Open homepage | Page loads, no console errors |
| 2 | Open `/booking` | Booking wizard or login redirect |

### CF-2: Customer registration / login

| Step | Action | Expected |
|------|--------|----------|
| 1 | Go to `/login` | Login form loads |
| 2 | Enter email/phone + password | Login succeeds |
| 3 | Redirect | Lands on dashboard or booking |
| 4 | Wrong password | Clear error message |

**Fail if:** `secretOrPrivateKey` error → `JWT_SECRET` missing in backend `.env`.

### CF-3: Booking wizard — advance trip (not same-day)

| Step | Action | Expected |
|------|--------|----------|
| 1 | Log in as customer | Success |
| 2 | Go to `/booking` | Wizard step 1 |
| 3 | Select **region** | Regions load from API |
| 4 | Pick date **7+ days ahead** | No same-day warning |
| 5 | Pick pickup time | Time picker works |
| 6 | Complete route (pickup, stops, dropoff) | Validation passes |
| 7 | Select vehicle type & quantity | Price updates |
| 8 | Confirm & pay (test Stripe if configured) | Booking created, confirmation shown |

### CF-4: Booking wizard — same-day trip

| Step | Action | Expected |
|------|--------|----------|
| 1 | Ensure **4+ Pro/Diamond drivers online** in region (see SAC section) | Same-day API shows `available: true` |
| 2 | Pick **today** or within 24 hours | Same-day notice appears |
| 3 | Notice green | "Same-day booking is available" |
| 4 | Complete booking | Succeeds |
| 5 | Log out enough drivers so AQD drops | Within ~60s notice turns red / blocked |
| 6 | Try Continue | Blocked when same-day unavailable |

**API to verify:**

```
GET /api/regions/<REGION_ID>/same-day-status
```

### CF-5: Customer dashboard

| Step | Action | Expected |
|------|--------|----------|
| 1 | Go to `/dashboard` | Upcoming/past trips visible |
| 2 | `/trip-history` | Past bookings listed |
| 3 | `/billing` | Billing info loads (if subscribed) |
| 4 | `/subscription` | Subscription flow (if applicable) |

### CF-6: Forgot password

| Step | Action | Expected |
|------|--------|----------|
| 1 | `/login/forgot-password` | Form loads |
| 2 | Submit email/phone | Success message or email sent |

---

## Driver Portal Tests

**App:** http://localhost:3002 or Vercel driver URL  
**Login:** `/login` (email or phone + password)

### DP-1: Driver login & presence

| Step | Action | Expected |
|------|--------|----------|
| 1 | Log in as **approved Pro/Diamond** driver | Redirect to `/driver` |
| 2 | Backend log | `[socket] driver connected` |
| 3 | MongoDB | `driver.isOnline: true`, fresh `lastSeenAt` |
| 4 | Admin → Drivers | Green online dot for this driver |
| 5 | Log out | `isOnline: false` |

### DP-2: Driver trips — Available tab

| Step | Action | Expected |
|------|--------|----------|
| 1 | Create a **pending** booking as customer (same-day or advance) | Booking in DB `status: Pending` |
| 2 | Log in driver with **matching vehicle type + region** | — |
| 3 | Go to `/driver/trips` → **Available** tab | Trip appears in list |
| 4 | Click **Accept** (if shown) | Trip moves to **My Trips** |
| 5 | Second driver accepts same trip | **409** / "already taken" |

**If trip does NOT appear:** check vehicle types and region (see [Dispatch & Trip Visibility](#dispatch--trip-visibility)).

### DP-3: Driver trips — My Trips & History

| Step | Action | Expected |
|------|--------|----------|
| 1 | Accept a trip | Shows under **My Trips** |
| 2 | Admin confirms trip | Status updates |
| 3 | Complete trip (admin flow) | Appears in **History** |

### DP-4: Driver profile & onboarding

| Step | Action | Expected |
|------|--------|----------|
| 1 | `/driver/profile` | Profile loads |
| 2 | `/driver/onboarding` | Onboarding forms (new drivers) |
| 3 | `/pending` | Shown for non-approved drivers |

### DP-5: Driver earnings & bank

| Step | Action | Expected |
|------|--------|----------|
| 1 | `/driver/earnings` | Earnings summary |
| 2 | `/driver/bank` or `/driver/bank-account` | Stripe Connect flow (if configured) |

---

## Admin Portal Tests

**Login:** http://localhost:3002/login as **admin** → redirects to `/admin`

### AP-1: Dashboard

| Step | Action | Expected |
|------|--------|----------|
| 1 | `/admin` | Stats, charts load |

### AP-2: Drivers

| Step | Action | Expected |
|------|--------|----------|
| 1 | `/admin/drivers` | Driver list loads |
| 2 | Driver goes online (another browser) | Online badge updates **without refresh** |
| 3 | Open driver detail | Approve / reject / tier change |
| 4 | Change status to `approved` | Driver can log in and see trips |

### AP-3: Regions & same-day

| Step | Action | Expected |
|------|--------|----------|
| 1 | `/admin/regions` | Regions list with Same-Day column |
| 2 | Note AQD · RB · CL · need MCT | Numbers match API |
| 3 | Driver logs in/out | Same-day column updates within ~2s |
| 4 | **Force OFF** toggle | Same-day blocked regardless of drivers |
| 5 | **Unblock** | Formula applies again |

### AP-4: Trips / bookings

| Step | Action | Expected |
|------|--------|----------|
| 1 | `/admin/trips` | All bookings listed |
| 2 | Open trip detail | Assign driver manually |
| 3 | Same-day vs advance label | Correct badge |

### AP-5: Other admin sections

| Page | Path | What to check |
|------|------|----------------|
| Vehicle types | `/admin/vehicle-types` | CRUD works |
| Tiers | `/admin/tiers` | Tier settings load |
| Payouts | `/admin/payouts` | Payout list |
| Regions | `/admin/regions` | CRUD + same-day |
| Administrators | `/admin/administrators` | Admin users |
| Settings | `/admin/settings` | Settings save |

---

## SAC/AQD Same-Day Availability

See also: [SAC-AQD-TESTING.md](./SAC-AQD-TESTING.md)

### Formula

```
Same-day ON when: AQD − RB − CL ≥ MCT
```

Production defaults: **MCT = 2**, need **~4 online Pro/Diamond drivers** (with CL = 0).

### SAC-1: API check

```
GET /api/regions/<REGION_ID>/same-day-status
```

| AQD | Expected `available` (MCT=2, CL=0) |
|-----|--------------------------------------|
| 0–3 | `false` |
| 4+ | `true` |

### SAC-2: Driver online affects AQD

| Step | Action | Expected |
|------|--------|----------|
| 1 | 0 drivers online | `aqd: 0`, unavailable |
| 2 | Log in 4 Pro drivers (4 browsers) | `aqd: 4+`, available |
| 3 | Log out 1 driver | `aqd` drops, may become unavailable |
| 4 | Customer wizard | Notice updates within ~60 seconds |

### SAC-3: Admin regions live update

| Step | Action | Expected |
|------|--------|----------|
| 1 | Admin on `/admin/regions` | See current ON/OFF |
| 2 | Toggle driver online/offline | Column updates without page refresh |

---

## Dispatch & Trip Visibility

### Who gets SMS when booking is created?

Only drivers who pass **full eligibility** in `autoDispatchBooking`:

- Approved
- Tier in offer stage (same-day: **Pro + Diamond**)
- Correct **vehicle type**
- Serves **region**

### Who sees trip on `/driver/trips` → Available?

Same filters as above. **Pro/Diamond with empty `vehicleTypes` see NO trips.**

### Bell icon "New trip available" — IMPORTANT

The notification bell in the driver header uses **mock/placeholder data** (`MOCK_NOTIFICATIONS` in code). **Every driver sees the same fake notifications** — this is **not** proof they received the real trip offer.

**Real trip signals:**

- Trip appears on **`/driver/trips` → Available** tab
- SMS to driver's phone (if Twilio configured and driver was eligible)

### Dispatch test scenario

| Step | Action | Expected |
|------|--------|----------|
| 1 | Ensure 4 drivers: approved Pro, **same vehicle type as booking**, same region | — |
| 2 | Customer creates same-day booking | Booking `Pending`, offer tiers `['Diamond','Pro']` |
| 3 | Each eligible driver opens `/driver/trips` | All see trip in **Available** |
| 4 | Driver 1 accepts | Trip disappears for others |
| 5 | Ineligible driver (wrong vehicle) | Does **not** see trip (expected) |

### Fix drivers not seeing trips (Compass)

For each driver document in `users`:

```json
{
  "driver": {
    "status": "approved",
    "tier": "Pro",
    "serveAllRegions": true,
    "vehicleTypes": ["<vehicleTypeObjectId from booking>"]
  }
}
```

Get booking's `vehicleType` from `bookings` collection and copy that ID into all test drivers.

---

## Backend API Smoke Tests

Run in browser or Postman (no auth unless noted).

| Endpoint | Auth | Expected |
|----------|------|----------|
| `GET /health` | No | `{ "status": "Aleet Backend is running" }` |
| `GET /api/regions` | No | List of active regions |
| `GET /api/regions/:id/same-day-status` | No | AQD breakdown |
| `POST /api/auth/login` | No | Token + user (body: identifier, password) |
| `GET /api/bookings/open-trips` | Driver JWT | Open trips for that driver |
| `GET /api/dashboard/driver/trips?tab=available` | Driver JWT | Available trips list |

---

## Pre-Delivery Checklist

### Code & fixes

- [ ] SAC/AQD fixes merged (polling, heartbeat, admin regions refresh)
- [ ] CORS configured for Vercel origins
- [ ] Frontend + driver portal build passes (`npm run build --workspace=...`)
- [ ] No test-only seed data in production DB (`seed:sac-aqd:revert` run)

### Vercel (frontends)

- [ ] Customer frontend project → root `apps/frontend`
- [ ] Driver portal project → root `apps/driver-portal`
- [ ] Env vars set (API URL, SITE_URL, Maps key, SOCKET_URL for driver)
- [ ] Custom domains connected
- [ ] Production deploy successful

### EC2 (backend)

- [ ] Instance running
- [ ] Self-hosted GitHub runner online
- [ ] GitHub Secrets/Variables configured
- [ ] `GET /health` returns OK on public URL
- [ ] PM2 `aleet-backend` running
- [ ] Stripe webhooks point to production backend URL

### End-to-end flows

- [ ] Customer login + booking (advance)
- [ ] Customer same-day booking (with enough drivers)
- [ ] Driver sees + accepts trip
- [ ] Admin sees booking and drivers online
- [ ] Same-day turns OFF when drivers go offline

---

## Known Limitations (Not Bugs)

| Item | Explanation |
|------|-------------|
| Driver bell notifications | **Mock UI** — same notifications for all drivers until replaced with real API |
| ngrok URL changes | Must update Vercel env + redeploy each restart |
| `localhost` on Vercel | Does not work — use ngrok or real backend URL |
| S-Level drivers | Do not count toward same-day AQD; not offered same-day trips |
| Pro/Diamond no vehicle types | Cannot see or accept trips until vehicle types assigned |
| Backend on EC2 off | Vercel frontends load but API/login fails |

---

## Suggested Test Order (First Full Run)

1. Backend health + regions API  
2. Admin login → regions + drivers pages  
3. Seed/prepare 4 eligible drivers (vehicle types!)  
4. SAC/AQD API + admin regions live update  
5. Customer same-day booking flow  
6. Driver trips Available tab (all 4 drivers)  
7. One driver accepts trip  
8. Customer dashboard shows booking  
9. Admin trips page  
10. Vercel + ngrok or production URLs end-to-end  

---

*For monorepo setup and deployment details, see [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md). For SAC/AQD deep dive, see [SAC-AQD-TESTING.md](./SAC-AQD-TESTING.md).*
