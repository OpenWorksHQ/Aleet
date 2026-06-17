"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SiteMenu } from "../components/site-menu";
import { TripsSection } from "../components/dashboard/trips-tabs";
import { Button } from "../components/ui";
import {
  ActiveTripIcon,
  FleetIcon,
  CalendarPlusIcon,
} from "../components/ui/icons";
import { SideNav } from "@/app/components/dashboard/side-nav";
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
    <div className="min-h-screen bg-[#050d0c] pb-10 text-white">
      <header className="sticky top-0 z-40 w-full border-b border-white/6 bg-[#050d0c]">
        <div className="flex h-14 w-full items-center justify-between px-4 sm:h-16 sm:px-8">
          <SiteMenu />
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 text-[#bca066] no-underline"
            aria-label="Aleet home"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border-[3px] border-[#bca066] font-serif text-[18px] leading-none font-semibold sm:h-9 sm:w-9 sm:text-[20px]">
              A
            </span>
            <span className="text-[22px] leading-none font-semibold tracking-[-0.02em] sm:text-[26px]">
              Aleet
            </span>
          </Link>
          <div className="w-9 sm:w-10" />
        </div>
      </header>

      <main className="mx-auto mt-8 w-full px-5 sm:px-10">
        <section className="grid gap-4 lg:grid-cols-[92px_1fr]">
          <aside className="overflow-hidden rounded-xl border border-[#1e2b2c] bg-[rgba(8,19,18,0.62)] p-1.5">
            <SideNav />
          </aside>

          <section className="min-w-0 space-y-4">
            <article className="flex flex-col gap-5 rounded-2xl border border-[#1e2b2c] bg-[rgba(8,19,18,0.62)] px-6 py-7 sm:flex-row sm:items-center sm:justify-between sm:px-8">
              <div>
                <h1 className="text-3xl leading-[1.1] font-medium text-white sm:text-4xl">
                  Welcome, {displayName}!
                </h1>
                <p className="mt-2 text-sm text-[#c7c7c7] sm:text-base">
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
          </section>
        </section>
      </main>
    </div>
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
    <article className="flex items-center gap-3 rounded-xl border border-[#1e2b2c] bg-[rgba(8,19,18,0.62)] px-4 py-4">
      <span className="text-[#bca066]">{icon}</span>
      <div className="leading-tight">
        <p className="text-3xl font-medium text-[#bca066]">{value}</p>
        <p className="text-sm font-semibold text-white">{label}</p>
      </div>
    </article>
  );
}
