"use client";

import { AleetLogo } from "@/app/components/ui/aleet-logo";

function clearAuthCookies() {
    const expired = "path=/; max-age=0; SameSite=Lax";
    document.cookie = `auth_token=; ${expired}`;
    document.cookie = `auth_role=; ${expired}`;
    document.cookie = `driver_status=; ${expired}`;
}

export function RejectedPage() {
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
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 text-red-400">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="15" y1="9" x2="9" y2="15" />
                                <line x1="9" y1="9" x2="15" y2="15" />
                            </svg>
                        </div>
                    </div>

                    {/* Title */}
                    <div className="mb-8 text-center">
                        <h1 className="text-2xl font-bold text-text">Application Rejected</h1>
                        <p className="mt-2 text-sm leading-relaxed text-muted">
                            After careful review, our team was unable to approve your driver registration at this time.
                        </p>
                    </div>

                    {/* Info card */}
                    <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
                        <div className="mb-4 flex items-center gap-2.5">
                            <span className="flex h-2 w-2 rounded-full bg-red-400" />
                            <span className="text-xs font-semibold uppercase tracking-wide text-red-400">Registration Declined</span>
                        </div>
                        <p className="text-sm leading-relaxed text-muted">
                            This decision was made following a review of your submitted documents and background check results.
                            If you believe this is an error or have additional information to provide, please reach out to our support team.
                        </p>
                    </div>

                    {/* What to do next */}
                    <div className="mb-6 rounded-2xl border border-border bg-card-bg p-5">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">What you can do</p>
                        <div className="flex flex-col gap-3">
                            <div className="flex items-start gap-3">
                                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border bg-page-bg text-[10px] font-bold text-muted">1</div>
                                <p className="text-sm text-muted">Contact our support team for clarification on the decision.</p>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border bg-page-bg text-[10px] font-bold text-muted">2</div>
                                <p className="text-sm text-muted">Ensure your documents are valid, clear, and up to date.</p>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border bg-page-bg text-[10px] font-bold text-muted">3</div>
                                <p className="text-sm text-muted">You may reapply in the future if the issue is resolved.</p>
                            </div>
                        </div>
                    </div>

                    {/* Sign out */}
                    <button
                        onClick={() => { clearAuthCookies(); window.location.href = "/login"; }}
                        className="inline-flex w-full items-center justify-center rounded-xl border border-border px-4 py-3 text-sm font-medium text-muted transition-colors hover:border-border/60 hover:text-text"
                    >
                        Sign out
                    </button>
                </div>
            </main>
        </div>
    );
}
