"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "../components/dashboard-shell";
import { TripsSection } from "../components/dashboard/trips-tabs";
import { Button } from "../components/ui";
import {
  ActiveTripIcon,
  FleetIcon,
  CalendarPlusIcon,
} from "../components/ui/icons";
import { getProfile } from "@/lib/api/users";
import { getToken } from "@/lib/auth";
import type { User } from "@/lib/api/auth";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const token = getToken();
    if (token) {
      getProfile(token).then((res) => {
        if (res.data) setUser(res.data);
      }).catch(() => { });
    }
  }, []);

  const displayName = user?.name ?? "there";

  return (
    <DashboardShell activeNav="dashboard">
      <article className="flex flex-col gap-5 rounded-2xl border border-aleet-border bg-aleet-card px-6 py-7 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div>
          <h1 className="font-serif text-3xl leading-[1.1] font-medium text-aleet-text sm:text-4xl">
            Welcome, {displayName}!
          </h1>
          <p className="mt-2 text-sm text-aleet-text-muted sm:text-base">
            Manage your trips and enjoy premium transportation services.
          </p>
        </div>
        <div className="shrink-0">
          <Button className="h-10 px-6 text-sm" type="button" onClick={() => router.push("/booking")}>
            + Book New Trip
          </Button>
        </div>
      </article>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard icon={<CalendarPlusIcon className="h-7 w-7" />} value="2" label="Upcoming Trips" />
        <StatCard icon={<ActiveTripIcon className="h-7 w-7" />} value="1" label="Active Trips" />
        <StatCard icon={<FleetIcon className="h-7 w-7" />} value="5" label="Total Trips" />
      </div>

      <TripsSection />
    </DashboardShell>
  );
}

function StatCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <article className="flex items-center gap-3 rounded-xl border border-aleet-border bg-aleet-card px-4 py-4 shadow-sm">
      <span className="text-aleet-gold">{icon}</span>
      <div className="leading-tight">
        <p className="text-3xl font-medium text-aleet-gold">{value}</p>
        <p className="text-sm font-semibold text-aleet-text">{label}</p>
      </div>
    </article>
  );
}
