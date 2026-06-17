import { mockCancellationFees } from "@/app/components/admin/cancellation-fees/cancellation-types";
import { CancellationFeesList } from "@/app/components/admin/cancellation-fees/cancellation-fees-list";

export default function CancellationFeesPage() {
    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-text sm:text-2xl">Cancellation Fees</h1>
                    <p className="text-sm text-muted">Monitor and manage trip cancellation fees</p>
                </div>
            </div>

            <CancellationFeesList initialFees={mockCancellationFees} />
        </div>
    );
}
