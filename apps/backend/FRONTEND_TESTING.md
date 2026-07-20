# Frontend Payment Integration — Browser Testing Guide

End-to-end testing for the customer app (`:3001`), driver/admin portal (`:3002`), and backend (`:5000`) without Postman.

## Prerequisites

### 1. Environment

**Backend** (`apps/backend/.env`):

```env
APP_BASE_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3001
DRIVER_PORTAL_URL=http://localhost:3002
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...   # optional for local; session verify endpoint reconciles
```

**Customer frontend** (`apps/frontend/.env.local`):

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

**Driver portal** (`apps/driver-portal/.env.local`):

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### 2. Seed test accounts

From monorepo root:

```bash
npm run seed:payment-test-accounts --workspace=apps/backend
```

| Email | Password | Role |
|-------|----------|------|
| `test.founder30@aleet.app` | `AleetTest123!` | Founder 30 member |
| `test.standard@aleet.app` | `AleetTest123!` | Standard member |
| `test.regular@aleet.app` | `AleetTest123!` | Regular guest |

Each seeded customer has Visa `4242` saved.

### 3. Start all services

```bash
# Terminal 1 — backend
npm run dev --workspace=apps/backend

# Terminal 2 — customer
npm run dev --workspace=apps/frontend

# Terminal 3 — driver/admin
npm run dev --workspace=apps/driver-portal
```

---

## Customer app (http://localhost:3001)

### A. Saved cards — Billing

1. Log in as `test.regular@aleet.app`.
2. Open **Billing** (`/billing`).
3. Click **Add card** — Stripe Elements form loads.
4. Use test card `4242 4242 4242 4242`, any future expiry, any CVC.
5. Confirm card appears in the list; set **Make default** on a second card if added.

### B. Booking + payment

1. Log in (any test customer).
2. Start a booking with **future dates** (e.g. Dec 1, 2026 pickup/return).
3. Complete Trip → Route → **Review & Confirm** → **Confirm**.
4. On **Complete Payment** (step 4):
   - **Pay with saved card** — one-tap charge (4242).
   - Or **Pay with Stripe Checkout** — redirects to Stripe, returns to `/booking-success?session_id=...`.
5. Success screen shows paid status; dashboard lists booking as **Paid**.

**Pay later:** Dashboard → unpaid booking → **Pay now** → `/checkout?bookingId=...`.

### C. Membership — Subscription

1. Log in as `test.regular@aleet.app` (non-member).
2. Open **Subscription** (`/subscription`).
3. Plans load live rates from `GET /api/subscriptions/benefits`.
4. Subscribe via **Stripe Checkout** or **Pay with saved card**.
5. Redirect lands on `/subscription-success`; status shows active hours balance.

**Founder 30:** Only works for users with admin invite (`test.founder30@aleet.app` after seed).

**Cancel:** Active member → **Cancel membership** on subscription page.

### D. Member booking preview

1. Log in as `test.standard@aleet.app` or `test.founder30@aleet.app`.
2. Start booking — confirm step shows **booking fee**, **free hours**, member pricing in breakdown when API returns them.

---

## Driver portal (http://localhost:3002)

### E. Stripe Connect — Bank

1. Log in as a driver with Connect setup.
2. Open **Bank** (`/driver/bank`).
3. Complete onboarding — return URL should land on driver portal (not customer app).

### F. Trip payout

1. Driver assigned to a **Completed** trip where customer **Paid**.
2. **Trips → History** → **Request payout** on a completed trip.
3. Requires connected Stripe account; success shows payout amount.

---

## Admin (http://localhost:3002/admin)

Log in as admin user.

### G. Pricing & tiers

1. **Tiers & Policy** → open **Tier Settings** modal.
2. Edit booking fee, membership rates, late-night window, tier payout rules → **Save**.
3. Values persist via `PATCH /api/admin/tiers/settings`.

### H. Finance & revenue

1. **Finance & Revenue** (`/admin/payouts`) — no mock payout queue.
2. Review completed-trip revenue summary and tier breakdown.
3. **Booking payout lookup** — paste a booking `_id` for line-item math.

### I. Memberships

1. **Memberships** (`/admin/memberships`).
2. Filter standard / Founder 30; view hours used and overage.
3. **Invite F30** on standard member; **Charge overage** when overage hours > 0.

---

## Stripe test cards

| Card | Result |
|------|--------|
| `4242 4242 4242 4242` | Success |
| `4000 0000 0000 3220` | 3DS — use Checkout flow |

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Checkout returns to wrong host (e.g. `localhost:5173` on live) | Production: ensure `FRONTEND_URL=https://www.aleet.app` (or set `APP_BASE_URL` explicitly), redeploy/restart backend. Local: `APP_BASE_URL=http://localhost:3001` |
| `Invalid vehicle type` on preview | Pick vehicle from dropdown (uses real `vehicle_type_id`) |
| Preview/start date errors | Use future ISO dates |
| Payout fails | Customer must be Paid; driver needs Stripe Connect; trip completed |
| Founder 30 checkout 403 | Admin must invite user first |

---

## API reference

See `apps/backend/FRONTEND.md` and `apps/backend/POSTMAN_TESTING.md` for full request/response contracts.
