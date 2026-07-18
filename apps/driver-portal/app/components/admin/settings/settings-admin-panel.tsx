"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { ApiAdmin } from "@/lib/admin-api";
import type { InvestorDocument } from "@/lib/investor-documents-api";
import { AdminSectionTabs } from "@/app/components/admin/admin-section-tabs";
import { AdminsList } from "@/app/components/admin/administrators/admins-list";
import {
  ADMIN_ROLES,
  PERMISSION_COLORS,
  PERMISSION_LABELS,
} from "@/app/components/admin/administrators/admin-types";
import { InvestorDocumentsList } from "@/app/components/admin/investor-documents/investor-documents-list";
import { hasAdminPermission, type AdminPermission } from "@/lib/admin-access";

type Tab = "administrators" | "investor";

type Props = {
  admins: ApiAdmin[];
  documents: InvestorDocument[];
  loadError: string | null;
  permissions: AdminPermission[];
};

export function SettingsAdminPanel({
  admins,
  documents,
  loadError,
  permissions,
}: Props) {
  const canManageAdmins = hasAdminPermission(permissions, "super-admin");
  const searchParams = useSearchParams();
  const initialTab = useMemo<Tab>(() => {
    const tab = searchParams.get("tab");
    if (tab === "investor") return "investor";
    if (tab === "administrators" && canManageAdmins) return "administrators";
    return canManageAdmins ? "administrators" : "investor";
  }, [searchParams, canManageAdmins]);
  const [tab, setTab] = useState<Tab>(initialTab);

  const tabs = [
    ...(canManageAdmins
      ? [{ id: "administrators", label: "Administrators" }]
      : []),
    { id: "investor", label: "Investor Resources" },
  ];

  const roleEntries = Object.entries(ADMIN_ROLES);

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-border bg-card-bg px-5 py-4">
        <h1 className="text-xl font-bold text-text sm:text-2xl">Settings</h1>
        <p className="mt-1 text-sm text-muted">
          Administrators and investor resources
        </p>
        <AdminSectionTabs
          tabs={tabs}
          activeId={tab}
          onChange={(id) => setTab(id as Tab)}
        />
      </div>

      {tab === "administrators" && canManageAdmins ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {roleEntries.map(([, config]) => (
              <div
                key={config.label}
                className="rounded-2xl border border-border bg-card-bg px-5 py-4"
              >
                <p className="mb-1 font-semibold text-gold">{config.label}</p>
                <p className="mb-3 text-xs text-muted">{config.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  {config.permissions.map((p) => (
                    <span
                      key={p}
                      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${PERMISSION_COLORS[p]}`}
                    >
                      {PERMISSION_LABELS[p]}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <AdminsList initialAdmins={admins} />
        </>
      ) : (
        <>
          {loadError ? (
            <p className="rounded-xl border border-red-900/40 bg-red-950/30 px-4 py-3 text-sm text-red-400">
              {loadError}
            </p>
          ) : null}
          <InvestorDocumentsList initialDocuments={documents} />
        </>
      )}
    </div>
  );
}
