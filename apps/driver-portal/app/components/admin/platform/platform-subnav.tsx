"use client";

import { usePathname } from "next/navigation";
import { AdminLinkTabs } from "@/app/components/admin/admin-section-tabs";

export function PlatformSubnav() {
  const pathname = usePathname();

  return (
    <div className="rounded-2xl border border-border bg-card-bg px-5 py-4">
      <h1 className="text-xl font-bold text-text sm:text-2xl">Platform</h1>
      <p className="mt-1 text-sm text-muted">
        Configure catalog, memberships, and finance
      </p>
      <AdminLinkTabs
        tabs={[
          {
            href: "/admin/platform",
            label: "Platform Details",
            active: pathname === "/admin/platform",
          },
          {
            href: "/admin/platform/memberships",
            label: "Memberships",
            active: pathname.startsWith("/admin/platform/memberships"),
          },
          {
            href: "/admin/platform/finance",
            label: "Finance & Fees",
            active: pathname.startsWith("/admin/platform/finance"),
          },
        ]}
      />
    </div>
  );
}
