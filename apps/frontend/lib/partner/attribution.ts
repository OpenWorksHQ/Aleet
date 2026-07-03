import type { PartnerContext } from "./types";

const STORAGE_KEY = "aleet_partner_context";
const COOKIE_KEY = "aleet_partner";
const DASHBOARD_TOKEN_KEY = "aleet_partner_dashboard_token";
const COOKIE_MAX_AGE_DAYS = 30;
export const PARTNER_CHANGED_EVENT = "aleet-partner-changed";

function notifyPartnerChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(PARTNER_CHANGED_EVENT));
  }
}

function setCookie(value: string) {
  if (typeof document === "undefined") return;
  const maxAge = COOKIE_MAX_AGE_DAYS * 24 * 60 * 60;
  document.cookie = `${COOKIE_KEY}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

function clearCookie() {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_KEY}=; path=/; max-age=0`;
}

export function getPartnerCodeFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${COOKIE_KEY}=`));
  if (!match) return null;
  try {
    return decodeURIComponent(match.split("=")[1] ?? "");
  } catch {
    return null;
  }
}

export function savePartnerContext(context: PartnerContext): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(context));
    setCookie(context.partnerCode);
    notifyPartnerChanged();
  } catch {
    // ignore
  }
}

export function loadPartnerContext(): PartnerContext | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PartnerContext;
  } catch {
    return null;
  }
}

export function clearPartnerContext(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(DASHBOARD_TOKEN_KEY);
    clearCookie();
    notifyPartnerChanged();
  } catch {
    // ignore
  }
}

export function savePartnerDashboardToken(token: string): void {
  try {
    localStorage.setItem(DASHBOARD_TOKEN_KEY, token);
  } catch {
    // ignore
  }
}

export function loadPartnerDashboardToken(): string | null {
  try {
    return localStorage.getItem(DASHBOARD_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function clearPartnerDashboardToken(): void {
  try {
    localStorage.removeItem(DASHBOARD_TOKEN_KEY);
  } catch {
    // ignore
  }
}

export function mergePartnerContext(patch: Partial<PartnerContext>): PartnerContext | null {
  const existing = loadPartnerContext();
  if (!existing && !patch.partnerId) return null;
  const merged = { ...(existing ?? {}), ...patch } as PartnerContext;
  savePartnerContext(merged);
  return merged;
}
