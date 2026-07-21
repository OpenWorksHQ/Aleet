import { withNgrokHeaders } from "@/lib/ngrok-headers";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export interface ApiCheckr {
  status: string;
  result: string;
  assessment: string;
  lastEvent: string;
  lastEventAt: string;
  dashboardUrl: string;
}

export interface ApiDriverDetails {
  tier: string;
  status: string;
  backgroundCheck: boolean;
  avatar?: string | null;
  profileImage?: string | null;
  hasForHireLicense: boolean;
  hasOwnVehicle: boolean;
  vehicleTypes: string[];
  licenseImage: string | null;
  vehicleImage: string | null;
  forHireLicenseImage: string | null;
  driverRating: number;
  ssn: string;
  checkr: ApiCheckr | null;
  revisionNotes: string | null;
  regions?: string[];
  serveAllRegions?: boolean;
  /** Counts toward same-day coverage (AQD) when available + fresh heartbeat. */
  isOnline?: boolean;
  lastSeenAt?: string | null;
  availabilityStatus?: string;
  lastHeartbeatAt?: string | null;
}

export interface ApiDriver {
  _id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string | null;
  profileImage?: string | null;
  user?: {
    avatar?: string | null;
    profileImage?: string | null;
  } | null;
  createdAt: string;
  driver: ApiDriverDetails;
}

export interface ApiDriversStats {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
}

export interface ApiDriversResult {
  drivers: ApiDriver[];
  stats: ApiDriversStats;
}

/** GET /api/admin/drivers — call from Server Components, pass token from cookies() */
export async function fetchAdminDrivers(
  token: string,
  params?: { status?: string; page?: number; limit?: number },
): Promise<ApiDriversResult> {
  const url = new URL(`${BASE_URL}/api/admin/drivers`);
  if (params?.status) url.searchParams.set("status", params.status);
  if (params?.page) url.searchParams.set("page", String(params.page));
  if (params?.limit) url.searchParams.set("limit", String(params.limit));

  const res = await fetch(url.toString(), {
    headers: withNgrokHeaders({
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    }),
    cache: "no-store",
  });

  const json = await res.json();
  console.log("[fetchAdminDrivers] raw body:", JSON.stringify(json, null, 2));
  if (!res.ok || json.success === false) {
    throw new Error(json.message ?? "Failed to fetch drivers");
  }
  return {
    drivers: json.data as ApiDriver[],
    stats: (json.meta?.stats ?? {
      total: 0,
      active: 0,
      pending: 0,
      suspended: 0,
    }) as ApiDriversStats,
  };
}

/** PATCH /api/admin/drivers/approve — call from Client Components */
export async function approveDriver(driverId: string): Promise<void> {
  const token =
    typeof document !== "undefined"
      ? document.cookie
          .split("; ")
          .find((c) => c.startsWith("auth_token="))
          ?.split("=")[1]
      : undefined;

  const res = await fetch(`${BASE_URL}/api/admin/drivers/approve`, {
    method: "PATCH",
    headers: withNgrokHeaders({
      Authorization: `Bearer ${token ?? ""}`,
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({ driverId }),
  });

  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json.message ?? "Failed to approve driver");
  }
}

function getClientToken(): string {
  return typeof document !== "undefined"
    ? (document.cookie
        .split("; ")
        .find((c) => c.startsWith("auth_token="))
        ?.split("=")[1] ?? "")
    : "";
}

/** PATCH /api/admin/drivers/reject — call from Client Components */
export async function rejectDriver(driverId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/admin/drivers/reject`, {
    method: "PATCH",
    headers: withNgrokHeaders({
      Authorization: `Bearer ${getClientToken()}`,
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({ driverId }),
  });
  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json.message ?? "Failed to reject driver");
  }
}

/** PATCH /api/admin/drivers/request-revision — call from Client Components */
export async function requestRevision(
  driverId: string,
  notes: string,
): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/admin/drivers/request-revision`, {
    method: "PATCH",
    headers: withNgrokHeaders({
      Authorization: `Bearer ${getClientToken()}`,
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({ driverId, notes }),
  });
  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json.message ?? "Failed to request revision");
  }
}

/** GET /api/admin/drivers (list) and find by id — call from Client Components */
export async function fetchAdminDriverById(driverId: string): Promise<ApiDriver> {
  const headers = withNgrokHeaders({
    Authorization: `Bearer ${getClientToken()}`,
    "Content-Type": "application/json",
  });

  const listRes = await fetch(`${BASE_URL}/api/admin/drivers?limit=200`, {
    headers,
    cache: "no-store",
  });
  const listJson = await listRes.json().catch(() => ({}));
  if (!listRes.ok || listJson.success === false) {
    throw new Error(listJson.message ?? "Failed to fetch driver");
  }

  const drivers = (listJson.data ?? []) as ApiDriver[];
  const found = drivers.find((d) => d._id === driverId);
  if (!found) {
    throw new Error("Driver not found after background check update");
  }
  return found;
}

/** POST /checkr/admin/drivers/:id/simulate-clear — call from Client Components */
export async function simulateClearBackgroundCheck(driverId: string): Promise<void> {
  const res = await fetch(
    `${BASE_URL}/checkr/admin/drivers/${driverId}/simulate-clear`,
    {
      method: "POST",
      headers: withNgrokHeaders({
        Authorization: `Bearer ${getClientToken()}`,
        "Content-Type": "application/json",
      }),
    },
  );
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    throw new Error(json.message ?? "Failed to complete background check");
  }
}

export interface VehicleType {
  _id: string;
  name: string;
}

/**
 * PUT /api/admin/drivers/:id/regions — admin sets a driver's service regions.
 *
 * Default-open semantics (mirrors backend driverServesRegion):
 *   - serveAllRegions=true  → driver serves everywhere (regions arg is ignored at gate-time)
 *   - serveAllRegions=false + regions=[...] → driver serves only those regions
 *   - serveAllRegions=false + regions=[]    → driver serves nowhere
 */
export async function updateDriverRegionsAdmin(
  driverId: string,
  body: { regions: string[]; serveAllRegions: boolean },
): Promise<ApiDriver> {
  const res = await fetch(`${BASE_URL}/api/admin/drivers/${driverId}/regions`, {
    method: "PUT",
    headers: withNgrokHeaders({
      Authorization: `Bearer ${getClientToken()}`,
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json.message ?? "Failed to update driver regions");
  }
  return json.data as ApiDriver;
}

export interface UpdateDriverAdminPayload {
  driverId: string;
  driverStatus?: string;
  tier?: string;
  availabilityStatus?: string;
  backgroundCheck?: boolean;
}

/** PATCH /api/admin/toggleDriverStatus — tier, account status, availability */
export async function updateDriverAdmin(
  payload: UpdateDriverAdminPayload,
): Promise<ApiDriver> {
  const res = await fetch(`${BASE_URL}/api/admin/toggleDriverStatus`, {
    method: "PATCH",
    headers: withNgrokHeaders({
      Authorization: `Bearer ${getClientToken()}`,
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json.message ?? "Failed to update driver");
  }
  return json.data as ApiDriver;
}

/** GET /api/vehicle-types — call from Server Components */
export async function fetchVehicleTypes(token: string): Promise<VehicleType[]> {
  const res = await fetch(`${BASE_URL}/api/vehicle-types?includePrivate=1`, {
    headers: withNgrokHeaders({
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    }),
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok || json.success === false) return [];
  return (json.data ?? []) as VehicleType[];
}
