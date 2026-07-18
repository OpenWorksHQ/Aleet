"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Driver } from "@/app/components/admin/drivers/driver-types";
import type { ApiDriversStats } from "@/lib/drivers-api";
import type { LicensingPage } from "@/lib/admin-api";
import { DriverStats } from "@/app/components/admin/drivers/driver-stats";
import { DriversTable } from "@/app/components/admin/drivers/drivers-table";
import { LicensingList } from "@/app/components/admin/licensing/licensing-list";
import { AdminSectionTabs } from "@/app/components/admin/admin-section-tabs";

type Tab = "drivers" | "licensing";

type Props = {
  drivers: Driver[];
  stats: ApiDriversStats;
  licensing: LicensingPage;
};

export function DriversAdminPanel({ drivers, stats, licensing }: Props) {
  const searchParams = useSearchParams();
  const initialTab = useMemo<Tab>(() => {
    const tab = searchParams.get("tab");
    return tab === "licensing" ? "licensing" : "drivers";
  }, [searchParams]);
  const [tab, setTab] = useState<Tab>(initialTab);

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-border bg-card-bg px-5 py-4">
        <h1 className="text-xl font-bold text-text sm:text-2xl">Driver Management</h1>
        <p className="mt-1 text-sm text-muted">
          Approve drivers and manage licensing &amp; background checks
        </p>
        <AdminSectionTabs
          tabs={[
            { id: "drivers", label: "Driver Management", badge: stats.pending > 0 ? stats.pending : undefined },
            { id: "licensing", label: "Licensing & Background" },
          ]}
          activeId={tab}
          onChange={(id) => setTab(id as Tab)}
        />
      </div>

      {tab === "drivers" ? (
        <>
          <DriverStats stats={stats} />
          <DriversTable initialDrivers={drivers} />
        </>
      ) : (
        <LicensingList
          initialDrivers={licensing.drivers}
          initialStats={licensing.stats}
          initialTotal={licensing.total}
          initialPages={licensing.pages}
        />
      )}
    </div>
  );
}
