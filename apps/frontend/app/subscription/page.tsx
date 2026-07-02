"use client";

import { useState } from "react";
import { DashboardShell } from "../components/dashboard-shell";
import { cn } from "@/lib/utils";

// ─── Mock Data ───────────────────────────────────────────────────────────────

const CURRENT_PLAN = {
    name: "Pro Plan",
    price: 449,
    billingCycle: "quarterly",
    billedAmount: 1347,
    nextBilling: "2024-02-15",
    status: "active",
    hoursPerMonth: 5,
    hoursUsed: 4.2,
};

const SAVINGS_BREAKDOWN = [
    { vehicle: "Black Truck", regularPrice: 150, memberPrice: 89.8, savings: 60 },
    { vehicle: "Luxury Sedan", regularPrice: 120, memberPrice: 89.08, savings: 30 },
    { vehicle: "Sprinter & Stretch", regularPrice: 200, memberPrice: 89.8, savings: 110 },
];

const PLAN_FEATURES = [
    "5 hours per month at locked-in rates",
    "No peak-hour add-ons or extra fees",
    "Priority booking and support",
    "Additional hours at member rates",
];

const ALL_PLANS = [
    {
        key: "basic",
        name: "Basic",
        price: 199,
        billedQuarterly: 597,
        hours: 2,
        features: [
            "2 hours per month",
            "Standard rates apply",
            "Email support",
        ],
        highlight: false,
    },
    {
        key: "pro",
        name: "Premium Membership",
        price: 449,
        billedQuarterly: 1347,
        hours: 5,
        features: [
            "5 hours per month at locked-in rates",
            "No peak-hour add-ons or extra fees",
            "Priority booking and support",
            "Additional hours at member rates",
        ],
        highlight: true,
        current: true,
    },
    {
        key: "elite",
        name: "Elite",
        price: 799,
        billedQuarterly: 2397,
        hours: 10,
        features: [
            "10 hours per month at locked-in rates",
            "No peak-hour add-ons or extra fees",
            "Dedicated concierge support",
            "Additional hours at member rates",
            "Exclusive vehicle access",
        ],
        highlight: false,
    },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SubscriptionPage() {
    const [showPlans, setShowPlans] = useState(false);

    const usagePct = Math.min((CURRENT_PLAN.hoursUsed / CURRENT_PLAN.hoursPerMonth) * 100, 100);

    return (
        <DashboardShell activeNav="subscription">
                    <div className="min-w-0 space-y-6">

                        {/* Page title */}
                        <div>
                            <h1 className="font-serif text-2xl font-medium text-aleet-text sm:text-3xl">Subscription</h1>
                            <p className="mt-1 text-sm text-aleet-text-muted">Manage your membership plan and view savings</p>
                        </div>

                        {/* ── Subscription vs Regular Pricing ── */}
                        <div className="rounded-2xl border border-aleet-border bg-aleet-card p-6">
                            <h2 className="mb-6 text-center text-xl font-medium text-aleet-text">Subscription vs Regular Pricing</h2>

                            <div className="grid gap-6 lg:grid-cols-2">
                                {/* Premium card */}
                                <div className="relative overflow-hidden rounded-2xl p-6 text-white" style={{ background: "linear-gradient(145deg, #d4b896 0%, #c5a386 45%, #9a7d62 100%)" }}>
                                    <p className="text-center font-serif text-2xl font-semibold text-white/95">Premium Membership</p>
                                    <p className="mt-2 text-center">
                                        <span className="text-5xl font-bold text-white">${CURRENT_PLAN.price}</span>
                                        <span className="text-lg text-white/75">/month</span>
                                    </p>
                                    <p className="mt-1 text-center text-sm text-white/70">
                                        Billed quarterly at ${CURRENT_PLAN.billedAmount.toLocaleString("en-US")}
                                    </p>

                                    <div className="mt-5">
                                        <p className="mb-2 text-sm font-semibold text-white/90">What&apos;s Included:</p>
                                        <ul className="space-y-1">
                                            {PLAN_FEATURES.map((f) => (
                                                <li key={f} className="text-sm text-white/75">
                                                    &bull; {f}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div className="mt-6 flex flex-wrap items-center gap-3">
                                        <button
                                            type="button"
                                            className="cursor-pointer rounded-xl bg-aleet-text px-5 py-2.5 text-sm font-bold text-aleet-cream transition-opacity hover:opacity-80"
                                        >
                                            Subscribe Now
                                        </button>
                                        <button
                                            type="button"
                                            className="cursor-pointer text-sm font-medium text-white/70 hover:text-white transition-colors"
                                        >
                                            Skip Now
                                        </button>
                                    </div>
                                </div>

                                {/* Savings breakdown */}
                                <div className="flex flex-col justify-center space-y-3">
                                    <p className="text-base font-medium text-aleet-text">
                                        💰 Your Savings Breakdown:
                                    </p>
                                    {SAVINGS_BREAKDOWN.map((item) => (
                                        <div
                                            key={item.vehicle}
                                            className="flex items-center justify-between gap-3 rounded-2xl border border-aleet-border bg-aleet-cream px-5 py-4"
                                        >
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-aleet-text">{item.vehicle}</p>
                                                <div className="mt-0.5 flex items-center gap-2">
                                                    <span className="text-sm text-aleet-text-subtle line-through">${item.regularPrice}/hr</span>
                                                    <span className="text-sm font-semibold text-aleet-gold">${item.memberPrice}/hr</span>
                                                </div>
                                            </div>
                                            <span className="shrink-0 rounded-full border border-aleet-border bg-aleet-cream px-3 py-1 text-xs font-semibold text-aleet-text-muted">
                                                Save ${item.savings}/hr
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* ── Current Plan Status ── */}
                        <div className="rounded-2xl border border-aleet-border bg-aleet-card p-5 space-y-5">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h2 className="text-base font-medium text-aleet-text">Current Plan</h2>
                                    <p className="text-xs text-aleet-text-muted">Your active membership details</p>
                                </div>
                                <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-400">
                                    Active
                                </span>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-3">
                                <div className="rounded-xl border border-aleet-border bg-aleet-cream px-4 py-3">
                                    <p className="text-[11px] font-medium uppercase tracking-wide text-aleet-text-muted">Plan</p>
                                    <p className="mt-1 text-base font-semibold text-aleet-gold">{CURRENT_PLAN.name}</p>
                                </div>
                                <div className="rounded-xl border border-aleet-border bg-aleet-cream px-4 py-3">
                                    <p className="text-[11px] font-medium uppercase tracking-wide text-aleet-text-muted">Next Billing</p>
                                    <p className="mt-1 text-base font-medium text-aleet-text">{CURRENT_PLAN.nextBilling}</p>
                                </div>
                                <div className="rounded-xl border border-aleet-border bg-aleet-cream px-4 py-3">
                                    <p className="text-[11px] font-medium uppercase tracking-wide text-aleet-text-muted">Monthly Cost</p>
                                    <p className="mt-1 text-base font-medium text-aleet-text">${CURRENT_PLAN.price}/mo</p>
                                </div>
                            </div>

                            {/* Hours usage */}
                            <div className="rounded-xl border border-aleet-border bg-aleet-cream px-4 py-4 space-y-2">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium text-aleet-text">Hours Used This Month</p>
                                    <p className="text-sm font-semibold text-aleet-gold">
                                        {CURRENT_PLAN.hoursUsed}h / {CURRENT_PLAN.hoursPerMonth}h
                                    </p>
                                </div>
                                <div className="h-2 w-full overflow-hidden rounded-full bg-aleet-border">
                                    <div
                                        className="h-full rounded-full bg-aleet-gold transition-all duration-500"
                                        style={{ width: `${usagePct}%` }}
                                    />
                                </div>
                                <p className="text-[11px] text-aleet-text-subtle">
                                    {(CURRENT_PLAN.hoursPerMonth - CURRENT_PLAN.hoursUsed).toFixed(1)}h remaining
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowPlans(true)}
                                    className="cursor-pointer rounded-xl border border-aleet-gold/30 bg-aleet-gold/10 px-4 py-2 text-sm font-semibold text-aleet-gold transition-colors hover:bg-aleet-gold/20"
                                >
                                    Upgrade Plan
                                </button>
                                <button
                                    type="button"
                                    className="cursor-pointer rounded-xl border border-aleet-border bg-aleet-cream px-4 py-2 text-sm font-medium text-aleet-text-muted transition-colors hover:text-aleet-text"
                                >
                                    Cancel Subscription
                                </button>
                            </div>
                        </div>

                        {/* ── All Plans (shown on Upgrade) ── */}
                        {showPlans && (
                            <div className="rounded-2xl border border-aleet-border bg-aleet-card p-5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-base font-medium text-aleet-text">Choose a Plan</h2>
                                        <p className="text-xs text-aleet-text-muted">Billed quarterly — cancel anytime</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowPlans(false)}
                                        className="cursor-pointer text-aleet-text-subtle hover:text-aleet-text-muted transition-colors"
                                        aria-label="Close"
                                    >
                                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
                                            <path d="M18 6 6 18M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

                                <div className="grid gap-3 sm:grid-cols-3">
                                    {ALL_PLANS.map((plan) => (
                                        <div
                                            key={plan.key}
                                            className={cn(
                                                "relative flex flex-col rounded-2xl border p-5",
                                                plan.highlight
                                                    ? "border-aleet-gold/40 bg-aleet-gold/8"
                                                    : "border-aleet-border bg-aleet-cream",
                                            )}
                                        >
                                            {plan.current && (
                                                <span className="absolute right-3 top-3 rounded-full bg-aleet-gold/20 px-2 py-0.5 text-[10px] font-bold text-aleet-gold">
                                                    Current
                                                </span>
                                            )}
                                            {plan.highlight && !plan.current && (
                                                <span className="absolute right-3 top-3 rounded-full bg-aleet-gold px-2 py-0.5 text-[10px] font-bold text-aleet-text">
                                                    Popular
                                                </span>
                                            )}

                                            <p className={cn("text-base font-semibold", plan.highlight ? "text-aleet-gold" : "text-aleet-text")}>
                                                {plan.name}
                                            </p>
                                            <p className="mt-2">
                                                <span className="text-3xl font-bold text-aleet-text">${plan.price}</span>
                                                <span className="text-sm text-aleet-text-muted">/mo</span>
                                            </p>
                                            <p className="mt-0.5 text-[11px] text-aleet-text-subtle">
                                                Billed quarterly at ${plan.billedQuarterly.toLocaleString("en-US")}
                                            </p>
                                            <p className="mt-3 text-xs font-semibold text-aleet-text-muted">
                                                {plan.hours}h / month included
                                            </p>

                                            <ul className="mt-3 flex-1 space-y-1.5">
                                                {plan.features.map((f) => (
                                                    <li key={f} className="flex items-start gap-1.5 text-[12px] text-aleet-text-muted">
                                                        <svg className="mt-0.5 h-3 w-3 shrink-0 text-aleet-gold" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                                                            <path d="M20 6 9 17l-5-5" />
                                                        </svg>
                                                        {f}
                                                    </li>
                                                ))}
                                            </ul>

                                            <button
                                                type="button"
                                                className={cn(
                                                    "mt-5 w-full cursor-pointer rounded-xl py-2.5 text-sm font-semibold transition-opacity hover:opacity-80",
                                                    plan.current
                                                        ? "border border-aleet-border bg-transparent text-aleet-text-subtle cursor-default"
                                                        : plan.highlight
                                                            ? "bg-aleet-gold text-aleet-text"
                                                            : "border border-aleet-gold/30 bg-transparent text-aleet-gold",
                                                )}
                                                disabled={plan.current}
                                            >
                                                {plan.current ? "Current Plan" : "Select Plan"}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}



                    </div>
        </DashboardShell>
    );
}
