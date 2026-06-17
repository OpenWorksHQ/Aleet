const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export interface Region {
  _id: string;
  name: string;
  code: string;
  isActive: boolean;
}

/**
 * GET /api/regions — public. Returns only active regions.
 * Used by the booking wizard and the driver-side region picker.
 */
export async function fetchActiveRegions(): Promise<Region[]> {
  const res = await fetch(`${BASE_URL}/api/regions`, { cache: "no-store" });
  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json.message ?? "Failed to fetch regions");
  }
  return (json.data ?? json) as Region[];
}

/**
 * PUT /api/users/me/regions — driver-only.
 * Updates which regions the authenticated driver is willing to serve.
 *
 * Backend default-open semantics:
 *   - serveAllRegions=true with any regions list → driver serves everywhere
 *   - serveAllRegions=false with non-empty list → driver serves only those regions
 *   - serveAllRegions=false with empty list → driver serves nowhere (off-duty)
 */
export async function updateMyRegions(
  token: string,
  body: { regions: string[]; serveAllRegions: boolean },
): Promise<{ regions: string[]; serveAllRegions: boolean }> {
  const res = await fetch(`${BASE_URL}/api/users/me/regions`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json.message ?? "Failed to update service regions");
  }
  return json.data as { regions: string[]; serveAllRegions: boolean };
}
