import { DriverSupportPage } from "@/app/components/driver/support/driver-support-page";

export default function SupportPage() {
    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-text">Policies &amp; Support</h1>
                    <p className="text-sm text-muted">Access policies, guidelines, and get support</p>
                </div>
                <button className="flex items-center gap-2 rounded-xl bg-gold px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gold/90">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    Contact Support
                </button>
            </div>
            <DriverSupportPage />
        </div>
    );
}
