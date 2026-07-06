import type { AdminPermission } from "@/lib/admin-access";
import { withNgrokHeaders } from "@/lib/ngrok-headers";
import type {
  AdminPartner,
  ApprovePartnerApplicationBody,
  PartnerApplication,
  PartnerUpdateRequestRecord,
  UpdatePartnerBody,
} from "@/app/components/admin/partners/partner-types";
import {
  normalizeAdminPartner,
  normalizeApplication,
} from "@/app/components/admin/partners/partner-types";
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

function getAuthHeaders(): HeadersInit {
  // On the server we can't access document.cookie — token is read from cookies() in Server Components.
  // This helper is used only in Client Components where document is available.
  const token =
    typeof document !== "undefined"
      ? document.cookie
          .split("; ")
          .find((c) => c.startsWith("auth_token="))
          ?.split("=")[1]
      : undefined;

  return withNgrokHeaders({
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  });
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ApiAdmin {
  id: string;
  name: string;
  email: string;
  phone: string;
  active: boolean;
  permissions: AdminPermission[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminsPage {
  admins: ApiAdmin[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface DashboardStat {
  value: number;
  changePercent?: number;
  label: string;
}

export interface DashboardStats {
  activeDrivers: DashboardStat;
  totalTrips: DashboardStat;
  revenue: DashboardStat;
  growthRate: {
    value: number;
    label: string;
  };
}

export interface DashboardRevenuePoint {
  month: string;
  revenue: number;
}

export interface DashboardRecentTrip {
  tripId: string;
  driver: string;
  route: string;
  fare: number;
  status: string;
}

export interface DashboardTopDriver {
  rank: number;
  name: string;
  trips: number;
  earnings: number;
  rating: number;
}

export interface AdminDashboardData {
  stats: DashboardStats;
  revenueOverview: DashboardRevenuePoint[];
  recentTrips: DashboardRecentTrip[];
  topDrivers: DashboardTopDriver[];
}

function toNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function toString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function normalizeDashboardData(raw: unknown): AdminDashboardData {
  const data = raw as {
    stats?: {
      activeDrivers?: { value?: unknown; changePercent?: unknown; label?: unknown };
      totalTrips?: { value?: unknown; changePercent?: unknown; label?: unknown };
      revenue?: { value?: unknown; changePercent?: unknown; label?: unknown };
      growthRate?: { value?: unknown; label?: unknown };
    };
    revenueOverview?: Array<{ month?: unknown; revenue?: unknown }>;
    recentTrips?: Array<{
      tripId?: unknown;
      driver?: unknown;
      route?: unknown;
      fare?: unknown;
      status?: unknown;
    }>;
    topDrivers?: Array<{
      rank?: unknown;
      name?: unknown;
      trips?: unknown;
      earnings?: unknown;
      rating?: unknown;
    }>;
  };

  return {
    stats: {
      activeDrivers: {
        value: toNumber(data.stats?.activeDrivers?.value),
        changePercent: toNumber(data.stats?.activeDrivers?.changePercent),
        label: toString(data.stats?.activeDrivers?.label, "from last week"),
      },
      totalTrips: {
        value: toNumber(data.stats?.totalTrips?.value),
        changePercent: toNumber(data.stats?.totalTrips?.changePercent),
        label: toString(data.stats?.totalTrips?.label, "from yesterday"),
      },
      revenue: {
        value: toNumber(data.stats?.revenue?.value),
        changePercent: toNumber(data.stats?.revenue?.changePercent),
        label: toString(data.stats?.revenue?.label, "from last month"),
      },
      growthRate: {
        value: toNumber(data.stats?.growthRate?.value),
        label: toString(data.stats?.growthRate?.label, "Monthly growth"),
      },
    },
    revenueOverview: Array.isArray(data.revenueOverview)
      ? data.revenueOverview.map((item) => ({
          month: toString(item.month),
          revenue: toNumber(item.revenue),
        }))
      : [],
    recentTrips: Array.isArray(data.recentTrips)
      ? data.recentTrips.map((trip) => ({
          tripId: toString(trip.tripId),
          driver: toString(trip.driver),
          route: toString(trip.route),
          fare: toNumber(trip.fare),
          status: toString(trip.status, "Completed"),
        }))
      : [],
    topDrivers: Array.isArray(data.topDrivers)
      ? data.topDrivers.map((driver) => ({
          rank: toNumber(driver.rank),
          name: toString(driver.name),
          trips: toNumber(driver.trips),
          earnings: toNumber(driver.earnings),
          rating: toNumber(driver.rating),
        }))
      : [],
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function handleResponse<T>(res: Response): Promise<T> {
  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json.message ?? `Request failed (${res.status})`);
  }
  return (json.data ?? json) as T;
}

// ─── API functions ────────────────────────────────────────────────────────────

/** GET /api/admin/admins — server-safe (pass token explicitly) */
export async function fetchAdmins(
  token: string,
  page = 1,
  limit = 20,
): Promise<AdminsPage> {
  const res = await fetch(
    `${BASE_URL}/api/admin/admins?page=${page}&limit=${limit}`,
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    },
  );
  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json.message ?? "Failed to fetch admins");
  }

  const pagination =
    json.pagination ??
    json.meta?.pagination ?? {
      page,
      limit,
      total: (json.data as ApiAdmin[]).length,
      totalPages: 1,
    };

  return {
    admins: json.data as ApiAdmin[],
    pagination,
  };
}

/** POST /api/admin/admins */
export async function createAdmin(body: {
  name: string;
  email: string;
  phone: string;
  password: string;
  permissions: AdminPermission[];
}): Promise<ApiAdmin> {
  const res = await fetch(`${BASE_URL}/api/admin/admins`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  return handleResponse<ApiAdmin>(res);
}

/** PUT /api/admin/admins/:id */
export async function updateAdmin(
  id: string,
  body: Partial<{
    name: string;
    email: string;
    phone: string;
    password: string;
    permissions: AdminPermission[];
    active: boolean;
  }>,
): Promise<ApiAdmin> {
  const res = await fetch(`${BASE_URL}/api/admin/admins/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  return handleResponse<ApiAdmin>(res);
}

/** DELETE /api/admin/admins/:id */
export async function deleteAdmin(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/admin/admins/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  await handleResponse<unknown>(res);
}

/** GET /api/admin/dashboard — server-safe (pass token explicitly) */
export async function fetchAdminDashboard(
  token: string,
): Promise<AdminDashboardData> {
  const res = await fetch(`${BASE_URL}/api/admin/dashboard`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  const data = await handleResponse<unknown>(res);
  return normalizeDashboardData(data);
}

// ─── Booking Types ────────────────────────────────────────────────────────────

export interface BookingStats {
  totalTrips: number;
  pending: number;
  confirmed: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  expired: number;
  totalValue: number;
  unassigned: number;
}

export interface ApiBookingUser {
  _id: string;
  name: string;
  email: string;
  phone: string;
}

export interface ApiBookingRegion {
  _id: string;
  name: string;
  code: string;
}

export interface ApiBookingVehicleType {
  _id: string;
  name: string;
  hourlyPrice: number;
}

export interface ApiBookingAddon {
  _id: string;
  name: string;
  price: number;
  type: string;
}

export type ApiBookingStatus =
  | "Pending"
  | "Confirmed"
  | "In Progress"
  | "Completed"
  | "Cancelled"
  | "Expired";

export type ApiPaymentStatus = "Unpaid" | "Paid" | "Refunded" | "Failed";

export type ApiBookingMode = "multi_day" | "buy_hours";

export interface ApiBooking {
  _id: string;
  user: ApiBookingUser | null;
  region: ApiBookingRegion;
  bookingMode: ApiBookingMode;
  dates: { startDate: string; endDate: string };
  vehicleType: ApiBookingVehicleType;
  quantity: number;
  pickupLocation: string;
  dropoffLocation: string;
  assignedDriver: { _id: string; name: string } | null;
  addOns: ApiBookingAddon[];
  regularPrice: number;
  finalPrice: number;
  savings: number;
  status: ApiBookingStatus;
  paymentStatus: ApiPaymentStatus;
  rating: number | null;
  tip: number;
  createdAt: string;
}

export interface BookingsPage {
  bookings: ApiBooking[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface BookingsParams {
  status?: ApiBookingStatus;
  bookingMode?: ApiBookingMode;
  paymentStatus?: ApiPaymentStatus;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  order?: "asc" | "desc";
}

// ─── Booking API functions ────────────────────────────────────────────────────

function buildBookingsQuery(params: BookingsParams): string {
  const qs = new URLSearchParams();
  if (params.status) qs.set("status", params.status);
  if (params.bookingMode) qs.set("bookingMode", params.bookingMode);
  if (params.paymentStatus) qs.set("paymentStatus", params.paymentStatus);
  if (params.search) qs.set("search", params.search);
  if (params.page != null) qs.set("page", String(params.page));
  if (params.limit != null) qs.set("limit", String(params.limit));
  if (params.sortBy) qs.set("sortBy", params.sortBy);
  if (params.order) qs.set("order", params.order);
  return qs.toString();
}

function parseBookingsResponse(
  json: {
    data: ApiBooking[];
    meta?: { pagination?: BookingsPage["pagination"] };
  },
  params: BookingsParams,
): BookingsPage {
  return {
    bookings: json.data,
    pagination: json.meta?.pagination ?? {
      page: params.page ?? 1,
      limit: params.limit ?? 10,
      total: json.data.length,
      totalPages: 1,
    },
  };
}

/** GET /api/bookings/stats — server-safe (pass token explicitly) */
export async function fetchBookingStats(token: string): Promise<BookingStats> {
  const res = await fetch(`${BASE_URL}/api/bookings/stats`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });
  return handleResponse<BookingStats>(res);
}

/** GET /api/bookings — server-safe (pass token explicitly) */
export async function fetchBookings(
  token: string,
  params: BookingsParams = {},
): Promise<BookingsPage> {
  const qs = buildBookingsQuery(params);
  const url = `${BASE_URL}/api/bookings${qs ? `?${qs}` : ""}`;
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json.message ?? "Failed to fetch bookings");
  }
  return parseBookingsResponse(json, params);
}

/** GET /api/bookings — client-safe (reads token from cookie) */
export async function fetchBookingsClient(
  params: BookingsParams = {},
): Promise<BookingsPage> {
  const qs = buildBookingsQuery(params);
  const url = `${BASE_URL}/api/bookings${qs ? `?${qs}` : ""}`;
  const res = await fetch(url, {
    headers: getAuthHeaders(),
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json.message ?? "Failed to fetch bookings");
  }
  return parseBookingsResponse(json, params);
}

// ─── Driver dispatch ──────────────────────────────────────────────────────────

export interface EligibleDriver {
  _id: string;
  name: string;
  email: string;
  phone: string;
  tier: string | null;
  rating: number;
  eligible: boolean;
  reason: string | null;
}

export interface EligibleDriversResult {
  sameDay: boolean;
  membershipTrip: boolean;
  drivers: EligibleDriver[];
}

/** GET /api/admin/bookings/:id/eligible-drivers — client-safe */
export async function fetchEligibleDrivers(
  bookingId: string,
): Promise<EligibleDriversResult> {
  const res = await fetch(
    `${BASE_URL}/api/admin/bookings/${bookingId}/eligible-drivers`,
    { headers: getAuthHeaders(), cache: "no-store" },
  );
  return handleResponse<EligibleDriversResult>(res);
}

/** PATCH /api/admin/assignDriver — client-safe */
export async function assignDriverToBooking(
  bookingId: string,
  driverId: string,
): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/admin/assignDriver`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify({ bookingId, driverId }),
  });
  await handleResponse<void>(res);
}

export interface RedispatchResult {
  stage: number;
  tiers: string[];
  driversNotified: number;
}

/**
 * POST /api/admin/bookings/:id/redispatch — client-safe.
 * Re-runs the staged auto-dispatch offer flow on a Pending booking with no
 * driver (e.g. after a driver cancellation or stalled stage-2 offer).
 */
export async function redispatchBooking(
  bookingId: string,
): Promise<RedispatchResult> {
  const res = await fetch(
    `${BASE_URL}/api/admin/bookings/${bookingId}/redispatch`,
    {
      method: "POST",
      headers: getAuthHeaders(),
    },
  );
  return handleResponse<RedispatchResult>(res);
}

/**
 * PATCH /api/admin/bookings/:id/unassign — client-safe.
 * Removes the currently-assigned driver and resets the booking to Pending.
 * Admin can then re-dispatch or manually assign someone else.
 */
export async function unassignDriverFromBooking(
  bookingId: string,
  reason?: string,
): Promise<void> {
  const res = await fetch(
    `${BASE_URL}/api/admin/bookings/${bookingId}/unassign`,
    {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify(reason ? { reason } : {}),
    },
  );
  await handleResponse<void>(res);
}

// ─── Licensing Types ──────────────────────────────────────────────────────────

export type ApiLicenseStatus = "Pending" | "Approved" | "Rejected" | "Expired";
export type ApiBackgroundStatus = "Pending" | "Verified" | "Failed";
export type ApiDriverTier = "S-Level" | "Pro" | "Diamond";

export interface ApiLicensingDriver {
  _id: string;
  name: string;
  email: string;
  phone: string;
  registeredAt: string;
  license: {
    number: string | null;
    expiry: string | null;
    status: ApiLicenseStatus;
    hasForHireLicense: boolean;
  };
  background: {
    verified: boolean;
    status: ApiBackgroundStatus;
    checkrStatus: string | null;
  };
  tier: ApiDriverTier;
}

export interface LicensingStats {
  verified: number;
  pending: number;
  total: number;
}

export interface LicensingPage {
  drivers: ApiLicensingDriver[];
  stats: LicensingStats;
  total: number;
  page: number;
  limit: number;
  pages: number;
}

// ─── Licensing API functions ──────────────────────────────────────────────────

/** GET /api/admin/drivers/licensing — server-safe */
export async function fetchLicensing(
  token: string,
  params: { search?: string; page?: number; limit?: number } = {},
): Promise<LicensingPage> {
  const qs = new URLSearchParams();
  if (params.search) qs.set("search", params.search);
  if (params.page != null) qs.set("page", String(params.page));
  if (params.limit != null) qs.set("limit", String(params.limit));
  const url = `${BASE_URL}/api/admin/drivers/licensing${qs.toString() ? `?${qs}` : ""}`;
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json.message ?? "Failed to fetch licensing data");
  }
  return {
    drivers: json.data as ApiLicensingDriver[],
    stats: json.meta?.stats ?? { verified: 0, pending: 0, total: 0 },
    total: json.meta?.total ?? 0,
    page: json.meta?.page ?? 1,
    limit: json.meta?.limit ?? 20,
    pages: json.meta?.pages ?? 1,
  };
}

/** GET /api/admin/drivers/licensing — client-safe */
export async function fetchLicensingClient(
  params: { search?: string; page?: number; limit?: number } = {},
): Promise<LicensingPage> {
  const qs = new URLSearchParams();
  if (params.search) qs.set("search", params.search);
  if (params.page != null) qs.set("page", String(params.page));
  if (params.limit != null) qs.set("limit", String(params.limit));
  const url = `${BASE_URL}/api/admin/drivers/licensing${qs.toString() ? `?${qs}` : ""}`;
  const res = await fetch(url, {
    headers: getAuthHeaders(),
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json.message ?? "Failed to fetch licensing data");
  }
  return {
    drivers: json.data as ApiLicensingDriver[],
    stats: json.meta?.stats ?? { verified: 0, pending: 0, total: 0 },
    total: json.meta?.total ?? 0,
    page: json.meta?.page ?? 1,
    limit: json.meta?.limit ?? 20,
    pages: json.meta?.pages ?? 1,
  };
}

// ─── Tier Performance Types ───────────────────────────────────────────────────

export interface ApiTierDriver {
  _id: string;
  name: string;
  tier: ApiDriverTier;
  rating: number;
  totalTrips: number;
  totalEarnings: number;
}

export interface TierCounts {
  "S-Level": number;
  Pro: number;
  Diamond: number;
}

export interface TierPerformancePage {
  drivers: ApiTierDriver[];
  tierCounts: TierCounts;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface TierPerformanceParams {
  tier?: ApiDriverTier;
  sortBy?: "totalEarnings" | "totalTrips" | "rating";
  order?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface TierPolicyEntry {
  payoutRate: number;
  keepsBookingFee: boolean;
  vehicleCostDeduction: number;
  companyCostAbsorption: number;
}

export interface TierSettings {
  _id: string;
  bookingFee: number;
  tiers: {
    "S-Level": TierPolicyEntry;
    Pro: TierPolicyEntry;
    Diamond: TierPolicyEntry;
  };
  createdAt: string;
  updatedAt: string;
}

// ─── Tier API functions ───────────────────────────────────────────────────────

function buildTierPerformanceQuery(params: TierPerformanceParams): string {
  const qs = new URLSearchParams();
  if (params.tier) qs.set("tier", params.tier);
  if (params.sortBy) qs.set("sortBy", params.sortBy);
  if (params.order) qs.set("order", params.order);
  if (params.page != null) qs.set("page", String(params.page));
  if (params.limit != null) qs.set("limit", String(params.limit));
  return qs.toString();
}

function parseTierPerformanceResponse(json: {
  data: ApiTierDriver[];
  meta?: {
    tierCounts?: TierCounts;
    total?: number;
    page?: number;
    limit?: number;
    pages?: number;
  };
}): TierPerformancePage {
  return {
    drivers: json.data,
    tierCounts: json.meta?.tierCounts ?? { "S-Level": 0, Pro: 0, Diamond: 0 },
    pagination: {
      page: json.meta?.page ?? 1,
      limit: json.meta?.limit ?? 20,
      total: json.meta?.total ?? 0,
      totalPages: json.meta?.pages ?? 1,
    },
  };
}

/** GET /api/admin/tiers/performance — server-safe */
export async function fetchTierPerformance(
  token: string,
  params: TierPerformanceParams = {},
): Promise<TierPerformancePage> {
  const qs = buildTierPerformanceQuery(params);
  const url = `${BASE_URL}/api/admin/tiers/performance${qs ? `?${qs}` : ""}`;
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json.message ?? "Failed to fetch tier performance");
  }
  return parseTierPerformanceResponse(json);
}

/** GET /api/admin/tiers/performance — client-safe */
export async function fetchTierPerformanceClient(
  params: TierPerformanceParams = {},
): Promise<TierPerformancePage> {
  const qs = buildTierPerformanceQuery(params);
  const url = `${BASE_URL}/api/admin/tiers/performance${qs ? `?${qs}` : ""}`;
  const res = await fetch(url, {
    headers: getAuthHeaders(),
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json.message ?? "Failed to fetch tier performance");
  }
  return parseTierPerformanceResponse(json);
}

/** GET /api/admin/tiers/settings — server-safe */
export async function fetchTierSettings(token: string): Promise<TierSettings> {
  const res = await fetch(`${BASE_URL}/api/admin/tiers/settings`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });
  return handleResponse<TierSettings>(res);
}

/** GET /api/admin/tiers/settings — client-safe */
export async function fetchTierSettingsClient(): Promise<TierSettings> {
  const res = await fetch(`${BASE_URL}/api/admin/tiers/settings`, {
    headers: getAuthHeaders(),
    cache: "no-store",
  });
  return handleResponse<TierSettings>(res);
}

/** PATCH /api/admin/tiers/settings — client-safe */
export async function updateTierSettingsClient(body: {
  bookingFee?: number;
  tiers?: Partial<TierSettings["tiers"]>;
}): Promise<TierSettings> {
  const res = await fetch(`${BASE_URL}/api/admin/tiers/settings`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  return handleResponse<TierSettings>(res);
}

// ─── Vehicle Type Types ───────────────────────────────────────────────────────

export interface ApiVehicleType {
  _id: string;
  name: string;
  description: string;
  hourlyPrice: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Vehicle Type API functions ───────────────────────────────────────────────

/** GET /api/vehicle-types/ — server-safe */
export async function fetchVehicleTypes(
  token: string,
): Promise<ApiVehicleType[]> {
  const res = await fetch(`${BASE_URL}/api/vehicle-types/`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok || json.success === false)
    throw new Error(json.message ?? "Failed to fetch vehicle types");
  return json.data as ApiVehicleType[];
}

/** POST /api/vehicle-types/add — client-safe */
export async function createVehicleTypeClient(body: {
  name: string;
  description: string;
  hourlyPrice: number;
}): Promise<ApiVehicleType> {
  const res = await fetch(`${BASE_URL}/api/vehicle-types/add`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  return handleResponse<ApiVehicleType>(res);
}

/** PUT /api/vehicle-types/update/:id — client-safe */
export async function updateVehicleTypeClient(
  id: string,
  body: Partial<{ name: string; description: string; hourlyPrice: number }>,
): Promise<ApiVehicleType> {
  const res = await fetch(`${BASE_URL}/api/vehicle-types/update/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  return handleResponse<ApiVehicleType>(res);
}

/** DELETE /api/vehicle-types/delete/:id — client-safe */
export async function deleteVehicleTypeClient(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/vehicle-types/delete/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  await handleResponse<unknown>(res);
}

// ─── Addon Types ──────────────────────────────────────────────────────────────

export interface ApiAddon {
  _id: string;
  name: string;
  description: string;
  type: "free" | "paid";
  price: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiAddonsResponse {
  free: ApiAddon[];
  paid: ApiAddon[];
}

// ─── Addon API functions ──────────────────────────────────────────────────────

/** GET /api/addons/ — server-safe */
export async function fetchAddons(token: string): Promise<ApiAddon[]> {
  const res = await fetch(`${BASE_URL}/api/addons/`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok || json.success === false)
    throw new Error(json.message ?? "Failed to fetch add-ons");
  const data = json.data as ApiAddonsResponse;
  return [...data.free, ...data.paid];
}

/** POST /api/addons/add — client-safe */
export async function createAddonClient(body: {
  name: string;
  description: string;
  type: "free" | "paid";
  price?: number;
}): Promise<ApiAddon> {
  const res = await fetch(`${BASE_URL}/api/addons/add`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  return handleResponse<ApiAddon>(res);
}

/** PUT /api/addons/update/:id — client-safe */
export async function updateAddonClient(
  id: string,
  body: Partial<{
    name: string;
    description: string;
    type: "free" | "paid";
    price: number;
  }>,
): Promise<ApiAddon> {
  const res = await fetch(`${BASE_URL}/api/addons/update/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  return handleResponse<ApiAddon>(res);
}

/** DELETE /api/addons/delete/:id — client-safe */
export async function deleteAddonClient(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/addons/delete/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  await handleResponse<unknown>(res);
}

// ─── Region Types ─────────────────────────────────────────────────────────────

export interface RegionSameDay {
  aqd: number;
  rb: number;
  cl: number;
  mct: number;
  formulaPass: boolean;
  manualBlock: boolean;
  available: boolean;
}

export interface ApiRegion {
  _id: string;
  name: string;
  code: string;
  isActive: boolean;
  sameDayManualBlock: boolean;
  sameDay?: RegionSameDay;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Region API functions ─────────────────────────────────────────────────────

/** GET /api/regions/all — server-safe (admin: all regions incl. inactive) */
export async function fetchAllRegions(token: string): Promise<ApiRegion[]> {
  const res = await fetch(`${BASE_URL}/api/regions/all`, {
    headers: withNgrokHeaders({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok || json.success === false)
    throw new Error(json.message ?? "Failed to fetch regions");
  return json.data as ApiRegion[];
}

/** GET /api/regions/all — client-safe (reads token from cookie). */
export async function fetchAllRegionsClient(): Promise<ApiRegion[]> {
  const res = await fetch(`${BASE_URL}/api/regions/all`, {
    headers: getAuthHeaders(),
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok || json.success === false)
    throw new Error(json.message ?? "Failed to fetch regions");
  return json.data as ApiRegion[];
}

/** POST /api/regions/ — client-safe */
export async function createRegionClient(body: {
  name: string;
  code: string;
}): Promise<ApiRegion> {
  const res = await fetch(`${BASE_URL}/api/regions/`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  return handleResponse<ApiRegion>(res);
}

/** PUT /api/regions/:id — client-safe */
export async function updateRegionClient(
  id: string,
  body: Partial<{ name: string; code: string; isActive: boolean; sameDayManualBlock: boolean }>,
): Promise<ApiRegion> {
  const res = await fetch(`${BASE_URL}/api/regions/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  return handleResponse<ApiRegion>(res);
}

/** DELETE /api/regions/:id — client-safe */
export async function deleteRegionClient(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/regions/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  await handleResponse<unknown>(res);
}

// ─── Sidebar Stats ────────────────────────────────────────────────────────────

export interface ApiSidebarStats {
  pendingBookings: number;
  pendingDriverApprovals: number;
}

/** GET /api/admin/sidebar-stats — server-safe */
export async function fetchSidebarStats(
  token: string,
): Promise<ApiSidebarStats> {
  const res = await fetch(`${BASE_URL}/api/admin/sidebar-stats`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok || json.success === false)
    throw new Error(json.message ?? "Failed to fetch sidebar stats");
  return json.data as ApiSidebarStats;
}

// ─── Partner Admin API ────────────────────────────────────────────────────────

export type PartnerApplicationsPage = {
  applications: PartnerApplication[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type AdminPartnersPage = {
  partners: AdminPartner[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

function parsePaginated<T>(
  json: {
    data?: unknown[];
    meta?: { pagination?: PartnerApplicationsPage["pagination"] };
    pagination?: PartnerApplicationsPage["pagination"];
  },
  page: number,
  limit: number,
  mapItem: (raw: Record<string, unknown>) => T,
): { items: T[]; pagination: PartnerApplicationsPage["pagination"] } {
  const rows = Array.isArray(json.data) ? json.data : [];
  const pagination =
    json.meta?.pagination ??
    json.pagination ?? {
      page,
      limit,
      total: rows.length,
      totalPages: 1,
    };

  return {
    items: rows.map((row) => mapItem(row as Record<string, unknown>)),
    pagination,
  };
}

/** GET /api/admin/partners/applications — server-safe */
export async function fetchPartnerApplications(
  token: string,
  params?: { page?: number; limit?: number; status?: string },
): Promise<PartnerApplicationsPage> {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 20;
  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (params?.status) query.set("status", params.status);

  const res = await fetch(`${BASE_URL}/api/admin/partners/applications?${query}`, {
    headers: withNgrokHeaders({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json.message ?? "Failed to fetch partner applications");
  }

  const parsed = parsePaginated(json, page, limit, normalizeApplication);
  return { applications: parsed.items, pagination: parsed.pagination };
}

/** GET /api/admin/partners/applications — client-safe */
export async function fetchPartnerApplicationsClient(
  params?: { page?: number; limit?: number; status?: string },
): Promise<PartnerApplicationsPage> {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 20;
  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (params?.status) query.set("status", params.status);

  const res = await fetch(`${BASE_URL}/api/admin/partners/applications?${query}`, {
    headers: getAuthHeaders(),
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json.message ?? "Failed to fetch partner applications");
  }

  const parsed = parsePaginated(json, page, limit, normalizeApplication);
  return { applications: parsed.items, pagination: parsed.pagination };
}

/** PATCH /api/admin/partners/applications/:id/approve — client-safe */
export async function approvePartnerApplicationClient(
  id: string,
  body: ApprovePartnerApplicationBody = {},
): Promise<{ partner: AdminPartner; application: PartnerApplication }> {
  const res = await fetch(`${BASE_URL}/api/admin/partners/applications/${id}/approve`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json.message ?? "Failed to approve application");
  }

  const data = json.data as {
    partner?: Record<string, unknown>;
    application?: Record<string, unknown>;
  };

  return {
    partner: normalizeAdminPartner(data.partner ?? {}),
    application: normalizeApplication(data.application ?? {}),
  };
}

/** PATCH /api/admin/partners/applications/:id/reject — client-safe */
export async function rejectPartnerApplicationClient(
  id: string,
  reason?: string,
): Promise<PartnerApplication> {
  const res = await fetch(`${BASE_URL}/api/admin/partners/applications/${id}/reject`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(reason ? { reason } : {}),
  });
  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json.message ?? "Failed to reject application");
  }

  return normalizeApplication((json.data ?? {}) as Record<string, unknown>);
}

/** GET /api/admin/partners — server-safe */
export async function fetchAdminPartners(
  token: string,
  params?: { page?: number; limit?: number; status?: string; partnerType?: string },
): Promise<AdminPartnersPage> {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 20;
  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (params?.status) query.set("status", params.status);
  if (params?.partnerType) query.set("partnerType", params.partnerType);

  const res = await fetch(`${BASE_URL}/api/admin/partners?${query}`, {
    headers: withNgrokHeaders({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json.message ?? "Failed to fetch partners");
  }

  const parsed = parsePaginated(json, page, limit, normalizeAdminPartner);
  return { partners: parsed.items, pagination: parsed.pagination };
}

/** GET /api/admin/partners — client-safe */
export async function fetchAdminPartnersClient(
  params?: { page?: number; limit?: number; status?: string; partnerType?: string },
): Promise<AdminPartnersPage> {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 20;
  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (params?.status) query.set("status", params.status);
  if (params?.partnerType) query.set("partnerType", params.partnerType);

  const res = await fetch(`${BASE_URL}/api/admin/partners?${query}`, {
    headers: getAuthHeaders(),
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json.message ?? "Failed to fetch partners");
  }

  const parsed = parsePaginated(json, page, limit, normalizeAdminPartner);
  return { partners: parsed.items, pagination: parsed.pagination };
}

/** PATCH /api/admin/partners/:id — client-safe */
export async function updatePartnerClient(
  id: string,
  body: UpdatePartnerBody,
): Promise<AdminPartner> {
  const res = await fetch(`${BASE_URL}/api/admin/partners/${id}`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json.message ?? "Failed to update partner");
  }

  return normalizeAdminPartner((json.data ?? {}) as Record<string, unknown>);
}

/** POST /api/admin/partners/:id/resend-invite — client-safe */
export async function resendPartnerPortalInviteClient(partnerId: string) {
  const res = await fetch(`${BASE_URL}/api/admin/partners/${partnerId}/resend-invite`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json.message ?? "Failed to resend invite");
  }
  return json.data as {
    email: string;
    accountStatus: string;
    alreadyActive?: boolean;
    message?: string;
  };
}

export type PartnerUpdateRequestsPage = {
  requests: PartnerUpdateRequestRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

function normalizeUpdateRequest(raw: Record<string, unknown>): PartnerUpdateRequestRecord {
  return {
    _id: String(raw._id ?? raw.id ?? ""),
    status: (raw.status as PartnerUpdateRequestRecord["status"]) ?? "pending",
    proposedChanges: (raw.proposedChanges as Record<string, unknown>) ?? {},
    currentSnapshot: (raw.currentSnapshot as Record<string, unknown>) ?? {},
    rejectionReason: raw.rejectionReason ? String(raw.rejectionReason) : null,
    createdAt: String(raw.createdAt ?? ""),
    updatedAt: String(raw.updatedAt ?? ""),
    partner: raw.partner as PartnerUpdateRequestRecord["partner"],
    requestedBy: raw.requestedBy as PartnerUpdateRequestRecord["requestedBy"],
  };
}

/** GET /api/admin/partners/update-requests — client-safe */
export async function fetchPartnerUpdateRequestsClient(params?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<PartnerUpdateRequestsPage> {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 20;
  const query = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (params?.status) query.set("status", params.status);

  const res = await fetch(`${BASE_URL}/api/admin/partners/update-requests?${query}`, {
    headers: getAuthHeaders(),
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json.message ?? "Failed to fetch update requests");
  }

  const parsed = parsePaginated(json, page, limit, normalizeUpdateRequest);
  return { requests: parsed.items, pagination: parsed.pagination };
}

/** PATCH /api/admin/partners/update-requests/:id/approve — client-safe */
export async function approvePartnerUpdateRequestClient(id: string) {
  const res = await fetch(`${BASE_URL}/api/admin/partners/update-requests/${id}/approve`, {
    method: "PATCH",
    headers: getAuthHeaders(),
  });
  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json.message ?? "Failed to approve update request");
  }
  return json.data;
}

/** PATCH /api/admin/partners/update-requests/:id/reject — client-safe */
export async function rejectPartnerUpdateRequestClient(id: string, reason?: string) {
  const res = await fetch(`${BASE_URL}/api/admin/partners/update-requests/${id}/reject`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(reason ? { reason } : {}),
  });
  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json.message ?? "Failed to reject update request");
  }
  return json.data;
}
