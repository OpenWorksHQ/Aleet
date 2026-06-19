/** Extra headers when the API is behind ngrok (skips the free-tier browser warning page). */
export function getNgrokHeaders(): HeadersInit {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "";
  if (!base.includes("ngrok")) return {};
  return { "ngrok-skip-browser-warning": "true" };
}

export function withNgrokHeaders(headers?: HeadersInit): HeadersInit {
  return { ...getNgrokHeaders(), ...headers };
}
