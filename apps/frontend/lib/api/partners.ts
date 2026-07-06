import { apiFetch, ApiError, type ApiResponse } from "@/lib/api";
import {
  clearPartnerAuthToken,
  loadPartnerAuthToken,
  savePartnerAuthToken,
} from "@/lib/partner/auth";
import type {
  PartnerApplicationPayload,
  PartnerApplicationRecord,
  PartnerAuthSession,
  PartnerContext,
  PartnerDashboardStats,
  PartnerProfile,
  PartnerUpdateRequest,
  PartnerUpdateRequestPayload,
} from "@/lib/partner/types";
import {
  resolvePartnerCode,
  resolveTrackingSlug,
  resolveVenueSlug,
} from "@/lib/partner/registry";

const APPLICATIONS_KEY = "aleet_partner_applications";

export type PartnerApiResult<T> = {
  data: T | null;
  message: string;
  fromApi: boolean;
};

function isPartnerApiConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_API_URL?.trim());
}

async function partnerApiFetch<T>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<ApiResponse<T>> {
  const token = loadPartnerAuthToken();
  try {
    return await apiFetch<T>(path, {
      ...init,
      token: token ?? undefined,
      skipAuthRedirect: true,
    });
  } catch (err) {
    if (
      err instanceof ApiError &&
      err.status === 401 &&
      typeof window !== "undefined"
    ) {
      clearPartnerAuthToken();
      window.location.href = "/partners/login";
    }
    throw err;
  }
}

function loadLocalApplications(): PartnerApplicationRecord[] {
  try {
    const raw = localStorage.getItem(APPLICATIONS_KEY);
    return raw ? (JSON.parse(raw) as PartnerApplicationRecord[]) : [];
  } catch {
    return [];
  }
}

function saveLocalApplications(records: PartnerApplicationRecord[]) {
  try {
    localStorage.setItem(APPLICATIONS_KEY, JSON.stringify(records));
  } catch {
    // ignore
  }
}

function registryResolve(slug: string): PartnerContext | null {
  return resolveTrackingSlug(slug) ?? resolveVenueSlug(slug) ?? null;
}

export async function resolvePartnerBySlug(
  slug: string,
): Promise<PartnerApiResult<PartnerContext>> {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) {
    return { data: null, message: "Invalid link", fromApi: false };
  }

  if (isPartnerApiConfigured()) {
    try {
      const api = await apiFetch<PartnerContext>(
        `/partners/resolve/${encodeURIComponent(normalized)}`,
        { method: "GET" },
      );
      if (api.data) {
        return { data: api.data, message: api.message, fromApi: true };
      }
      return { data: null, message: api.message ?? "Partner not found", fromApi: true };
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Could not reach partner service";
      return { data: null, message, fromApi: true };
    }
  }

  const local = registryResolve(normalized);
  return local
    ? { data: local, message: "Partner recognized", fromApi: false }
    : { data: null, message: "Partner not found", fromApi: false };
}

export async function validatePartnerCode(
  code: string,
): Promise<PartnerApiResult<PartnerContext>> {
  const trimmed = code.trim();
  if (!trimmed) {
    return { data: null, message: "Enter a partner code", fromApi: false };
  }

  if (isPartnerApiConfigured()) {
    try {
      const api = await apiFetch<PartnerContext>("/partners/validate-code", {
        method: "POST",
        body: { code: trimmed },
      });
      if (api.data) {
        return { data: api.data, message: api.message, fromApi: true };
      }
      return {
        data: null,
        message: api.message ?? "Partner code not recognized",
        fromApi: true,
      };
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Could not validate partner code";
      return { data: null, message, fromApi: true };
    }
  }

  const local = resolvePartnerCode(trimmed);
  return local
    ? { data: local, message: "Partner recognized", fromApi: false }
    : { data: null, message: "Partner code not recognized", fromApi: false };
}

export async function checkPartnerApplicationEmail(email: string) {
  const trimmed = email.trim();
  if (!trimmed) {
    throw new ApiError(400, "Email is required", {
      contactEmail: { code: "required" },
    });
  }

  if (!isPartnerApiConfigured()) {
    return { data: { available: true }, message: "Email is available", success: true };
  }

  return apiFetch<{ available: boolean }>(
    `/partners/applications/check-email?email=${encodeURIComponent(trimmed)}`,
    { method: "GET" },
  );
}

export async function checkPartnerContactEmailForUpdate(email: string) {
  const trimmed = email.trim();
  if (!trimmed) {
    throw new ApiError(400, "Email is required", {
      contactEmail: { code: "required" },
    });
  }

  return partnerApiFetch<{ available: boolean }>(
    `/partners/me/check-contact-email?email=${encodeURIComponent(trimmed)}`,
    { method: "GET" },
  );
}

export async function submitPartnerApplication(payload: PartnerApplicationPayload) {
  if (isPartnerApiConfigured()) {
    return apiFetch<PartnerApplicationRecord>("/partners/applications", {
      method: "POST",
      body: payload,
    });
  }

  const record: PartnerApplicationRecord = {
    ...payload,
    id: `app_${Date.now()}`,
    status: "pending",
    submittedAt: new Date().toISOString(),
  };
  saveLocalApplications([record, ...loadLocalApplications()]);
  return { data: record, message: "Application submitted for review.", success: true };
}

export async function partnerLogin(email: string, password: string) {
  const res = await apiFetch<PartnerAuthSession>("/partners/auth/login", {
    method: "POST",
    body: { email, password },
  });
  if (res.data?.token) savePartnerAuthToken(res.data.token);
  return res;
}

export async function partnerSetPassword(token: string, password: string) {
  const res = await apiFetch<PartnerAuthSession>("/partners/auth/set-password", {
    method: "POST",
    body: { token, password },
  });
  if (res.data?.token) savePartnerAuthToken(res.data.token);
  return res;
}

export async function partnerForgotPassword(email: string) {
  return apiFetch<{ message: string }>("/partners/auth/forgot-password", {
    method: "POST",
    body: { email },
  });
}

export async function partnerResetPassword(token: string, password: string) {
  return apiFetch<{ message: string }>("/partners/auth/reset-password", {
    method: "POST",
    body: { token, password },
  });
}

export async function getPartnerAuthMe() {
  return partnerApiFetch<{ user: PartnerAuthSession["user"]; partner: PartnerContext | null }>(
    "/partners/auth/me",
    { method: "GET" },
  );
}

export async function getPartnerDashboardMe() {
  return partnerApiFetch<PartnerDashboardStats>("/partners/me/dashboard", {
    method: "GET",
  });
}

export async function getPartnerProfileMe() {
  return partnerApiFetch<PartnerProfile>("/partners/me/profile", { method: "GET" });
}

export async function listPartnerUpdateRequestsMe() {
  return partnerApiFetch<PartnerUpdateRequest[]>("/partners/me/update-requests", {
    method: "GET",
  });
}

export async function submitPartnerUpdateRequestMe(payload: PartnerUpdateRequestPayload) {
  return partnerApiFetch<PartnerUpdateRequest>("/partners/me/update-requests", {
    method: "POST",
    body: payload,
  });
}

export function partnerLogout() {
  clearPartnerAuthToken();
}

export function getLocalPartnerApplications() {
  return loadLocalApplications();
}

export function isPartnerApiEnabled() {
  return isPartnerApiConfigured();
}

export function isPartnerLoggedIn() {
  return Boolean(loadPartnerAuthToken());
}
