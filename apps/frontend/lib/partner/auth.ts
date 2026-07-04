const PARTNER_AUTH_TOKEN_KEY = "aleet_partner_auth_token";
export const PARTNER_AUTH_CHANGED_EVENT = "aleet-partner-auth-changed";

function notifyPartnerAuthChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(PARTNER_AUTH_CHANGED_EVENT));
  }
}

export function savePartnerAuthToken(token: string): void {
  try {
    localStorage.setItem(PARTNER_AUTH_TOKEN_KEY, token);
    notifyPartnerAuthChanged();
  } catch {
    // ignore
  }
}

export function loadPartnerAuthToken(): string | null {
  try {
    return localStorage.getItem(PARTNER_AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function clearPartnerAuthToken(): void {
  try {
    localStorage.removeItem(PARTNER_AUTH_TOKEN_KEY);
    notifyPartnerAuthChanged();
  } catch {
    // ignore
  }
}

export function partnerAuthHeaders(): HeadersInit | undefined {
  const token = loadPartnerAuthToken();
  if (!token) return undefined;
  return { Authorization: `Bearer ${token}` };
}

export function isPartnerAuthLoggedIn(): boolean {
  return Boolean(loadPartnerAuthToken());
}
