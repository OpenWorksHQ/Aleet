// Shared driver types used across Driver Management components

import type { ApiDriver } from "@/lib/drivers-api";

export type DriverStatus =
  | "draft"
  | "submitted"
  | "background_pending"
  | "background_in_review"
  | "background_completed"
  | "approved"
  | "rejected"
  | "needs_revision"
  | "revision_complete";
export type DriverTier = string;

export type Driver = {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: DriverStatus;
  tier: DriverTier;
  trips: number;
  rating: number;
  joinedAt: string;
  vehicle: string;
  avatar: string;
  avatarUrl: string | null;
  backgroundCheck: boolean;
  checkrDashboardUrl: string | null;
  checkrStatus: string | null;
  checkrLastEvent: string | null;
  checkrLastEventAt: string | null;
  hasOwnVehicle: boolean;
  hasForHireLicense: boolean;
  vehicleTypes: string[];
  licenseImage: string | null;
  vehicleImage: string | null;
  forHireLicenseImage: string | null;
  ssn: string | null;
  revisionNotes: string | null;
  regions: string[];
  serveAllRegions: boolean;
  isOnline: boolean;
  lastSeenAt: string | null;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2)
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function normalizeAvatarUrl(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }
  return null;
}

export function mapApiDriver(
  d: ApiDriver,
  vehicleTypeMap: Record<string, string> = {},
): Driver {
  return {
    id: d._id,
    name: d.name,
    email: d.email,
    phone: d.phone,
    status: d.driver.status as DriverStatus,
    tier: d.driver.tier,
    trips: 0,
    rating: d.driver.driverRating,
    joinedAt: new Date(d.createdAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    vehicle:
      d.driver.vehicleTypes
        .map((id) => vehicleTypeMap[id] ?? id)
        .filter(Boolean)
        .join(", ") || "—",
    avatar: initials(d.name),
    avatarUrl: normalizeAvatarUrl(
      d.avatar,
      d.profileImage,
      d.user?.avatar,
      d.user?.profileImage,
      d.driver.avatar,
      d.driver.profileImage,
    ),
    backgroundCheck: d.driver.backgroundCheck,
    checkrDashboardUrl: d.driver.checkr?.dashboardUrl ?? null,
    checkrStatus: d.driver.checkr?.status ?? null,
    checkrLastEvent: d.driver.checkr?.lastEvent ?? null,
    checkrLastEventAt: d.driver.checkr?.lastEventAt ?? null,
    hasOwnVehicle: d.driver.hasOwnVehicle,
    hasForHireLicense: d.driver.hasForHireLicense,
    vehicleTypes: d.driver.vehicleTypes.map((id) => vehicleTypeMap[id] ?? id),
    licenseImage: d.driver.licenseImage,
    vehicleImage: d.driver.vehicleImage,
    forHireLicenseImage: d.driver.forHireLicenseImage,
    ssn: d.driver.ssn ?? null,
    revisionNotes: d.driver.revisionNotes ?? null,
    regions: Array.isArray(d.driver.regions) ? d.driver.regions : [],
    serveAllRegions: d.driver.serveAllRegions !== false,
    isOnline: !!d.driver.isOnline,
    lastSeenAt: d.driver.lastSeenAt ?? null,
  };
}
