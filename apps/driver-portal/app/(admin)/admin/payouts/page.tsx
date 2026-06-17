import { mockPayouts } from "@/app/components/admin/payouts/payout-types";
import { PayoutsList } from "@/app/components/admin/payouts/payouts-list";

export const metadata = {
    title: "Payouts — Aleet Admin",
};

export default function PayoutsPage() {
    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-text sm:text-3xl">Payouts</h1>
                    <p className="mt-1 text-sm text-muted">Manage driver payouts via Stripe Connect</p>
                </div>
                <div className="flex items-center gap-2">
                    <button className="flex h-12.5 items-center gap-2 rounded-xl border border-border px-5 text-sm font-medium text-muted transition-colors hover:border-gold/40 hover:text-text sm:h-13">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        Export
                    </button>
                    <button className="flex items-center gap-2 rounded-xl border border-gold/40 bg-gold/10 px-4 py-2 text-sm font-medium text-gold transition-colors hover:bg-gold/20">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="16" />
                            <line x1="8" y1="12" x2="16" y2="12" />
                        </svg>
                        Run Weekly Payout
                    </button>
                </div>
            </div>

            <PayoutsList initialPayouts={mockPayouts} />
        </div>
    );
}
