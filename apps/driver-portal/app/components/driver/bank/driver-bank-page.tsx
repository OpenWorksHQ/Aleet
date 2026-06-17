"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    connectStripeClient,
    fetchStripeStatusClient,
    type StripeStatus,
    type StripeStatusResponse,
} from "@/lib/bank-accounts-api";

type UiStatus = "active" | "pending" | "not_connected" | "error";

const STATUS_STYLES: Record<UiStatus, string> = {
    active: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    pending: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    not_connected: "border-border bg-border/20 text-muted",
    error: "border-red-500/30 bg-red-500/10 text-red-400",
};

const STATUS_LABELS: Record<UiStatus, string> = {
    active: "Active",
    pending: "Pending Review",
    not_connected: "Not Connected",
    error: "Status Error",
};

function mapStripeToUiStatus(status: StripeStatus): UiStatus {
    if (status === "active") return "active";
    if (status === "pending") return "pending";
    if (status === "not_started") return "not_connected";
    return "error";
}

export function DriverBankPage() {
    const [stripeStatus, setStripeStatus] = useState<StripeStatusResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const stripeQueryState = searchParams.get("stripe");

    const uiStatus = useMemo<UiStatus>(() => {
        if (!stripeStatus) return "not_connected";
        return mapStripeToUiStatus(stripeStatus.status);
    }, [stripeStatus]);

    const isActive = uiStatus === "active";
    const isPending = uiStatus === "pending";
    const isNotConnected = uiStatus === "not_connected";
    const isError = uiStatus === "error";

    const loadStripeStatus = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const status = await fetchStripeStatusClient();
            setStripeStatus(status);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load Stripe status.");
            setStripeStatus({
                connected: false,
                status: "error",
                message: "Could not retrieve account status from Stripe",
            });
        } finally {
            setIsLoading(false);
        }
    }, []);

    const startStripeOnboarding = useCallback(async () => {
        setIsConnecting(true);
        setError(null);
        try {
            const { onboardingUrl } = await connectStripeClient();
            window.location.href = onboardingUrl;
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to start Stripe onboarding.");
            setIsConnecting(false);
        }
    }, []);

    useEffect(() => {
        void loadStripeStatus();
    }, [loadStripeStatus]);

    useEffect(() => {
        if (!stripeQueryState) return;

        if (stripeQueryState === "refresh") {
            void startStripeOnboarding();
            return;
        }

        if (stripeQueryState === "success") {
            void loadStripeStatus().finally(() => {
                router.replace(pathname);
            });
        }
    }, [loadStripeStatus, pathname, router, startStripeOnboarding, stripeQueryState]);

    const requirementsDue = stripeStatus?.details?.requirements_due ?? [];

    return (
        <div className="flex flex-col gap-5">
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <div className="rounded-2xl border border-border bg-card-bg p-5 sm:p-6">
                    <div className="mb-5 flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gold/10">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-gold">
                                <rect x="2" y="5" width="20" height="14" rx="2" />
                                <line x1="2" y1="10" x2="22" y2="10" />
                            </svg>
                        </div>
                        <h3 className="text-base font-semibold text-text">Account Status</h3>
                    </div>

                    {error && (
                        <p className="mb-4 rounded-lg border border-red-900/40 bg-red-950/30 px-4 py-2.5 text-sm text-red-400">
                            {error}
                        </p>
                    )}

                    <div className="flex flex-col gap-3">
                        <div className={cn(
                            "flex items-center justify-between rounded-xl border p-4",
                            isActive ? "border-emerald-500/20 bg-emerald-500/5" : "border-border bg-page-bg/60",
                        )}>
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "flex h-9 w-9 items-center justify-center rounded-xl",
                                    isActive ? "bg-emerald-500/10" : "bg-border/40",
                                )}>
                                    {isActive ? (
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4.5 w-4.5 text-emerald-400">
                                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                            <polyline points="22 4 12 14.01 9 11.01" />
                                        </svg>
                                    ) : (
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4.5 w-4.5 text-muted">
                                            <rect x="2" y="5" width="20" height="14" rx="2" />
                                            <line x1="2" y1="10" x2="22" y2="10" />
                                        </svg>
                                    )}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-text">Stripe Connect</p>
                                    <p className="text-xs text-muted">
                                        {isLoading
                                            ? "Checking account status..."
                                            : isActive
                                              ? "Active and ready"
                                              : isPending
                                                ? "Onboarding in progress"
                                                : isError
                                                  ? "Could not verify status"
                                                  : "Not configured"}
                                    </p>
                                </div>
                            </div>
                            <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-medium", STATUS_STYLES[uiStatus])}>
                                {STATUS_LABELS[uiStatus]}
                            </span>
                        </div>

                        <div className="flex items-center justify-between rounded-xl border border-border bg-page-bg/60 px-4 py-3">
                            <div className="flex items-center gap-2.5">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-muted">
                                    <line x1="12" y1="1" x2="12" y2="23" />
                                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                                </svg>
                                <span className="text-sm text-text">Payouts Enabled</span>
                            </div>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={cn("h-4 w-4", isActive ? "text-emerald-400" : "text-muted")}>
                                {isActive ? <polyline points="20 6 9 17 4 12" /> : <line x1="18" y1="6" x2="6" y2="18" />}
                            </svg>
                        </div>

                        <div className="flex items-center justify-between rounded-xl border border-border bg-page-bg/60 px-4 py-3">
                            <div className="flex items-center gap-2.5">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-muted">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                    <line x1="16" y1="2" x2="16" y2="6" />
                                    <line x1="8" y1="2" x2="8" y2="6" />
                                    <line x1="3" y1="10" x2="21" y2="10" />
                                </svg>
                                <span className="text-sm text-text">Next Payout</span>
                            </div>
                            <span className="text-sm font-medium text-text">
                                {isActive ? "1–3 business days" : "—"}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-border bg-card-bg p-5 sm:p-6">
                    <div className="mb-5 flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gold/10">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-gold">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                <polyline points="22 4 12 14.01 9 11.01" />
                            </svg>
                        </div>
                        <h3 className="text-base font-semibold text-text">Setup Instructions</h3>
                    </div>

                    <p className="mb-4 text-sm text-muted">
                        Connect your Stripe account to receive payouts from completed trips.
                        Stripe securely handles all sensitive bank details.
                    </p>

                    <div className="mb-4 rounded-xl border border-gold/20 bg-gold/5 p-4">
                        <p className="mb-2 text-xs font-semibold text-gold">What you&apos;ll need:</p>
                        <ul className="flex flex-col gap-1.5">
                            {[
                                "Government-issued ID",
                                "Tax identification number (SSN or EIN)",
                                "Business information (if applicable)",
                                "Bank account details on Stripe form",
                            ].map((item) => (
                                <li key={item} className="flex items-start gap-2 text-xs text-gold/80">
                                    <span className="mt-0.5 shrink-0">•</span>
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <p className="mb-2.5 text-xs font-semibold text-text">Process:</p>
                        <ol className="flex flex-col gap-2">
                            {[
                                "Click Setup or Complete Setup",
                                "Finish Stripe secure onboarding",
                                "Return to Aleet and verify status",
                                "Start receiving payouts automatically",
                            ].map((step, i) => (
                                <li key={i} className="flex items-start gap-2.5 text-xs text-muted">
                                    <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border border-border bg-page-bg text-[10px] font-bold text-text">
                                        {i + 1}
                                    </span>
                                    {step}
                                </li>
                            ))}
                        </ol>
                    </div>
                </div>
            </div>

            {isActive && (
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-center">
                    <div className="mb-1 flex items-center justify-center gap-2">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-emerald-400">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                            <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                        <p className="text-base font-bold text-emerald-400">Account Active!</p>
                    </div>
                    <p className="mb-5 text-sm text-muted">
                        Your Stripe account is connected and payouts are enabled.
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-3">
                        <button
                            onClick={() => void loadStripeStatus()}
                            className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-2.5 text-sm font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20"
                        >
                            Refresh Status
                        </button>
                        <button
                            disabled={isConnecting}
                            onClick={() => void startStripeOnboarding()}
                            className="rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-muted transition-colors hover:border-gold/40 hover:text-gold disabled:opacity-60"
                        >
                            Update Account Details
                        </button>
                    </div>
                </div>
            )}

            {isPending && (
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 text-center">
                    <div className="mb-1 flex items-center justify-center gap-2">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-amber-400">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                        </svg>
                        <p className="text-base font-bold text-amber-400">Onboarding Incomplete</p>
                    </div>
                    <p className="mb-4 text-sm text-muted">
                        Complete Stripe setup to enable payouts.
                    </p>
                    {requirementsDue.length > 0 && (
                        <p className="mb-4 text-xs text-amber-300">
                            Pending requirements: {requirementsDue.join(", ")}
                        </p>
                    )}
                    <button
                        disabled={isConnecting}
                        onClick={() => void startStripeOnboarding()}
                        className="rounded-xl bg-gold px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gold/90 disabled:opacity-60"
                    >
                        {isConnecting ? "Redirecting..." : "Complete Setup"}
                    </button>
                </div>
            )}

            {isNotConnected && (
                <div className="rounded-2xl border border-border bg-card-bg p-6 text-center">
                    <p className="mb-1 text-base font-bold text-text">Connect Your Stripe Account</p>
                    <p className="mb-5 text-sm text-muted">
                        You need to connect Stripe before you can receive payouts.
                    </p>
                    <button
                        disabled={isConnecting}
                        onClick={() => void startStripeOnboarding()}
                        className="rounded-xl bg-gold px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gold/90 disabled:opacity-60"
                    >
                        {isConnecting ? "Redirecting..." : "Setup Bank Account"}
                    </button>
                </div>
            )}
        </div>
    );
}
