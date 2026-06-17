"use client";

import { useEffect } from "react";
import { AleetLogo } from "@/app/components/ui/aleet-logo";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";
const POLL_INTERVAL_MS = 15_000;

function getAuthToken(): string | null {
    return (
        document.cookie
            .split("; ")
            .find((c) => c.startsWith("auth_token="))
            ?.split("=")[1] ?? null
    );
}

function clearAuthCookies() {
    const expired = "path=/; max-age=0; SameSite=Lax";
    document.cookie = `auth_token=; ${expired}`;
    document.cookie = `auth_role=; ${expired}`;
    document.cookie = `driver_status=; ${expired}`;
}

const CHECKLIST = [
    { label: "Identity verification", description: "Government-issued ID and personal details" },
    { label: "Background check", description: "Criminal record and driving history review" },
    { label: "Document review", description: "License, vehicle, and insurance documents" },
    { label: "Final approval", description: "Admin review and account activation" },
];

const DASHBOARD_STATUSES = new Set([
    "active",
    "approved",
    "background_completed",
    "needs_revision",
    "revision_complete",
]);

export function PendingReviewPage() {
    useEffect(() => {
        const check = async () => {
            const token = getAuthToken();
            if (!token) return;
            try {
                const res = await fetch(`${BASE_URL}/api/users/profile`, {
                    headers: { Authorization: `Bearer ${token}` },
                    cache: "no-store",
                });
                if (!res.ok) return;
                const json = await res.json();
                const status: string = json.data?.driver?.status ?? json.driver?.status ?? "";
                if (status === "rejected") {
                    document.cookie = `driver_status=rejected; path=/; max-age=604800; SameSite=Lax`;
                    window.location.href = "/rejected";
                } else if (DASHBOARD_STATUSES.has(status)) {
                    document.cookie = `driver_status=${status}; path=/; max-age=604800; SameSite=Lax`;
                    window.location.href = "/driver";
                }
            } catch {
                // network error — try again on next tick
            }
        };

        check();
        const id = setInterval(check, POLL_INTERVAL_MS);
        return () => clearInterval(id);
    }, []);

    return (
        <div className="flex min-h-screen flex-col bg-page-bg">
            {/* Minimal header */}
            <header className="flex items-center justify-between border-b border-border bg-card-bg px-6 py-4">
                <div className="flex items-center gap-2.5">
                    <AleetLogo className="h-7 w-7" />
                    <span className="text-base font-semibold text-gold">Aleet</span>
                </div>
                <button
                    onClick={() => { clearAuthCookies(); window.location.href = "/login"; }}
                    className="text-xs text-muted transition-colors hover:text-gold"
                >
                    Sign out
                </button>
            </header>

            {/* Content */}
            <main className="flex flex-1 items-center justify-center px-4 py-16">
                <div className="w-full max-w-md">

                    {/* Icon */}
                    <div className="mb-6 flex justify-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-gold/20 bg-gold/10">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 text-gold">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                <polyline points="9 12 11 14 15 10" />
                            </svg>
                        </div>
                    </div>

                    {/* Title */}
                    <div className="mb-8 text-center">
                        <h1 className="text-2xl font-bold text-text">Account Under Review</h1>
                        <p className="mt-2 text-sm leading-relaxed text-muted">
                            Your application has been submitted successfully. Our team is reviewing your documents and will notify you once your account is approved.
                        </p>
                    </div>

                    {/* Status card */}
                    <div className="mb-6 rounded-2xl border border-border bg-card-bg p-5">
                        <div className="mb-4 flex items-center gap-2.5">
                            <span className="flex h-2 w-2 rounded-full bg-amber-400" />
                            <span className="text-xs font-semibold uppercase tracking-wide text-amber-400">Pending Review</span>
                        </div>

                        <div className="flex flex-col gap-3">
                            {CHECKLIST.map((item, i) => (
                                <div key={i} className="flex items-start gap-3">
                                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border bg-page-bg">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 text-muted/40">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-text">{item.label}</p>
                                        <p className="text-xs text-muted">{item.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Timeline note */}
                    <div className="mb-4 rounded-xl border border-gold/20 bg-gold/5 px-4 py-3 text-center">
                        <p className="text-xs text-gold/80">
                            Review typically takes <span className="font-semibold text-gold">1–3 business days</span>.<br />
                            You&apos;ll receive an email when your account is approved.
                        </p>
                    </div>

                    {/* Checkr note */}
                    <div className="mb-6 rounded-xl border border-border bg-card-bg px-4 py-3">
                        <p className="text-xs text-muted">
                            <span className="font-semibold text-text">Background check:</span> You will receive a separate email from{" "}
                            <span className="font-medium text-text">Checkr</span> to complete your background check independently. Please check your inbox and follow their instructions.
                        </p>
                    </div>

                    {/* Support link */}
                    <p className="text-center text-xs text-muted">
                        Have questions?{" "}
                        <a href="mailto:support@aleet.com" className="text-gold hover:underline">
                            Contact support
                        </a>
                    </p>
                </div>
            </main>
        </div>
    );
}
