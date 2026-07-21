/** Match a Google Places state name/code to an active admin region. */

function norm(value: string): string {
  return value.trim().toLowerCase().replace(/\./g, "");
}

export function matchRegionByPlaceState<T extends { label: string; value?: string; code?: string }>(
  regions: T[],
  placeState?: string | null,
  placeStateCode?: string | null,
): T | null {
  if (!regions.length) return null;

  const candidates = [placeStateCode, placeState]
    .filter((v): v is string => Boolean(v && v.trim()));

  for (const candidate of candidates) {
    const n = norm(candidate);
    const hit = regions.find((r) => {
      if (r.code && norm(r.code) === n) return true;
      if (norm(r.label) === n) return true;
      if (r.value && norm(r.value) === n) return true;
      return false;
    });
    if (hit) return hit;
  }

  return null;
}
