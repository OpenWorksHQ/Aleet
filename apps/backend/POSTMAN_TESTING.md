# Aleet Backend — Live Demo Script & Postman Testing Guide

> **Branch:** `feat/payment-process`
> **For:** William — Client Walkthrough Call
> **Prepared by:** Azeem Aleem (Backend / Payment Systems)

A step-by-step Postman walkthrough to prove the pricing, membership, and payout logic
works exactly as specified — before the frontend is connected.

**How to use this document:** This is the script for the live call. Each flow is one real
API request. Send the request live in Postman, look at the response together, and read the
**"What to say"** line — plain English explaining which pricing rule from the requirements
just fired and why the number came out the way it did. Nothing here is simulated; every
response is a real backend calculation running against **Stripe Test Mode**.

> **⚠️ Dates matter.** All example dates use **`2026-12-01`** (a future date) with a `Z`
> (UTC) suffix. The backend rejects past dates with `400 Start date must be in future`, so
> always keep the year in the future when you run the demo.

---

## 0. Before the Call — 5-Minute Setup

This only needs to be done once, before William joins.

### 0.1 Start the backend server

```bash
cd apps/backend
npm run dev
```

You should see: `🚀 Server running on http://localhost:5000`

### 0.2 Postman environment

Create an environment called **"Aleet Demo"** with these variables (all start empty except `base_url`):

| Variable            | Value                   |
| ------------------- | ----------------------- |
| `base_url`          | `http://localhost:5000` |
| `customer_token`    | *(filled after login)*  |
| `member_token`      | *(filled after member login)* |
| `admin_token`       | *(filled after login)*  |
| `booking_id`        | *(filled after creating a booking)* |
| `vehicle_type_id`   | *(filled from `GET /api/vehicle-types`)* |
| `region_id`         | *(filled from `GET /api/regions`)* |
| `payment_method_id` | *(filled from saved-cards list)* |

### 0.3 The three ready-made test accounts

These are already seeded in **Stripe Test Mode** — no real card, no real money, but the logic
runs exactly as it would in production. Each already has a **saved Stripe test card**
(Visa `4242`, via `pm_card_visa`) attached.

| Account        | Email                      | Password        | Represents                                  |
| -------------- | -------------------------- | --------------- | ------------------------------------------- |
| Founder 30     | `test.founder30@aleet.app` | `AleetTest123!` | Invite-only member, $69/hr, 15 hrs/quarter  |
| Standard Member| `test.standard@aleet.app`  | `AleetTest123!` | Member, $89/hr, 15 hrs/quarter              |
| Regular Guest  | `test.regular@aleet.app`   | `AleetTest123!` | No membership, pay-per-ride                 |

Re-create / refresh any time with:

```bash
cd apps/backend
npm run seed:payment-test-accounts          # (re)create / refresh the 3 accounts
npm run seed:payment-test-accounts:revert   # delete them + their Stripe customers
```

> If a script says a saved card wasn't found (e.g. after resetting Stripe test data in the
> Dashboard), just re-run the seed command — it detects the missing card and re-attaches a
> fresh `pm_card_visa`.

### 0.4 Get a vehicle type ID and a region ID

Run these once (as any logged-in customer) and copy one `_id` from each into your environment:

```
GET {{base_url}}/api/vehicle-types
GET {{base_url}}/api/regions
```

---

## 1. The Big Picture — What We Are Proving

Before diving into requests, this is the one-slide summary to give William out loud. Every
flow after this is proof of one row in this table.

| Customer Type              | Rate Used                                  | Where This Comes From             |
| -------------------------- | ------------------------------------------ | --------------------------------- |
| Regular guest              | Vehicle rate ($120 / $150 / $220 per hr)   | Admin Pricing & Rules — vehicle rates |
| Standard Member            | $89/hr (from prepaid pool)                 | Membership Logic — Standard tier  |
| Founder 30 Member          | $69/hr (from prepaid pool), invite-only    | Membership Logic — Founder 30 tier|
| Any member, 12AM–9AM portion | Switches back to vehicle rate for that portion only | Late-Night Rule          |

**The key thing William cares about:** none of these numbers are hardcoded per-customer. The
backend looks at *who* is booking, checks their membership status and the time of day, and
picks the correct rate automatically — the same one line of logic runs for every single
booking. That's what the next sections prove, one rule at a time.

---

## 2. Flow A — Regular Guest, Normal Booking

**Goal:** prove a normal customer is charged the plain vehicle rate, plus the booking fee — nothing else.

### STEP A1 · Log in as the regular guest

```
POST {{base_url}}/api/auth/login
Content-Type: application/json

{
  "identifier": "test.regular@aleet.app",
  "password": "AleetTest123!"
}
```

Copy the returned `token` into `customer_token`.

### STEP A2 · Preview a 3-hour ride

```
POST {{base_url}}/api/bookings/preview
Authorization: Bearer {{customer_token}}
Content-Type: application/json

{
  "region": "{{region_id}}",
  "startDate": "2026-12-01T20:00:00.000Z",
  "endDate": "2026-12-01T23:00:00.000Z",
  "vehicleTypeId": "{{vehicle_type_id}}",
  "quantity": 1
}
```

**Response you'll see (Luxury Sedan example):**

```json
"hours": 3,
"regularPrice": 394,
"breakdown": {
  "baseRate": 120,
  "hours": 3,
  "bookingFee": 34,
  "isLateNight": false
}
```

**What to say:** This customer has no membership, so the system used the plain Luxury Sedan
rate of $120/hr. Formula: (3 hours × $120) + $34 booking fee = **$394**. That $34 is the same
small fee shown on every regular booking — like a tax — never hidden, never inflated.

---

## 3. Flow B — Under the 3-Hour Minimum (Special Rule)

**Goal:** prove the system enforces the 3-hour minimum by **billing** it — not by rejecting the
booking. This was one of the two real bugs found and fixed in this pass, so it's worth showing
on its own.

### STEP B1 · Preview a booking with only 1 hour selected

```
POST {{base_url}}/api/bookings/preview
Authorization: Bearer {{customer_token}}
Content-Type: application/json

{
  "region": "{{region_id}}",
  "startDate": "2026-12-01T20:00:00.000Z",
  "endDate": "2026-12-01T21:00:00.000Z",
  "vehicleTypeId": "{{vehicle_type_id}}",
  "quantity": 1
}
```

**Response:**

```json
"hours": 1,
"regularPrice": 394,
"breakdown": {
  "hours": 1,
  "billedHours": 3,
  "minimumHoursApplied": true,
  "minimumHoursNote": "Selected 1h is below the 3h minimum — billed at the 3h minimum rate."
}
```

**What to say:** The guest only asked for 1 hour, but per the requirement document, regular
rides have a 3-hour minimum. Notice this is a normal **200 response, not an error** — the system
quietly bills the 3-hour minimum instead of turning the customer away. `billedHours: 3` and
`minimumHoursApplied: true` are the two fields that prove it happened automatically.

**Note:** If you run this exact same request as a Standard or Founder 30 member instead,
`minimumHoursApplied` comes back `false` and only the real 1 hour is billed — members are
exempt from the minimum, per spec.

---

## 4. Flow C — Standard Membership Booking (Discount Logic)

**Goal:** prove the exact same booking form, with a member logged in, automatically applies the
member rate instead of the vehicle rate — with zero manual selection by the guest.

### STEP C1 · Log in as the Standard member

```
POST {{base_url}}/api/auth/login
Content-Type: application/json

{ "identifier": "test.standard@aleet.app", "password": "AleetTest123!" }
```

Copy `data.token` → set `member_token`.

### STEP C2 · Check their membership status first

```
GET {{base_url}}/api/subscriptions/status
Authorization: Bearer {{member_token}}
```

```json
"plan": "standard",
"ratePerHour": 89,
"currentQuarter": {
  "totalHoursIncluded": 15,
  "hoursUsed": 0,
  "hoursRemaining": 15
}
```

**What to say:** This customer already paid **$1,335 upfront** for the quarter — that's 15 hours
sitting in their account, ready to use. Nothing is charged per ride unless they go over.

### STEP C3 · Preview the same 3-hour trip

```
POST {{base_url}}/api/bookings/preview
Authorization: Bearer {{member_token}}
Content-Type: application/json

{
  "region": "{{region_id}}",
  "startDate": "2026-12-01T20:00:00.000Z",
  "endDate": "2026-12-01T23:00:00.000Z",
  "vehicleTypeId": "{{vehicle_type_id}}",
  "quantity": 1
}
```

Same request body as Flow A — only the logged-in token is different.

```json
"subscriptionPrice": 34,
"breakdown": {
  "memberRate": 89,
  "freeHoursUsed": 3,
  "freeHoursLeft": 12,
  "bookingFee": 34
}
```

**What to say:** Same 3-hour trip, same car — but this time the system recognized an active
Standard Membership and pulled the hours from their prepaid pool instead of charging $120/hr.
`subscriptionPrice` only shows the $34 booking fee, because the 3 ride-hours themselves are
already paid for. `freeHoursLeft` drops from 15 to 12 — that's the balance tracking working.

---

## 5. Flow D — Founder 30 Booking (Invite-Only Logic)

**Goal:** prove Founder 30 is a private tier — a random customer cannot self-select it — and that
once granted, it uses its own $69/hr rate.

### STEP D1 · Prove it's invite-only (as the regular guest)

```
POST {{base_url}}/api/subscriptions/checkout
Authorization: Bearer {{customer_token}}
Content-Type: application/json

{ "plan": "founder30" }
```

**Expected:** `403 Forbidden` — `"Founder 30 membership requires an admin invitation"`.

**What to say:** This proves Founder 30 can't be bought by just anyone off the street — an admin
has to switch it on for a specific customer first, exactly like the client's private invite-only
requirement.

### STEP D2 · Log in as the already-invited Founder 30 test account

```
POST {{base_url}}/api/auth/login
Content-Type: application/json

{ "identifier": "test.founder30@aleet.app", "password": "AleetTest123!" }
```

### STEP D3 · Preview the same 3-hour trip

```
POST {{base_url}}/api/bookings/preview
Authorization: Bearer {{member_token}}
Content-Type: application/json

{
  "region": "{{region_id}}",
  "startDate": "2026-12-01T20:00:00.000Z",
  "endDate": "2026-12-01T23:00:00.000Z",
  "vehicleTypeId": "{{vehicle_type_id}}",
  "quantity": 1
}
```

```json
"subscriptionPrice": 34,
"breakdown": {
  "memberRate": 69,
  "freeHoursUsed": 3,
  "freeHoursLeft": 12
}
```

**What to say:** Identical flow to the Standard member — only the rate is **$69/hr instead of
$89/hr**, because this account's `plan` field is `founder30`. One shared piece of logic, two
different outcomes, purely based on which plan is stored against the account. Nothing is
duplicated or special-cased in the code.

---

## 6. Flow E — Hours Pool Per Quarter, Not Per Month

**Goal:** prove a member can use hours unevenly across the 3-month cycle — this was the second
real bug fixed in this pass, so it's worth its own live proof.

### STEP E1 · As the Standard member (0 of 15 hours used), preview a 6-hour trip in one go

```
POST {{base_url}}/api/bookings/preview
Authorization: Bearer {{member_token}}
Content-Type: application/json

{
  "region": "{{region_id}}",
  "startDate": "2026-12-01T10:00:00.000Z",
  "endDate": "2026-12-01T16:00:00.000Z",
  "vehicleTypeId": "{{vehicle_type_id}}",
  "quantity": 1
}
```

```json
"breakdown": {
  "freeHoursUsed": 6,
  "freeHoursLeft": 9
}
```

**What to say:** This member used 6 hours in a single trip and still has 9 left. If the system
were wrongly capping at 5 hours a month (the old bug), this booking would have triggered an
overage charge on 1 hour. It didn't — because the correct rule is **15 hours usable any time
across the full 3-month billing cycle**, exactly as the client clarified.

---

## 7. Flow F — Late-Night Split Pricing (12 AM – 9 AM)

**Goal:** prove that only the *portion* of a trip inside the late-night window switches back to
the vehicle rate — not the whole trip.

### STEP F1 · As a member, preview a trip from 10 PM to 2 AM

```
POST {{base_url}}/api/bookings/preview
Authorization: Bearer {{member_token}}
Content-Type: application/json

{
  "region": "{{region_id}}",
  "startDate": "2026-12-01T22:00:00.000Z",
  "endDate": "2026-12-02T02:00:00.000Z",
  "vehicleTypeId": "{{vehicle_type_id}}",
  "quantity": 1
}
```

```json
"breakdown": {
  "isLateNight": true,
  "lateNightHours": 2,
  "regularMemberHours": 2,
  "lateNightNote": "2h billed at vehicle rate ($120/hr); 2h at member rate ($89/hr)"
}
```

Expected total (Luxury Sedan): `data.subscriptionPrice` / `data.total` = **$274**
(2h × $120 late-night + 2h from the free member pool + $34 fee).

**What to say:** The trip runs 10 PM to 2 AM — 4 hours total. 10 PM–12 AM (2 hours) is outside
the late-night window, so it's billed at the member's normal $89/hr rate. 12 AM–2 AM (2 hours)
falls inside the window, so those 2 hours switch to the plain vehicle rate instead. This matches
the client's exact example: *"only the hours inside the window switch to normal pricing"* — not
the whole trip.

---

## 8. Flow G — Overage Charges (Hours Run Out)

**Goal:** prove that once a member's 15 free hours are used up, extra hours are automatically
charged at their own locked rate.

### STEP G1 · Admin manually triggers an overage charge (simulating hours exhausted)

> Get the customer's `_id` from `GET {{base_url}}/api/admin/memberships` first.

```
POST {{base_url}}/api/admin/memberships/CUSTOMER_USER_ID/charge-overage
Authorization: Bearer {{admin_token}}
Content-Type: application/json

{ "overageHours": 2.5 }
```

```json
"data": {
  "overageHours": 2.5,
  "amountCharged": 222.5,
  "paymentIntentId": "pi_xxx"
}
```

**What to say:** For a Standard member, overage is charged at their own $89/hr rate — 2.5 hours
× $89 = **$222.50** — automatically charged to their saved card, no manual invoice needed.
Founder 30 overage would use $69/hr instead, since each membership is locked to its own rate.

---

## 9. Flow H — Saved Cards (Works Like Uber, For Everyone)

**Goal:** prove that any customer — member or not — gets a card saved automatically the first
time they pay, and can reuse it in one tap after that.

### STEP H1 · List saved cards for the logged-in customer

```
GET {{base_url}}/api/payments/saved-cards
Authorization: Bearer {{customer_token}}
```

```json
[
  {
    "id": "pm_xxx",
    "brand": "visa",
    "last4": "4242",
    "isDefault": true
  }
]
```

Save the first card's `id` as `payment_method_id`.

### STEP H2 · Charge a booking using that saved card — no redirect, instant

> First create a booking to get a `booking_id` — see **Appendix A** for the one-call
> `POST /api/bookings/start` recipe. Then:

```
POST {{base_url}}/api/payments/charge-saved-card
Authorization: Bearer {{customer_token}}
Content-Type: application/json

{
  "bookingId": "{{booking_id}}",
  "paymentMethodId": "{{payment_method_id}}"
}
```

```json
"status": "succeeded",
"amountCharged": 394
```

**What to say:** This is exactly the Uber-style experience the client asked for. The first time
any guest — member or not — pays for a ride, Stripe automatically stores that card against their
profile. Every booking after that can be paid in one tap with no card re-entry, using this same
endpoint.

> A booking can only be charged once. If `paymentStatus` is already `"Paid"`, create a fresh
> booking (Appendix A) for another live charge.

---

## 10. Flow I — Booking Fee Shown as Its Own Line Item

**Goal:** prove the $34 booking fee appears as a small separate line on checkout and the
receipt — not hidden, not folded into one big number.

### STEP I1 · Create a Stripe Checkout session for a booking

```
POST {{base_url}}/api/payments/checkout-session
Authorization: Bearer {{customer_token}}
Content-Type: application/json

{ "bookingId": "{{booking_id}}" }
```

```json
"data": {
  "url": "https://checkout.stripe.com/...",
  "sessionId": "cs_test_xxx"
}
```

**What to say:** I'll actually open this URL live on screen. William will see **two line items**
on Stripe's own checkout page: the ride fare, and a separate small "Booking Fee" line — the same
way a tax or service fee is shown on a receipt. This directly matches his clarification that the
fee should never look like a large or scary charge.

---

## 11. Flow J — Admin Changes a Price and It Applies Instantly

**Goal:** prove nothing is hardcoded — every number lives in one settings table that admins
control.

### STEP J1 · Get current settings

```
GET {{base_url}}/api/admin/tiers/settings
Authorization: Bearer {{admin_token}}
```

```json
"bookingFee": 34,
"membershipRate": 89,
"founder30Rate": 69
```

### STEP J2 · Change the booking fee to $40

```
PATCH {{base_url}}/api/admin/tiers/settings
Authorization: Bearer {{admin_token}}
Content-Type: application/json

{ "bookingFee": 40 }
```

### STEP J3 · Re-run the Flow A preview — same request as Section 2

```json
"regularPrice": 400,
"breakdown": { "bookingFee": 40 }
```

**What to say:** Nothing else changed — same customer, same car, same hours — only the admin
setting changed, and the price recalculated instantly. This is the proof that pricing lives
entirely in the admin panel and needs zero code changes or redeployment to update.

### STEP J4 · Reset it back to $34 before ending the call

```
PATCH {{base_url}}/api/admin/tiers/settings
Authorization: Bearer {{admin_token}}
Content-Type: application/json

{ "bookingFee": 34 }
```

---

## 12. Flow K — Driver Payouts & Company Revenue

**Goal:** prove the money going to the driver, and the money the company keeps, both follow one
shared, transparent formula — and that vehicle costs are actually deducted, not just stored on
paper.

### STEP K1 · Get the full payout breakdown for one completed, paid booking

```
GET {{base_url}}/api/admin/finance/bookings/BOOKING_ID/payout-breakdown
Authorization: Bearer {{admin_token}}
```

```json
"tier": "S-Level",
"finalPrice": 500,
"payoutRate": 0.30,
"keepsBookingFee": false,
"earningsFromFare": 150,
"vehicleCostDeduction": 50,
"companyCostAbsorption": 100,
"driverPayout": 100,
"companyRevenue": 300
```

**What to say:** Formula in plain English: the S-Level driver earns 30% of the $500 fare = $150.
Then the $50 vehicle cost charge is subtracted from their earnings, leaving them $100.
Separately, the company absorbs a $100 internal cost — that comes out of the company's share,
not the driver's — leaving the company with $300 net on this trip. Same formula runs for every
driver tier, every trip, everywhere in the app.

### STEP K2 · Company-wide revenue report

```
GET {{base_url}}/api/admin/finance/revenue
Authorization: Bearer {{admin_token}}
```

```json
"totalRevenue": 42500,
"totalDriverPayouts": 15800,
"totalCompanyCostAbsorption": 1200,
"companyNetRevenue": 25500
```

**What to say:** This is the admin dashboard number — total revenue minus everything paid to
drivers minus absorbed costs equals the company's real net revenue. It can be filtered by date
range too, for month-end reporting.

---

## 13. Recap — Requirement-to-Proof Map

The summary table to leave William with after the call — every requirement, matched to exactly
which Postman test proved it.

| Requirement (from the spec)                  | Rule Implemented                            | Proven In |
| -------------------------------------------- | ------------------------------------------- | --------- |
| Regular ride pricing by vehicle type         | Vehicle rate × hours + booking fee          | Flow A    |
| 3-hour minimum enforced                       | Billed automatically, never rejected        | Flow B    |
| Standard Membership pricing                   | $89/hr from a 15-hr quarterly pool          | Flow C    |
| Founder 30 — invite only, $69/hr              | 403 until admin invites; own rate after     | Flow D    |
| 15 hrs/quarter, not 5/month                   | Pool tracked across full billing cycle      | Flow E    |
| Late-night split (12 AM–9 AM)                 | Only in-window hours use vehicle rate       | Flow F    |
| Overage billed at member's own rate           | Auto-charged to saved card                  | Flow G    |
| Saved cards for every user type               | Uber-style, auto-saved on first payment     | Flow H    |
| Booking fee shown, not hidden                 | Separate small line item at checkout        | Flow I    |
| Admin-adjustable pricing, no code changes     | Live PATCH updates recalculate instantly    | Flow J    |
| Driver payout math + vehicle cost deduction   | Shared formula, tier-based                  | Flow K    |
| Company revenue calculation                   | Revenue − payouts − absorbed costs          | Flow K    |

---

## 14. What Still Needs the Frontend (Not a Backend Gap)

To set expectations clearly on the call — these items are logic-complete and provable in Postman
today, but need real screens before a non-technical walkthrough is possible without Postman:

- Card entry screen (Stripe's own secure card form) and the saved-cards list inside the guest profile
- The booking form itself — vehicle picker, date/time picker, stop entries, map-based address selection
- Checkout / payment confirmation screens
- Admin dashboard screens for pricing, memberships, and the revenue report
- Driver app screens — accept trip, view payout
- Google Maps / Places integration for pickup and drop-off addresses

**Bottom line:** Every rule in the requirements document is implemented, tested, and shown
working live above. What's left is giving these same working rules a visual home — that's the
frontend layer.

---

# Appendices — Technical Reference

The demo above is the client-facing script. The sections below are the deeper reference for
QA / engineering.

## Appendix A — Create a Booking (get `booking_id`)

`POST /api/bookings/preview` only calculates price — it does **not** create a booking.
To get a real `booking_id` for Flows H, I, and K, use `POST /api/bookings/start`.

`bookingMode: "buy_hours"` is the simplest body (no stops/dropoff required):

```
POST {{base_url}}/api/bookings/start
Authorization: Bearer {{customer_token}}
Content-Type: application/json

{
  "region": "{{region_id}}",
  "vehicleTypeId": "{{vehicle_type_id}}",
  "bookingMode": "buy_hours",
  "startDate": "2026-12-01T20:00:00.000Z",
  "durationHours": 3,
  "pickupLocation": "123 Main St, New York, NY",
  "quantity": 1
}
```

**Returns `201`** with `data.booking._id` — save that as `booking_id`.

```json
{
  "success": true,
  "data": {
    "booking": {
      "_id": "674abc123...",
      "status": "Pending",
      "paymentStatus": "Unpaid",
      "finalPrice": 394
    }
  }
}
```

List your existing unpaid bookings instead of creating a new one:

```
GET {{base_url}}/api/bookings/my?status=Pending
Authorization: Bearer {{customer_token}}
```

## Appendix B — Admin Pricing Settings (full field list)

```
GET   {{base_url}}/api/admin/tiers/settings      # returns bookingFee, minBookingHours, lateNightStart/End, membershipRate, founder30Rate, tiers{}
PATCH {{base_url}}/api/admin/tiers/settings      # update any subset of fields
```

Examples:

```json
// Late-night window
{ "lateNightStart": "00:00", "lateNightEnd": "09:00" }

// Membership rates
{ "membershipRate": 89, "founder30Rate": 69, "membershipMonthlyHours": 5, "membershipBillingCycle": "quarterly" }

// Driver tier payout rates
{
  "tiers": {
    "S-Level": { "payoutRate": 0.30, "keepsBookingFee": false, "vehicleCostDeduction": 50 },
    "Pro":     { "payoutRate": 0.40, "keepsBookingFee": true },
    "Diamond": { "payoutRate": 0.40, "keepsBookingFee": true }
  }
}
```

Validation example — bad time format returns `400 lateNightStart must be in HH:MM format`:

```json
{ "lateNightStart": "midnight" }
```

## Appendix C — Saved Cards (full CRUD)

```
POST   {{base_url}}/api/payments/setup-intent            # create SetupIntent (returns clientSecret + customerId); card save itself needs Stripe.js
GET    {{base_url}}/api/payments/saved-cards             # list cards (id, brand, last4, expMonth, expYear, isDefault)
POST   {{base_url}}/api/payments/set-default-card        # body: { "paymentMethodId": "pm_xxx" }
DELETE {{base_url}}/api/payments/saved-cards/{{payment_method_id}}
```

Stripe test cards (test mode):

| Card Number           | Result             |
| --------------------- | ------------------ |
| `4242 4242 4242 4242` | Always succeeds    |
| `4000 0000 0000 0002` | Always declined    |
| `4000 0025 0000 3155` | Requires 3D Secure |

Expiry: any future date (e.g. `12/27`). CVC: any 3 digits.

## Appendix D — Membership Endpoints

```
GET  {{base_url}}/api/subscriptions/benefits             # public — plan rates, hours, quarterly charges
POST {{base_url}}/api/subscriptions/checkout             # body: { "plan": "standard" } → Stripe checkout url + quarterlyCharge 1335
POST {{base_url}}/api/subscriptions/charge-saved-card    # body: { "plan": "standard", "paymentMethodId": "pm_xxx" } → activates, no redirect
GET  {{base_url}}/api/subscriptions/status               # subscriber status + currentQuarter hours
POST {{base_url}}/api/subscriptions/cancel               # body: { "reason": "..." }
```

Admin membership management:

```
GET   {{base_url}}/api/admin/memberships                                 # list all members (paginated, ?plan=standard&page=1&limit=10)
PATCH {{base_url}}/api/admin/memberships/invite-founder30/CUSTOMER_ID    # body: { "invited": true|false }
POST  {{base_url}}/api/admin/memberships/CUSTOMER_ID/charge-overage      # body: { "overageHours": 2 }
PATCH {{base_url}}/api/admin/memberships/CUSTOMER_ID/balance             # body: { "yearMonth": "2026-10", "totalHoursUsed": 3 }
```

## Appendix E — Stripe Webhook (Local Testing)

```bash
# Download from https://stripe.com/docs/stripe-cli
stripe login
stripe listen --forward-to localhost:5000/api/payments/webhook
```

The CLI prints a webhook secret starting with `whsec_`. Set it as `STRIPE_WEBHOOK_SECRET` in `.env`.

```bash
stripe trigger checkout.session.completed
stripe trigger payment_intent.succeeded
```

Watch the backend terminal:

```
✅ Webhook received: checkout.session.completed
💾 Booking marked Paid: <bookingId>
✅ Card pm_xxx attached to customer cus_xxx
```

## Appendix F — Driver Payout Endpoints

```
POST {{base_url}}/api/payout/booking/BOOKING_ID                          # driver — trigger Stripe Connect payout for a paid, completed booking
POST {{base_url}}/api/payout/run                                         # driver — bulk-process all eligible payouts
GET  {{base_url}}/api/admin/finance/bookings/BOOKING_ID/payout-breakdown # admin — full line-items for one booking
GET  {{base_url}}/api/admin/finance/revenue?startDate=&endDate=&status=  # admin — company revenue report (omit params for all-time)
```

`companyNetRevenue = totalRevenue − totalDriverPayouts − totalCompanyCostAbsorption`

## Appendix G — Quick Reference: All Endpoints

| Method | URL                                                | Auth     | Purpose                                                     |
| ------ | -------------------------------------------------- | -------- | ----------------------------------------------------------- |
| POST   | `/api/auth/login`                                  | Public   | Get JWT                                                     |
| GET    | `/api/vehicle-types`                               | Customer | List vehicle types (get `vehicle_type_id`)                  |
| GET    | `/api/regions`                                     | Customer | List regions (get `region_id`)                              |
| POST   | `/api/bookings/preview`                            | Customer | Price only — no booking created                             |
| POST   | `/api/bookings/start`                              | Customer | **Create booking → returns `_id`**                          |
| GET    | `/api/bookings/my`                                 | Customer | List own bookings (`?status=Pending`)                       |
| GET    | `/api/admin/tiers/settings`                        | Admin    | Get all pricing settings                                    |
| PATCH  | `/api/admin/tiers/settings`                        | Admin    | Update any pricing setting                                  |
| POST   | `/api/payments/setup-intent`                       | Customer | Create SetupIntent (save card)                              |
| GET    | `/api/payments/saved-cards`                        | Customer | List saved cards                                            |
| POST   | `/api/payments/set-default-card`                   | Customer | Set default card                                            |
| DELETE | `/api/payments/saved-cards/:pmId`                  | Customer | Delete a saved card                                         |
| POST   | `/api/payments/charge-saved-card`                  | Customer | Pay booking with saved card                                 |
| POST   | `/api/payments/checkout-session`                   | Customer | Stripe hosted checkout (booking fee as own line item)       |
| GET    | `/api/subscriptions/benefits`                      | Public   | Get plan pricing info                                       |
| POST   | `/api/subscriptions/checkout`                      | Customer | Membership Stripe checkout                                  |
| POST   | `/api/subscriptions/charge-saved-card`             | Customer | Membership direct charge                                    |
| GET    | `/api/subscriptions/status`                        | Customer | Get membership status                                       |
| POST   | `/api/subscriptions/cancel`                        | Customer | Cancel membership                                           |
| GET    | `/api/admin/memberships`                           | Admin    | List all members                                            |
| PATCH  | `/api/admin/memberships/invite-founder30/:userId`  | Admin    | Grant/revoke Founder 30                                     |
| POST   | `/api/admin/memberships/:userId/charge-overage`    | Admin    | Manual overage charge                                       |
| PATCH  | `/api/admin/memberships/:userId/balance`           | Admin    | Update hour balance                                         |
| GET    | `/api/admin/finance/revenue`                       | Admin    | Company revenue report                                      |
| GET    | `/api/admin/finance/bookings/:id/payout-breakdown` | Admin    | Full payout line-items for one booking                      |
| POST   | `/api/payout/booking/:id`                          | Driver   | Trigger Stripe Connect payout                               |
| POST   | `/api/payout/run`                                  | Driver   | Bulk-process all eligible payouts                           |

## Appendix H — Common Errors & Fixes

| Error                                     | Cause                          | Fix                                     |
| ----------------------------------------- | ------------------------------ | --------------------------------------- |
| `401 No token provided`                   | Missing `Authorization` header | Add `Bearer <token>`                    |
| `400 Invalid vehicle type`                | `vehicle_type_id` empty/wrong  | Re-fetch `GET /api/vehicle-types`, set the env var |
| `400 Start date must be in future`        | Past date in body              | Use a future date (e.g. `2026-12-01`)   |
| `403 Founder 30 requires invitation`      | User not invited               | Admin: PATCH invite-founder30 first     |
| `402 Card was declined`                   | Stripe declined the test card  | Use `4242 4242 4242 4242` / re-seed accounts |
| `400 paymentMethodId is required`         | Missing body field             | Add `paymentMethodId` to body           |
| `400 Earliest pickup is 3 hours from now` | Too close to now               | Use a start time > 3h in the future     |
| `500 No Stripe customer found`            | Customer has no Stripe record  | POST `/api/payments/setup-intent` first |

> **Note:** `400 Minimum booking is 3 hours` no longer occurs. Trips under the 3-hour minimum
> (non-members) are billed at the 3-hour rate instead of being rejected — see Flow B. The
> maximum-7-days rule still applies and still rejects.
