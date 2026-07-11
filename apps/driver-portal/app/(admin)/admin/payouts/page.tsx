import { FinanceDashboard } from "@/app/components/admin/finance/finance-dashboard";

export const metadata = {
    title: "Finance & Revenue — Aleet Admin",
};

export default function PayoutsPage() {
    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-2xl font-bold text-text sm:text-3xl">Finance &amp; Revenue</h1>
                <p className="mt-1 text-sm text-muted">
                    Company revenue vs. driver payouts — live from completed trips
                </p>
            </div>
            <FinanceDashboard />
        </div>
    );
}
