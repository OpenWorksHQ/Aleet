"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { AdminPartnersPage, PartnerApplicationsPage } from "@/lib/admin-api";
import { fetchPartnerUpdateRequestsClient } from "@/lib/admin-api";
import { PartnerApplicationsList } from "./partner-applications-list";
import { ActivePartnersList } from "./active-partners-list";
import { PartnerUpdateRequestsList } from "./partner-update-requests-list";

type Tab = "applications" | "partners" | "updates";

type Props = {
  initialApplications: PartnerApplicationsPage;
  initialPartners: AdminPartnersPage;
};

export function PartnersAdminPanel({ initialApplications, initialPartners }: Props) {
  const [tab, setTab] = useState<Tab>("applications");
  const [pendingUpdateCount, setPendingUpdateCount] = useState(0);
  const pendingAppCount = initialApplications.applications.filter((a) => a.status === "pending").length;

  useEffect(() => {
    void fetchPartnerUpdateRequestsClient({ status: "pending", limit: 1 })
      .then((res) => setPendingUpdateCount(res.pagination.total))
      .catch(() => setPendingUpdateCount(0));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-border bg-card-bg px-5 py-4">
        <h1 className="text-xl font-bold text-text sm:text-2xl">Partners</h1>
        <p className="mt-1 text-sm text-muted">
          Review applications, manage partners, and approve profile update requests.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <TabButton
            active={tab === "applications"}
            onClick={() => setTab("applications")}
            badge={pendingAppCount > 0 ? pendingAppCount : undefined}
          >
            Applications
          </TabButton>
          <TabButton active={tab === "partners"} onClick={() => setTab("partners")}>
            Active partners
          </TabButton>
          <TabButton
            active={tab === "updates"}
            onClick={() => setTab("updates")}
            badge={pendingUpdateCount > 0 ? pendingUpdateCount : undefined}
          >
            Update requests
          </TabButton>
        </div>
      </div>

      {tab === "applications" ? (
        <PartnerApplicationsList initialData={initialApplications} />
      ) : tab === "partners" ? (
        <ActivePartnersList initialData={initialPartners} />
      ) : (
        <PartnerUpdateRequestsList />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  badge,
  children,
}: {
  active: boolean;
  onClick: () => void;
  badge?: number;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors",
        active
          ? "border-gold/40 bg-gold/15 text-gold"
          : "border-border text-muted hover:text-text",
      )}
    >
      {children}
      {badge != null ? (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1.5 text-[11px] font-bold text-[#1a1200]">
          {badge}
        </span>
      ) : null}
    </button>
  );
}
