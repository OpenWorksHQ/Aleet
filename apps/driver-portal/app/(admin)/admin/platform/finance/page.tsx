import { Suspense } from "react";
import { FinanceFeesPanel } from "@/app/components/admin/platform/finance-fees-panel";

export const metadata = {
  title: "Finance & Fees — Aleet Admin",
};

export default function PlatformFinancePage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted">Loading…</div>}>
      <FinanceFeesPanel />
    </Suspense>
  );
}
