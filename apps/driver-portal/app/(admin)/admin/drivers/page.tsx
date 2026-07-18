import { Suspense } from "react";
import type { Driver } from "@/app/components/admin/drivers/driver-types";
import type { ApiDriversStats } from "@/lib/drivers-api";
import { cookies } from "next/headers";
import { fetchAdminDrivers, fetchVehicleTypes } from "@/lib/drivers-api";
import { mapApiDriver } from "@/app/components/admin/drivers/driver-types";
import { fetchLicensing, type LicensingPage } from "@/lib/admin-api";
import { DriversAdminPanel } from "@/app/components/admin/drivers/drivers-admin-panel";

export const metadata = {
  title: "Driver Management — Aleet Admin",
};

export default async function DriversPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value ?? "";

  let drivers: Driver[] = [];
  let stats: ApiDriversStats = { total: 0, approved: 0, pending: 0, rejected: 0 };
  let licensing: LicensingPage = {
    drivers: [],
    stats: { verified: 0, pending: 0, total: 0 },
    total: 0,
    page: 1,
    limit: 20,
    pages: 0,
  };

  try {
    const [result, vehicleTypes, licensingData] = await Promise.all([
      fetchAdminDrivers(token),
      fetchVehicleTypes(token),
      fetchLicensing(token, { page: 1, limit: 20 }),
    ]);
    const vehicleTypeMap = Object.fromEntries(vehicleTypes.map((vt) => [vt._id, vt.name]));
    drivers = result.drivers.map((d) => mapApiDriver(d, vehicleTypeMap));
    stats = result.stats;
    licensing = licensingData;
  } catch {
    // render empty state on error — panel handles it
  }

  return (
    <Suspense fallback={<div className="text-sm text-muted">Loading…</div>}>
      <DriversAdminPanel drivers={drivers} stats={stats} licensing={licensing} />
    </Suspense>
  );
}
