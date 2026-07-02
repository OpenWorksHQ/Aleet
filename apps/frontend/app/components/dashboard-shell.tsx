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

      <main className="mx-auto mt-8 w-full px-5 sm:px-10">
        <section className="grid gap-4 lg:grid-cols-[92px_1fr]">
          <aside className="overflow-hidden rounded-xl border border-aleet-border bg-aleet-card p-1.5 shadow-sm">
            <SideNav initialActive={activeNav} />
          </aside>

          <section className="min-w-0 space-y-4">{children}</section>
        </section>
      </main>
    </div>
  );
}
