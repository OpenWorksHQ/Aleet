import { apiFetch } from "@/lib/api";
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

/** Resolve slug or code — tries API first pattern, falls back to mock registry. */
export async function resolvePartnerBySlug(slug: string) {
  const tracking = resolveTrackingSlug(slug);
  if (tracking) return { data: tracking };

  const venue = resolveVenueSlug(slug);
  if (venue) return { data: venue };

  return apiFetch<PartnerContext>(`/partners/resolve/${encodeURIComponent(slug)}`, {
    method: "GET",
  }).catch(() => ({ data: null as unknown as PartnerContext, message: "Not found" }));
}

export async function validatePartnerCode(code: string) {
  const local = resolvePartnerCode(code);
  if (local) return { data: local, message: "Partner recognized" };

  return apiFetch<PartnerContext>("/partners/validate-code", {
    method: "POST",
    body: { code },
  }).catch(() => ({ data: null as unknown as PartnerContext, message: "Invalid code" }));
}

export async function submitPartnerApplication(payload: PartnerApplicationPayload) {
  try {
    return await apiFetch<PartnerApplicationRecord>("/partners/applications", {
      method: "POST",
      body: payload,
    });
  } catch {
    const record: PartnerApplicationRecord = {
      ...payload,
      id: `app_${Date.now()}`,
      status: "pending",
      submittedAt: new Date().toISOString(),
    };
    const existing = loadLocalApplications();
    saveLocalApplications([record, ...existing]);
    return { data: record, message: "Application submitted for review." };
  }
}

export async function getPartnerDashboard(partnerId: string) {
  try {
    return await apiFetch<PartnerDashboardStats>(`/partners/${partnerId}/dashboard`, {
      method: "GET",
      token: undefined,
    });
  } catch {
    const mock: PartnerDashboardStats = {
      partnerName: "Demo Partner Venue",
      partnerCode: "DEMO",
      venueSlug: "mgm-grand",
      commissionPct: 12,
      totalBookings: 47,
      completedBookings: 41,
      pendingPayout: 842.5,
      lifetimeEarnings: 6240,
      recentBookings: [
        {
          id: "bk_1",
          date: "2026-06-28",
          route: "MGM Grand → Harry Reid Airport",
          amount: 185,
          commission: 22.2,
          status: "completed",
        },
        {
          id: "bk_2",
          date: "2026-06-29",
          route: "MGM Grand → Caesars Palace",
          amount: 95,
          commission: 11.4,
          status: "upcoming",
        },
      ],
    };
    return { data: mock, message: "Mock dashboard data" };
  }
}

export function getLocalPartnerApplications() {
  return loadLocalApplications();
}
