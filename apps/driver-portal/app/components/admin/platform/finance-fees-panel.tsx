"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AdminSectionTabs } from "@/app/components/admin/admin-section-tabs";
import { FinanceDashboard } from "@/app/components/admin/finance/finance-dashboard";
import { CancellationFeesList } from "@/app/components/admin/cancellation-fees/cancellation-fees-list";
import { mockCancellationFees } from "@/app/components/admin/cancellation-fees/cancellation-types";

type Tab = "finance" | "cancellation";

export function FinanceFeesPanel() {
  const searchParams = useSearchParams();
  const initialTab = useMemo<Tab>(() => {
    return searchParams.get("tab") === "cancellation" ? "cancellation" : "finance";
  }, [searchParams]);
  const [tab, setTab] = useState<Tab>(initialTab);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-text">Finance &amp; Fees</h2>
        <p className="mt-1 text-sm text-muted">
          Revenue, payouts, and cancellation fees
        </p>
        <AdminSectionTabs
          tabs={[
            { id: "finance", label: "Finance & Revenue" },
            { id: "cancellation", label: "Cancellation Fees" },
          ]}
          activeId={tab}
          onChange={(id) => setTab(id as Tab)}
        />
      </div>

      {tab === "finance" ? (
        <FinanceDashboard />
      ) : (
        <CancellationFeesList initialFees={mockCancellationFees} />
      )}
    </div>
  );
}
