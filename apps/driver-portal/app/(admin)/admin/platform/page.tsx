import { Suspense } from "react";
import { cookies } from "next/headers";
import {
  fetchAddons,
  fetchAllRegions,
  fetchTierPerformance,
  fetchTierSettings,
  fetchVehicleTypes,
  type ApiAddon,
  type ApiRegion,
  type ApiTierDriver,
  type ApiVehicleType,
  type TierCounts,
  type TierPerformancePage,
  type TierSettings,
} from "@/lib/admin-api";
import { PlatformDetailsPanel } from "@/app/components/admin/platform/platform-details-panel";

export const metadata = {
  title: "Platform Details — Aleet Admin",
};

export default async function PlatformDetailsPage() {
  const token = (await cookies()).get("auth_token")?.value ?? "";

  let vehicleTypes: ApiVehicleType[] = [];
  let addons: ApiAddon[] = [];
  let regions: ApiRegion[] = [];
  let initialDrivers: ApiTierDriver[] = [];
  let initialTierCounts: TierCounts = { "S-Level": 0, Pro: 0, Diamond: 0 };
  let initialPagination: TierPerformancePage["pagination"] = {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  };
  let initialSettings: TierSettings | null = null;

  try {
    const [vt, ad, rg, tierData, settings] = await Promise.all([
      fetchVehicleTypes(token),
      fetchAddons(token),
      fetchAllRegions(token),
      fetchTierPerformance(token, { page: 1, limit: 20 }),
      fetchTierSettings(token),
    ]);
    vehicleTypes = vt;
    addons = ad;
    regions = rg;
    initialDrivers = tierData.drivers;
    initialTierCounts = tierData.tierCounts;
    initialPagination = tierData.pagination;
    initialSettings = settings;
  } catch {
    // empty states handled in lists
  }

  return (
    <Suspense fallback={<div className="text-sm text-muted">Loading…</div>}>
      <PlatformDetailsPanel
        vehicleTypes={vehicleTypes}
        addons={addons}
        regions={regions}
        initialDrivers={initialDrivers}
        initialTierCounts={initialTierCounts}
        initialPagination={initialPagination}
        initialSettings={initialSettings}
      />
    </Suspense>
  );
}
