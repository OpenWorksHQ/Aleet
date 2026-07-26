"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AdminSectionTabs } from "@/app/components/admin/admin-section-tabs";
import { FinanceDashboard } from "@/app/components/admin/finance/finance-dashboard";
import { CancellationFeesList } from "@/app/components/admin/cancellation-fees/cancellation-fees-list";
import { mockCancellationFees } from "@/app/components/admin/cancellation-fees/cancellation-types";
import { AdminCompanyPayoutsPanel } from "@/app/components/admin/platform/admin-company-payouts-panel";

type Tab = "finance" | "payouts" | "cancellation";

export function FinanceFeesPanel() {
  const searchParams = useSearchParams();
  const initialTab = useMemo<Tab>(() => {
    const t = searchParams.get("tab");
    if (t === "cancellation") return "cancellation";
    if (t === "payouts") return "payouts";
    return "finance";
  }, [searchParams]);
  const [tab, setTab] = useState<Tab>(initialTab);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-text">Finance &amp; Fees</h2>
        <p className="mt-1 text-sm text-muted">
          Revenue, company payouts, and cancellation fees
        </p>
        <AdminSectionTabs
          tabs={[
            { id: "finance", label: "Finance & Revenue" },
            { id: "payouts", label: "Admin Payouts" },
            { id: "cancellation", label: "Cancellation Fees" },
          ]}
          activeId={tab}
          onChange={(id) => setTab(id as Tab)}
        />
      </div>

      {tab === "finance" ? (
        <FinanceDashboard />
      ) : tab === "payouts" ? (
        <AdminCompanyPayoutsPanel />
      ) : (
        <CancellationFeesList initialFees={mockCancellationFees} />
      )}
    </div>
  );
}
