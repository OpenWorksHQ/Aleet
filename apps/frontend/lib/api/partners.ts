import { apiFetch, ApiError } from "@/lib/api";
import { loadPartnerDashboardToken } from "@/lib/partner/attribution";
import type {
  PartnerApplicationPayload,
  PartnerApplicationRecord,
  PartnerContext,
  PartnerDashboardStats,
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

/** Resolve tracking or venue slug — API first, local registry only when API is not configured. */
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

export async function getPartnerDashboard(
  partnerId: string,
): Promise<PartnerApiResult<PartnerDashboardStats>> {
  if (!partnerId?.trim()) {
    return { data: null, message: "No partner selected", fromApi: false };
  }

  if (isPartnerApiConfigured()) {
    try {
      const dashboardToken = loadPartnerDashboardToken();
      const api = await apiFetch<PartnerDashboardStats>(
        `/partners/${encodeURIComponent(partnerId)}/dashboard`,
        {
          method: "GET",
          skipAuthRedirect: true,
          headers: dashboardToken
            ? { "X-Partner-Token": dashboardToken }
            : undefined,
        },
      );
      return {
        data: api.data ?? null,
        message: api.message,
        fromApi: true,
      };
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Could not load partner dashboard";
      return { data: null, message, fromApi: true };
    }
  }

  return {
    data: null,
    message: "Connect NEXT_PUBLIC_API_URL to load live dashboard data",
    fromApi: false,
  };
}

export async function authenticatePartnerDashboard(partnerCode: string, contactEmail: string) {
  if (!isPartnerApiConfigured()) {
    throw new ApiError(503, "Partner dashboard requires API connection");
  }
  return apiFetch<{
    partner: PartnerContext;
    dashboardAccessToken: string;
  }>("/partners/dashboard-auth", {
    method: "POST",
    body: { partnerCode, contactEmail },
  });
}

export function getLocalPartnerApplications() {
  return loadLocalApplications();
}

export function isPartnerApiEnabled() {
  return isPartnerApiConfigured();
}
