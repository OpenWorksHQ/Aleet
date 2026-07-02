import type { PartnerContext } from "./types";

const STORAGE_KEY = "aleet_partner_context";
const COOKIE_KEY = "aleet_partner";
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
    clearCookie();
    notifyPartnerChanged();
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
