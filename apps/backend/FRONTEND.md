# Aleet Backend — Frontend Integration Guide

> **For the frontend developer.** This guide covers every new API endpoint added in the `feat/payment-process` branch. It covers request format, response shape, authentication, error handling, and integration notes for the Stripe card UI.

---

## Base URL

| Environment | URL |
|---|---|
| Local | `http://localhost:5000` |
| Production | set in `APP_BASE_URL` env var |

---

## Authentication

Every protected endpoint requires a **Bearer token** in the `Authorization` header.

```
Authorization: Bearer <jwt_token>
```

The token is returned from the login/signup flow (`POST /api/auth/login`).

Admin-only endpoints additionally require the user to have `role: "admin"` with the required permission in their JWT.

---

## Response Envelope

All API responses follow the same shape:

```json
{
  "success": true | false,
  "message": "Human-readable message",
  "data": { ... }
}
```

Paginated responses include a `meta` object:

```json
{
  "success": true,
  "message": "...",
  "data": [ ... ],
  "meta": { "total": 45, "page": 1, "limit": 20, "pages": 3 }
}
```

---

## Standard HTTP Error Codes

| Code | Meaning |
|---|---|
| 400 | Validation error — check `message` for the specific field |
| 401 | Missing or invalid JWT token |
| 402 | Card declined (Stripe error) |
| 403 | Forbidden — correct role but missing permission or invite |
| 404 | Resource not found |
| 409 | Conflict (e.g. trip already taken) |
| 500 | Internal server error |

---

---

# SECTION 1 — Admin Pricing & Rules

The admin pricing panel is the central control for all rates, fees, windows, and payout rules. These values are referenced by every booking calculation — no hardcoded numbers in the backend.

---

### `GET /api/admin/tiers/settings`

**Auth:** Admin JWT + `view-reports` permission  
**Purpose:** Fetch the complete pricing configuration. Show this in the Admin → Pricing & Rules panel.

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "string",
    "bookingFee": 34,
    "minBookingHours": 3,
    "sameDayNoticeHours": 3,
    "lateNightStart": "00:00",
    "lateNightEnd": "09:00",
    "membershipRate": 89,
    "founder30Rate": 69,
    "membershipMonthlyHours": 5,
    "membershipBillingCycle": "quarterly",
    "venueCommissionPct": 0,
    "affiliateCommissionPct": 0,
    "sameDayMCT": 2,
    "sameDayMinRB": 2,
    "sameDayRBRatio": 0.25,
    "tiers": {
      "S-Level": { "payoutRate": 0.30, "keepsBookingFee": false, "vehicleCostDeduction": 50, "companyCostAbsorption": 100 },
      "Pro":     { "payoutRate": 0.40, "keepsBookingFee": true,  "vehicleCostDeduction": 0,  "companyCostAbsorption": 0 },
      "Diamond": { "payoutRate": 0.40, "keepsBookingFee": true,  "vehicleCostDeduction": 0,  "companyCostAbsorption": 0 }
    }
  }
}
```

---

### `PATCH /api/admin/tiers/settings`

**Auth:** Admin JWT + `manage-users` permission  
**Purpose:** Update any pricing/rules setting. All fields are optional — only send what changed.

**Request Body (all fields optional):**
```typescript
{
  bookingFee?: number;              // e.g. 34 — shown as line item on customer checkout
  minBookingHours?: number;         // e.g. 3 — non-members can't book fewer hours
  sameDayNoticeHours?: number;      // e.g. 3 — non-members must give this many hours notice
  lateNightStart?: string;          // "HH:MM" UTC — e.g. "00:00"
  lateNightEnd?: string;            // "HH:MM" UTC — e.g. "09:00"
  membershipRate?: number;          // e.g. 89 — $/hr for standard members
  founder30Rate?: number;           // e.g. 69 — $/hr for Founder 30 members
  membershipMonthlyHours?: number;  // e.g. 5 — prepaid hrs/month per member
  membershipBillingCycle?: "monthly" | "quarterly" | "annually";
  venueCommissionPct?: number;      // 0–100
  affiliateCommissionPct?: number;  // 0–100
  tiers?: {
    "S-Level"?: {
      payoutRate?: number;            // 0.0–1.0 (e.g. 0.30 = 30%)
      keepsBookingFee?: boolean;
      vehicleCostDeduction?: number;  // $ per trip deducted from driver
      companyCostAbsorption?: number; // $ per trip internal cost
    };
    "Pro"?: { ... };
    "Diamond"?: { ... };
  };
}
```

**Response:** Same shape as GET, returning the full updated settings.

---

---

# SECTION 2 — Booking Flow

The booking flow is: Preview → Start → Pay → Confirm (driver assigned)

---

### `POST /api/bookings/preview`

**Auth:** Customer JWT  
**Purpose:** Calculate the price before creating a booking. Useful for the booking form price breakdown. Does not persist anything.

**Important:** The `bookingFee` ($34 by default) is now included in `regularPrice` and `subscriptionPrice`.

**Request Body:**
```typescript
{
  region: string;            // MongoDB ObjectId of the region
  startDate: string;         // ISO UTC — e.g. "2025-10-15T20:00:00.000Z"
  endDate: string;           // ISO UTC — e.g. "2025-10-15T23:00:00.000Z"
  vehicleTypeId: string;     // MongoDB ObjectId
  quantity?: number;         // 1–5 (default: 1)
  bookingMode?: "multi_day" | "buy_hours";  // default: "multi_day"
  durationHours?: number;    // required when bookingMode = "buy_hours"
  pickupLocation?: string;   // address string (optional for preview)
  dropoffLocation?: string;
  stops?: Stop[];
  addOns?: string[];         // AddOn ObjectId array
  freeRouting?: boolean;
}
```

**Response `data`:**
```json
{
  "hours": 3,
  "regularPrice": 394,
  "subscriptionPrice": 301,
  "total": 394,
  "breakdown": {
    "baseRate": 120,
    "memberRate": 89,
    "hours": 3,
    "qty": 1,
    "bookingFee": 34,
    "addOnsCost": 0,
    "isLateNight": false,
    "lateNightHours": 0,
    "lateNightNote": null,
    "freeHoursUsed": 0,
    "freeHoursLeft": 5,
    "distance": {
      "baseToPickupMiles": 12.5,
      "freeMiles": 20,
      "surchargePerMile": 2,
      "distanceSurcharge": 0
    }
  }
}
```

**Late-night example** (member books 10PM–2AM):
```json
{
  "breakdown": {
    "isLateNight": true,
    "lateNightHours": 2,
    "regularMemberHours": 2,
    "lateNightNote": "2h billed at vehicle rate ($120/hr); 2h at member rate ($89/hr)"
  }
}
```

---

### `POST /api/bookings/start`

**Auth:** Customer JWT  
**Purpose:** Create (persist) the booking. Returns booking ID used for payment.  
**Note:** Member hours are NOT deducted here. They are deducted when the driver confirms.

**Request Body:**
```typescript
{
  region: string;
  startDate: string;         // ISO UTC
  endDate: string;           // ISO UTC
  vehicleTypeId: string;
  quantity?: number;
  bookingMode?: "multi_day" | "buy_hours";
  durationHours?: number;
  pickupLocation: string;    // required
  dropoffLocation?: string;  // required unless freeRouting=true
  stops?: Stop[];
  addOns?: string[];
  freeRouting?: boolean;
  specialNotes?: string;
}

// Stop type:
type Stop = {
  location: string;
  time?: string;           // ISO UTC arrival time at this stop
  dwellMinutes?: number;   // minutes spent at this stop
  timeType?: "arrival" | "pickup";
  notes?: string;
  addOnIds?: string[];
}
```

**Response `data`:**
```json
{
  "booking": {
    "_id": "booking_id_here",
    "status": "Pending",
    "finalPrice": 394,
    "regularPrice": 394,
    "subscriptionPrice": null,
    "paymentStatus": "Unpaid",
    "dates": { "startDate": "...", "endDate": "..." }
  },
  "breakdown": { ... }
}
```

---

### `POST /api/payments/checkout-session`

**Auth:** Customer JWT  
**Purpose:** Create a Stripe-hosted checkout session (redirect to Stripe page). The card used is automatically saved for future bookings.

**Request Body:**
```typescript
{
  bookingId: string;  // MongoDB ObjectId from startBooking
  tip?: number;       // optional tip in dollars (e.g. 20)
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "https://checkout.stripe.com/...",
    "sessionId": "cs_test_xxx"
  }
}
```

**Integration:** Redirect the user to `data.url`. On return, use `GET /api/payments/session/:sessionId` to verify payment.

---

### `GET /api/payments/session/:sessionId`

**Auth:** None required (public reconcile endpoint)  
**Purpose:** Verify payment status from the Stripe success page. Also auto-reconciles if the webhook was late.

**Response:**
```json
{
  "success": true,
  "data": {
    "session": { "id": "cs_xxx", "payment_status": "paid" },
    "booking": { "id": "...", "paymentStatus": "Paid", "finalPrice": 394 }
  }
}
```

---

### `POST /api/payments/charge-saved-card`

**Auth:** Customer JWT  
**Purpose:** Pay for a booking using a saved card. No redirect — instant payment. Use this for returning customers who have a card on file.

**Request Body:**
```typescript
{
  bookingId: string;          // MongoDB ObjectId
  paymentMethodId: string;    // "pm_xxx" from GET /api/payments/saved-cards
  tip?: number;               // optional tip in dollars
}
```

**Response (success):**
```json
{
  "success": true,
  "data": {
    "paymentIntentId": "pi_xxx",
    "amountCharged": 394,
    "status": "succeeded",
    "booking": { "id": "...", "paymentStatus": "Paid" }
  }
}
```

**Response (3D Secure required — 202):**
```json
{
  "success": true,
  "data": {
    "paymentIntentId": "pi_xxx",
    "clientSecret": "pi_xxx_secret_xxx",
    "status": "requires_action"
  }
}
```
> If you get a 202, use `stripe.handleCardAction(clientSecret)` to complete 3D Secure, then the payment proceeds automatically.

---

---

# SECTION 3 — Saved Cards

Cards are stored in Stripe — the backend never stores raw card numbers. The flow uses Stripe.js on the frontend.

### Setup Flow (first time adding a card)

```
1. POST /api/payments/setup-intent          → get clientSecret
2. stripe.confirmCardSetup(clientSecret, { payment_method: { card: cardElement } })
3. Card is saved in Stripe — appears in GET /api/payments/saved-cards
```

---

### `POST /api/payments/setup-intent`

**Auth:** Customer JWT  
**Purpose:** Create a SetupIntent for saving a card without charging it.

**Request Body:** None

**Response:**
```json
{
  "success": true,
  "data": {
    "clientSecret": "seti_xxx_secret_xxx",
    "customerId": "cus_xxx"
  }
}
```

**Stripe.js integration:**
```javascript
const stripe = Stripe('YOUR_PUBLISHABLE_KEY');
const { error, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
  payment_method: {
    card: cardElement,  // Stripe CardElement mounted in the UI
    billing_details: { name: 'Customer Name' }
  }
});
if (!error) {
  // Card saved. setupIntent.payment_method is the new paymentMethodId.
  // Optionally: POST /api/payments/set-default-card with that pm ID.
}
```

---

### `GET /api/payments/saved-cards`

**Auth:** Customer JWT

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "pm_xxx",
      "brand": "visa",
      "last4": "4242",
      "expMonth": 12,
      "expYear": 2027,
      "isDefault": true
    }
  ]
}
```

---

### `POST /api/payments/set-default-card`

**Auth:** Customer JWT

**Request Body:**
```typescript
{ paymentMethodId: string; }  // "pm_xxx"
```

**Response:**
```json
{ "success": true, "data": { "paymentMethodId": "pm_xxx" } }
```

---

### `DELETE /api/payments/saved-cards/:paymentMethodId`

**Auth:** Customer JWT  
**URL param:** `paymentMethodId` — e.g. `/api/payments/saved-cards/pm_xxx`

**Response:**
```json
{ "success": true, "message": "Card removed successfully" }
```

---

---

# SECTION 4 — Membership

---

### `GET /api/subscriptions/benefits`

**Auth:** None (public)  
**Purpose:** Show plan details on the marketing/signup page.

**Response:**
```json
{
  "success": true,
  "data": {
    "standard": {
      "ratePerHour": 89,
      "monthlyHours": 5,
      "quarterlyHours": 15,
      "monthlyCharge": 445,
      "quarterlyCharge": 1335,
      "description": "5 prepaid hrs/month at $89/hr — any vehicle type."
    },
    "founder30": {
      "ratePerHour": 69,
      "monthlyHours": 5,
      "quarterlyHours": 15,
      "monthlyCharge": 345,
      "quarterlyCharge": 1035,
      "inviteOnly": true,
      "description": "Private invite-only membership. 5 prepaid hrs/month at $69/hr."
    }
  }
}
```

---

### `POST /api/subscriptions/checkout`

**Auth:** Customer JWT  
**Purpose:** Create a Stripe Checkout redirect to sign up for membership. Card used in checkout is automatically saved.

**Request Body:**
```typescript
{
  plan?: "standard" | "founder30";  // default: "standard"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "https://checkout.stripe.com/...",
    "sessionId": "cs_xxx",
    "plan": "standard",
    "ratePerHour": 89,
    "quarterlyCharge": 1335
  }
}
```

> **Note:** `founder30` plan returns 403 if the user hasn't been invited by an admin.

---

### `POST /api/subscriptions/charge-saved-card`

**Auth:** Customer JWT  
**Purpose:** Pay for membership directly with a saved card — no redirect needed.

**Request Body:**
```typescript
{
  plan?: "standard" | "founder30";
  paymentMethodId: string;  // "pm_xxx"
}
```

**Response (success):**
```json
{
  "success": true,
  "data": {
    "user": { ... },
    "subscription": {
      "plan": "standard",
      "ratePerHour": 89,
      "monthlyHours": 5,
      "quarterlyHours": 15,
      "quarterlyCharge": 1335,
      "nextBillingDate": "2025-10-01T00:00:00.000Z"
    }
  }
}
```

---

### `GET /api/subscriptions/status`

**Auth:** Customer JWT  
**Purpose:** Show membership status, hours used/remaining, and overage info.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "subscriber",
    "plan": "standard",
    "isFounder30": false,
    "ratePerHour": 89,
    "quarterlyCharge": 1335,
    "currentQuarter": {
      "totalHoursIncluded": 15,
      "hoursUsed": 7,
      "hoursRemaining": 8,
      "overageHours": 0,
      "overageCharge": 0
    },
    "nextBillingDate": "2025-10-01T00:00:00.000Z",
    "savedCardLast4": "4242"
  }
}
```

---

### `POST /api/subscriptions/cancel`

**Auth:** Customer JWT

**Request Body:**
```typescript
{ reason?: string; }
```

**Response:**
```json
{
  "success": true,
  "message": "Your membership has been cancelled. Remaining hours are available until your current billing period ends."
}
```

---

### `POST /api/subscriptions/process-payment`

**Auth:** Customer JWT  
**Purpose:** Call this from the Stripe success page (after Stripe Checkout redirect) to activate the subscription if the webhook hasn't fired yet.

**Request Body:**
```typescript
{ sessionId: string; }  // from URL param on success page
```

---

---

# SECTION 5 — Admin Membership Management

---

### `GET /api/admin/memberships`

**Auth:** Admin JWT + `view-reports`  
**Query params:** `plan=standard|founder30|all`, `page`, `limit`

**Response `data` array:**
```json
[
  {
    "userId": "...",
    "name": "John Doe",
    "email": "john@example.com",
    "plan": "standard",
    "ratePerHour": 89,
    "quarterlyHours": 15,
    "hoursUsed": 7,
    "hoursRemaining": 8,
    "overageHours": 0,
    "overageCharge": 0,
    "nextBillingDate": "2025-10-01T00:00:00.000Z",
    "savedCardLast4": "4242"
  }
]
```

---

### `PATCH /api/admin/memberships/invite-founder30/:userId`

**Auth:** Admin JWT + `manage-users`  
**URL param:** `:userId` — customer's MongoDB ObjectId

**Request Body:**
```typescript
{ invited: boolean; }  // true = grant, false = revoke
```

**Response:**
```json
{
  "success": true,
  "message": "Founder 30 access granted",
  "data": {
    "userId": "...",
    "name": "Jane Smith",
    "founder30Invited": true,
    "subscriptionStatus": "non-subscriber"
  }
}
```

---

### `POST /api/admin/memberships/:userId/charge-overage`

**Auth:** Admin JWT + `manage-bookings`

**Request Body:**
```typescript
{ overageHours: number; }  // e.g. 2.5
```

**Response:**
```json
{
  "success": true,
  "data": {
    "overageHours": 2.5,
    "amountCharged": 222.5,
    "paymentIntentId": "pi_xxx"
  }
}
```

---

### `PATCH /api/admin/memberships/:userId/balance`

**Auth:** Admin JWT + `manage-users`  
**Purpose:** Manually correct a member's hour usage for a specific month.

**Request Body:**
```typescript
{
  yearMonth: string;         // "YYYY-MM" e.g. "2025-10"
  totalHoursUsed: number;    // new value (overwrites existing)
}
```

---

---

# SECTION 6 — Stripe Publishable Key Note

The frontend needs the **Stripe Publishable Key** to use Stripe.js elements.

Install Stripe.js:
```
npm install @stripe/stripe-js
```

Initialize:
```javascript
import { loadStripe } from '@stripe/stripe-js';
const stripe = await loadStripe('pk_test_YOUR_PUBLISHABLE_KEY');
```

The publishable key is safe to include in frontend code — it only allows collecting card details, not making charges. Keep the **secret key** only on the server.

---

# SECTION 7 — How Saved Cards Work End-to-End

```
First booking (Stripe Checkout redirect):
  1. Customer books → POST /api/bookings/start → gets bookingId
  2. Customer pays  → POST /api/payments/checkout-session → redirect to Stripe
  3. Customer completes checkout → card is automatically saved by Stripe
  4. Webhook fires (checkout.session.completed) → card attached to customer profile
  5. Future bookings: GET /api/payments/saved-cards shows "Visa ****4242"

Subsequent bookings (one-tap with saved card):
  1. Customer books → POST /api/bookings/start → gets bookingId
  2. Customer selects saved card → POST /api/payments/charge-saved-card
  3. Payment succeeds immediately — no redirect

Adding a card without a booking (from payment settings page):
  1. POST /api/payments/setup-intent → get clientSecret
  2. stripe.confirmCardSetup(clientSecret, { card: cardElement })
  3. Card appears in GET /api/payments/saved-cards
```

---

# SECTION 8 — Important Headers Summary

| Header | Value | When Required |
|---|---|---|
| `Authorization` | `Bearer <jwt_token>` | All protected routes |
| `Content-Type` | `application/json` | All POST/PATCH/PUT requests |

No other special headers needed for normal API calls.

---

# SECTION 9 — Webhook Setup Note

The backend has a Stripe webhook handler at:
```
POST /api/payments/webhook
```

This endpoint must be registered in the Stripe Dashboard → Webhooks with:
- **Events to send:** `checkout.session.completed`, `account.updated`
- **Endpoint URL:** `https://your-backend-domain.com/api/payments/webhook`
- **Signing secret:** goes into `STRIPE_WEBHOOK_SECRET` env var on the server

The webhook handler:
- Marks bookings as `Paid`
- Activates memberships
- Attaches the card used in checkout to the customer's saved cards

> During local development, use [Stripe CLI](https://stripe.com/docs/stripe-cli): `stripe listen --forward-to localhost:5000/api/payments/webhook`
