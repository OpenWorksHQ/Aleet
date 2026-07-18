"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type {
  ApiAddon,
  ApiRegion,
  ApiTierDriver,
  ApiVehicleType,
  TierCounts,
  TierPerformancePage,
  TierSettings,
} from "@/lib/admin-api";
import { AdminSectionTabs } from "@/app/components/admin/admin-section-tabs";
import { VehicleTypesList } from "@/app/components/admin/vehicle-types/vehicle-types-list";
import { AddonsList } from "@/app/components/admin/addons/addons-list";
import { RegionsList } from "@/app/components/admin/regions/regions-list";
import { TiersList } from "@/app/components/admin/tiers/tiers-list";

type Tab = "vehicles" | "addons" | "regions" | "tiers";

type Props = {
  vehicleTypes: ApiVehicleType[];
  addons: ApiAddon[];
  regions: ApiRegion[];
  initialDrivers: ApiTierDriver[];
  initialTierCounts: TierCounts;
  initialPagination: TierPerformancePage["pagination"];
  initialSettings: TierSettings | null;
};

export function PlatformDetailsPanel({
  vehicleTypes,
  addons,
  regions,
  initialDrivers,
  initialTierCounts,
  initialPagination,
  initialSettings,
}: Props) {
  const searchParams = useSearchParams();
  const initialTab = useMemo<Tab>(() => {
    const tab = searchParams.get("tab");
    if (tab === "addons" || tab === "regions" || tab === "tiers" || tab === "vehicles") {
      return tab;
    }
    return "vehicles";
  }, [searchParams]);
  const [tab, setTab] = useState<Tab>(initialTab);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-text">Platform Details</h2>
        <p className="mt-1 text-sm text-muted">
          Vehicle types, add-ons, regions, and tier policies
        </p>
        <AdminSectionTabs
          tabs={[
            { id: "vehicles", label: "Vehicle Types" },
            { id: "addons", label: "Add-ons" },
            { id: "regions", label: "Regions" },
            { id: "tiers", label: "Tiers & Policies" },
          ]}
          activeId={tab}
          onChange={(id) => setTab(id as Tab)}
        />
      </div>

      {tab === "vehicles" ? (
        <VehicleTypesList initialVehicleTypes={vehicleTypes} />
      ) : tab === "addons" ? (
        <AddonsList initialAddons={addons} />
      ) : tab === "regions" ? (
        <RegionsList initialRegions={regions} />
      ) : (
        <TiersList
          initialDrivers={initialDrivers}
          initialTierCounts={initialTierCounts}
          initialPagination={initialPagination}
          initialSettings={initialSettings}
        />
      )}
    </div>
  );
}
