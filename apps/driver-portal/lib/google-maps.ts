/** Google Maps URLs for driver navigation (tap-to-open on mobile or desktop). */

export function buildGoogleMapsSearchUrl(address: string): string | null {
  const query = address.trim();
  if (!query) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function buildGoogleMapsDirectionsUrl(
  origin: string,
  destination: string,
  waypoints: string[] = [],
): string | null {
  const from = origin.trim();
  const to = destination.trim();
  if (!from || !to) return null;

  const params = new URLSearchParams({
    api: "1",
    origin: from,
    destination: to,
    travelmode: "driving",
  });

  const stops = waypoints.map((w) => w.trim()).filter(Boolean);
  if (stops.length > 0) {
    params.set("waypoints", stops.join("|"));
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export async function copyAddressToClipboard(address: string): Promise<boolean> {
  const text = address.trim();
  if (!text) return false;

  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }

  return false;
}
