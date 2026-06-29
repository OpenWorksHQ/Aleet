# Aleet Backend — Postman Testing Guide

> Step-by-step instructions to test every new endpoint in the `feat/payment-process` branch.  
> Follow the sections in order — some tests depend on IDs returned by earlier calls.

---

## Setup

### Environment Variables in Postman

Create a Postman Environment called **"Aleet Local"** with these variables:

| Variable | Initial Value | Notes |
|---|---|---|
| `base_url` | `http://localhost:5000` | Change to your ngrok URL for webhook testing |
| `customer_token` | _(empty)_ | Filled after customer login |
| `admin_token` | _(empty)_ | Filled after admin login |
| `booking_id` | _(empty)_ | Filled after creating a booking |
| `vehicle_type_id` | _(empty)_ | Filled after getting vehicle types |
| `region_id` | _(empty)_ | Filled after getting regions |
| `session_id` | _(empty)_ | Filled after creating checkout session |
| `payment_method_id` | _(empty)_ | Filled after listing saved cards |
| `customer_id` | _(empty)_ | Filled after setup-intent |

---

## Pre-requisites

### A — Start the Backend

```bash
cd apps/backend
npm run dev
```

Server should log: `🚀 Server running on http://localhost:5000`

### B — Login as Customer

```
POST {{base_url}}/api/auth/login
Content-Type: application/json

{
  "phone": "+1xxxxxxxxxx",
  "password": "your_password"
}
```

Copy the `token` from the response. Set `customer_token` in your Postman environment.

### C — Login as Admin

Same endpoint, use admin credentials. Set `admin_token`.

### D — Get Vehicle Type ID

```
GET {{base_url}}/api/vehicle-types
Authorization: Bearer {{customer_token}}
```

Copy an `_id` from the response array and set `vehicle_type_id`.

### E — Get Region ID

```
GET {{base_url}}/api/regions
Authorization: Bearer {{customer_token}}
```

Copy an `_id` and set `region_id`.

---

---

## GROUP 1 — Admin Pricing Settings

### Test 1.1 — Get Current Pricing Settings

```
GET {{base_url}}/api/admin/tiers/settings
Authorization: Bearer {{admin_token}}
```

**Expected:** 200 with full settings object including `bookingFee`, `minBookingHours`, `lateNightStart`, `membershipRate`, etc.

---

### Test 1.2 — Update Booking Fee

```
PATCH {{base_url}}/api/admin/tiers/settings
Authorization: Bearer {{admin_token}}
Content-Type: application/json

{
  "bookingFee": 40
}
```

**Expected:** 200, `data.bookingFee` = 40.

---

### Test 1.3 — Update Late-Night Window

```
PATCH {{base_url}}/api/admin/tiers/settings
Authorization: Bearer {{admin_token}}
Content-Type: application/json

{
  "lateNightStart": "00:00",
  "lateNightEnd": "09:00"
}
```

**Expected:** 200 with updated values.

---

### Test 1.4 — Update Membership Rates

```
PATCH {{base_url}}/api/admin/tiers/settings
Authorization: Bearer {{admin_token}}
Content-Type: application/json

{
  "membershipRate": 89,
  "founder30Rate": 69,
  "membershipMonthlyHours": 5,
  "membershipBillingCycle": "quarterly"
}
```

**Expected:** 200 with all values updated.

---

### Test 1.5 — Update Driver Tier Payout Rates

```
PATCH {{base_url}}/api/admin/tiers/settings
Authorization: Bearer {{admin_token}}
Content-Type: application/json

{
  "tiers": {
    "S-Level": { "payoutRate": 0.30, "keepsBookingFee": false, "vehicleCostDeduction": 50 },
    "Pro":     { "payoutRate": 0.40, "keepsBookingFee": true },
    "Diamond": { "payoutRate": 0.40, "keepsBookingFee": true }
  }
}
```

**Expected:** 200 with tier configs updated.

---

### Test 1.6 — Validation Error (invalid time format)

```
PATCH {{base_url}}/api/admin/tiers/settings
Authorization: Bearer {{admin_token}}
Content-Type: application/json

{
  "lateNightStart": "midnight"
}
```

**Expected:** 400 with message `lateNightStart must be in HH:MM format`.

---

### Test 1.7 — Reset Booking Fee Back to Default

```
PATCH {{base_url}}/api/admin/tiers/settings
Authorization: Bearer {{admin_token}}
Content-Type: application/json

{
  "bookingFee": 34
}
```

---

## GROUP 2 — Booking Price Preview (with booking fee)

### Test 2.1 — Regular Guest Price Preview

```
POST {{base_url}}/api/bookings/preview
Authorization: Bearer {{customer_token}}
Content-Type: application/json

{
  "region": "{{region_id}}",
  "startDate": "2025-12-01T20:00:00.000Z",
  "endDate": "2025-12-01T23:00:00.000Z",
  "vehicleTypeId": "{{vehicle_type_id}}",
  "quantity": 1
}
```

**Expected:** 200.  
**Check:** `data.breakdown.bookingFee` = 34 (or whatever admin set). `data.regularPrice` should include the booking fee.

---

### Test 2.2 — Preview a Trip Crossing Late-Night Window (as member)

> First make sure your test customer has `subscriptionStatus: "subscriber"` in DB.

```
POST {{base_url}}/api/bookings/preview
Authorization: Bearer {{customer_token}}
Content-Type: application/json

{
  "region": "{{region_id}}",
  "startDate": "2025-12-01T22:00:00.000Z",
  "endDate": "2025-12-02T02:00:00.000Z",
  "vehicleTypeId": "{{vehicle_type_id}}",
  "quantity": 1
}
```

**Expected:** 200.  
**Check:** `data.breakdown.isLateNight` = true. `data.breakdown.lateNightHours` ≈ 2 (midnight to 2AM). `data.breakdown.lateNightNote` explains the split.

---

## GROUP 3 — Saved Cards

### Test 3.1 — Create SetupIntent (to save a card)

```
POST {{base_url}}/api/payments/setup-intent
Authorization: Bearer {{customer_token}}
```

**Expected:** 200 with `clientSecret` and `customerId`.

> **Note:** You can't complete this test in Postman alone because saving the card requires the Stripe.js frontend widget. Use this to test the API responds correctly. The actual card save happens via Stripe.js.

---

### Test 3.2 — List Saved Cards

```
GET {{base_url}}/api/payments/saved-cards
Authorization: Bearer {{customer_token}}
```

**Expected:** 200 with array. Each card has `id`, `brand`, `last4`, `expMonth`, `expYear`, `isDefault`.

> If the array is empty, the customer hasn't saved a card yet. Test 3.1 + Stripe.js is needed first.  
> In test mode you can use the Stripe Dashboard to manually attach a test card to the customer.

**Save** the first card's `id` as `payment_method_id` in your environment.

---

### Test 3.3 — Set Default Card

```
POST {{base_url}}/api/payments/set-default-card
Authorization: Bearer {{customer_token}}
Content-Type: application/json

{
  "paymentMethodId": "{{payment_method_id}}"
}
```

**Expected:** 200 with `paymentMethodId`.

---

### Test 3.4 — Charge Saved Card for a Booking

> First create a booking using Test 2 flows and set `booking_id`.

```
POST {{base_url}}/api/payments/charge-saved-card
Authorization: Bearer {{customer_token}}
Content-Type: application/json

{
  "bookingId": "{{booking_id}}",
  "paymentMethodId": "{{payment_method_id}}",
  "tip": 10
}
```

**Expected:** 200 with `paymentIntentId` and `status: "succeeded"`.  
**Check:** The booking's `paymentStatus` should be `"Paid"` now.

---

### Test 3.5 — Stripe Test Cards

Use these test card numbers (Stripe test mode):

| Card Number | Result |
|---|---|
| `4242 4242 4242 4242` | Always succeeds |
| `4000 0000 0000 0002` | Always declined |
| `4000 0025 0000 3155` | Requires 3D Secure |

Expiry: any future date (e.g. `12/27`). CVC: any 3 digits.

---

### Test 3.6 — Delete a Saved Card

```
DELETE {{base_url}}/api/payments/saved-cards/{{payment_method_id}}
Authorization: Bearer {{customer_token}}
```

**Expected:** 200 with `"Card removed successfully"`.

---

## GROUP 4 — Membership Checkout

### Test 4.1 — Get Membership Benefits (public, no auth)

```
GET {{base_url}}/api/subscriptions/benefits
```

**Expected:** 200 with `standard` and `founder30` objects showing rates, hours, and quarterly charges.

---

### Test 4.2 — Standard Membership Checkout (redirect)

```
POST {{base_url}}/api/subscriptions/checkout
Authorization: Bearer {{customer_token}}
Content-Type: application/json

{
  "plan": "standard"
}
```

**Expected:** 200 with `url` (Stripe checkout URL) and `quarterlyCharge: 1335`.  
Set `session_id` from the response.

---

### Test 4.3 — Founder 30 Checkout (should fail without invite)

```
POST {{base_url}}/api/subscriptions/checkout
Authorization: Bearer {{customer_token}}
Content-Type: application/json

{
  "plan": "founder30"
}
```

**Expected:** 403 — `"Founder 30 membership requires an admin invitation"`

---

### Test 4.4 — Membership Checkout with Saved Card (no redirect)

> Customer must have a saved card first (see Group 3).

```
POST {{base_url}}/api/subscriptions/charge-saved-card
Authorization: Bearer {{customer_token}}
Content-Type: application/json

{
  "plan": "standard",
  "paymentMethodId": "{{payment_method_id}}"
}
```

**Expected:** 200 with activated subscription.  
**Check:** `data.subscription.quarterlyCharge` = 1335, `data.subscription.plan` = `"standard"`.

---

### Test 4.5 — Get Membership Status

```
GET {{base_url}}/api/subscriptions/status
Authorization: Bearer {{customer_token}}
```

**Expected:** 200. If subscribed: `data.status = "subscriber"`, `currentQuarter.totalHoursIncluded = 15`.

---

### Test 4.6 — Cancel Membership

```
POST {{base_url}}/api/subscriptions/cancel
Authorization: Bearer {{customer_token}}
Content-Type: application/json

{
  "reason": "Testing cancellation"
}
```

**Expected:** 200 with cancellation confirmation.

---

## GROUP 5 — Admin Membership Management

### Test 5.1 — List All Members

```
GET {{base_url}}/api/admin/memberships
Authorization: Bearer {{admin_token}}
```

**Expected:** 200 with paginated array of members, including hours used/remaining.

---

### Test 5.2 — Filter by Plan

```
GET {{base_url}}/api/admin/memberships?plan=standard&page=1&limit=10
Authorization: Bearer {{admin_token}}
```

---

### Test 5.3 — Invite Customer to Founder 30

> Get a customer's `_id` from the users list first.

```
PATCH {{base_url}}/api/admin/memberships/invite-founder30/CUSTOMER_USER_ID
Authorization: Bearer {{admin_token}}
Content-Type: application/json

{
  "invited": true
}
```

**Expected:** 200 — `data.founder30Invited = true`.

Now retry Test 4.3 as that customer — it should succeed (403 should be gone).

---

### Test 5.4 — Revoke Founder 30 Invite

```
PATCH {{base_url}}/api/admin/memberships/invite-founder30/CUSTOMER_USER_ID
Authorization: Bearer {{admin_token}}
Content-Type: application/json

{
  "invited": false
}
```

**Expected:** 200 — `data.founder30Invited = false`.

---

### Test 5.5 — Admin Charge Overage

> Requires the customer to be an active subscriber with a saved card.

```
POST {{base_url}}/api/admin/memberships/CUSTOMER_USER_ID/charge-overage
Authorization: Bearer {{admin_token}}
Content-Type: application/json

{
  "overageHours": 2
}
```

**Expected:** 200 — `data.amountCharged = 178` (for standard: 2 × $89).

---

### Test 5.6 — Update Member Balance

```
PATCH {{base_url}}/api/admin/memberships/CUSTOMER_USER_ID/balance
Authorization: Bearer {{admin_token}}
Content-Type: application/json

{
  "yearMonth": "2025-10",
  "totalHoursUsed": 3
}
```

**Expected:** 200 — `data.totalHoursUsed = 3`.

---

## GROUP 6 — Stripe Webhook (Local Testing)

### Install Stripe CLI

```bash
# Download from https://stripe.com/docs/stripe-cli
stripe login
stripe listen --forward-to localhost:5000/api/payments/webhook
```

The CLI will print a webhook secret starting with `whsec_`. Set that as `STRIPE_WEBHOOK_SECRET` in your `.env`.

### Simulate Events

```bash
# Simulate a successful checkout payment
stripe trigger checkout.session.completed

# Simulate booking payment completed
stripe trigger payment_intent.succeeded
```

### Check webhook handler output

Watch your backend terminal — you should see:
```
✅ Webhook received: checkout.session.completed
💾 Booking marked Paid: <bookingId>
✅ Card pm_xxx attached to customer cus_xxx
```

---

## Quick Reference — All New Endpoints

| Method | URL | Auth | Purpose |
|---|---|---|---|
| GET | `/api/admin/tiers/settings` | Admin | Get all pricing settings |
| PATCH | `/api/admin/tiers/settings` | Admin | Update any pricing setting |
| POST | `/api/payments/setup-intent` | Customer | Create SetupIntent (save card) |
| GET | `/api/payments/saved-cards` | Customer | List saved cards |
| POST | `/api/payments/set-default-card` | Customer | Set default card |
| DELETE | `/api/payments/saved-cards/:pmId` | Customer | Delete a saved card |
| POST | `/api/payments/charge-saved-card` | Customer | Pay booking with saved card |
| GET | `/api/subscriptions/benefits` | Public | Get plan pricing info |
| POST | `/api/subscriptions/checkout` | Customer | Membership Stripe checkout |
| POST | `/api/subscriptions/charge-saved-card` | Customer | Membership direct charge |
| POST | `/api/subscriptions/process-payment` | Customer | Reconcile after checkout |
| GET | `/api/subscriptions/status` | Customer | Get membership status |
| POST | `/api/subscriptions/cancel` | Customer | Cancel membership |
| GET | `/api/admin/memberships` | Admin | List all members |
| PATCH | `/api/admin/memberships/invite-founder30/:userId` | Admin | Grant/revoke Founder 30 |
| POST | `/api/admin/memberships/:userId/charge-overage` | Admin | Manual overage charge |
| PATCH | `/api/admin/memberships/:userId/balance` | Admin | Update hour balance |

---

## Common Errors & Fixes

| Error | Cause | Fix |
|---|---|---|
| `401 No token provided` | Missing `Authorization` header | Add `Bearer <token>` |
| `403 Founder 30 requires invitation` | User not invited | Admin: PATCH invite-founder30 first |
| `402 Card was declined` | Stripe declined the test card | Use `4242 4242 4242 4242` |
| `400 paymentMethodId is required` | Missing body field | Add `paymentMethodId` to body |
| `400 Minimum booking is 3 hours` | Trip < 3h (non-member) | Extend trip duration or subscribe |
| `400 Earliest pickup is 3 hours from now` | Too close to now | Use a start time > 3h in the future |
| `500 No Stripe customer found` | Customer has no Stripe record | POST `/api/payments/setup-intent` first |
