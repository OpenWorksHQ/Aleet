"use client";

import type { ReactNode } from "react";
import { AppHeader } from "./app-header";
import { SideNav } from "./dashboard/side-nav";

type DashboardShellProps = {
  children: ReactNode;
  activeNav?: string;
};

export function DashboardShell({ children, activeNav = "dashboard" }: DashboardShellProps) {
  return (
    <div className="min-h-screen bg-aleet-cream pb-10 text-aleet-text">
      <AppHeader />

      <main className="mx-auto mt-6 w-full px-5 sm:mt-8 sm:px-10">
        <section className="grid gap-5 lg:grid-cols-[240px_1fr] lg:gap-8">
          <aside className="rounded-2xl border border-aleet-border bg-aleet-card p-3 shadow-sm lg:p-4">
            <SideNav initialActive={activeNav} />
          </aside>

          <section className="min-w-0 space-y-4">{children}</section>
        </section>
      </main>
    </div>
  );
}
