import { Suspense } from "react";
import { DriverBankPage } from "@/app/components/driver/bank/driver-bank-page";

export default function BankPage() {
    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-text">Bank Account</h1>
                    <p className="text-sm text-muted">Manage your payout account and payment details</p>
                </div>
            </div>
            <Suspense
                fallback={
                    <div className="rounded-2xl border border-border bg-card-bg p-6 text-sm text-muted">
                        Loading bank account details...
                    </div>
                }
            >
                <DriverBankPage />
            </Suspense>
        </div>
    );
}
