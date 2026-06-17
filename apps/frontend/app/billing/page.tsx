"use client";

import { useState } from "react";
import Link from "next/link";
import { SiteMenu } from "../components/site-menu";
import { SideNav } from "@/app/components/dashboard/side-nav";
import { cn } from "@/lib/utils";

// ─── Mock Data ──────────────────────────────────────────────────────────────

const MOCK_PENDING_CHARGES = [
    { _id: "c1", name: "Pro Plan - February 2026", type: "subscription", dueDate: "2024-02-15", amount: 299.99 },
    { _id: "c2", name: "Additional Hours (15h)", type: "average", dueDate: "2024-02-15", amount: 75.0 },
    { _id: "c3", name: "Premium Support Add-on", type: "addon", dueDate: "2024-02-15", amount: 49.99 },
];

const MOCK_INVOICES = [
    { _id: "inv12", number: "NV-2023-012", description: "Monthly Subscription - Pro Plan", date: "2024-01-15", amount: 299.99, status: "paid" },
    { _id: "inv11", number: "INV-2023-011", description: "Monthly Subscription - Pro Plan", date: "2023-11-15", amount: 299.99, status: "paid" },
    { _id: "inv10", number: "INV-2023-010", description: "Monthly Subscription - Standard Plan", date: "2024-01-15", amount: 199.99, status: "paid" },
    { _id: "inv9", number: "INV-2023-009", description: "Monthly Subscription - Basic Plan", date: "2023-09-15", amount: 0, status: "paid" },
    { _id: "inv8", number: "INV-2023-008", description: "Monthly Subscription - Basic Plan", date: "2023-08-15", amount: 0, status: "paid" },
];

const MOCK_PAYMENT_METHODS = [
    { _id: "pm1", type: "visa", last4: "4242", expires: "12/25", isDefault: true },
    { _id: "pm2", type: "mastercard", last4: "5555", expires: "08/26", isDefault: false },
    { _id: "pm3", type: "bank", last4: "1234", expires: null, isDefault: false },
];

const MOCK_BOOKINGS_BILLING = [
    {
        _id: "b1",
        destination: "Chicago, United States",
        startDate: "2024-03-15",
        endDate: "2024-03-22",
        status: "upcoming",
        amount: 2499.99,
        cancellationPolicy: "Free cancellation until 7 days before departure",
        potentialRefund: 2499.99,
    },
    {
        _id: "b2",
        destination: "New York, USA",
        startDate: "2024-01-05",
        endDate: "2024-01-12",
        status: "completed",
        amount: 2499.99,
        cancellationPolicy: "Non-refundable",
        potentialRefund: null,
    },
];

const NOTIFICATION_PREFS = [
    { key: "payment_confirmations", label: "Payment Confirmations", description: "Get notified when payments are processed", emailOn: true, smsOn: true },
    { key: "invoice_reminders", label: "Invoice Reminders", description: "Reminders before your payment is due", emailOn: false, smsOn: true },
    { key: "usage_alerts", label: "Usage Alerts", description: "Alerts when you approach your plan limits", emailOn: true, smsOn: false },
    { key: "trip_updates", label: "Trip Updates", description: "Updates about your upcoming trips", emailOn: false, smsOn: false },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function CardBrand({ type }: { type: string }) {
    if (type === "visa") return <span className="font-bold tracking-wide">Visa</span>;
    if (type === "mastercard") return <span className="font-bold tracking-wide">Mastercard</span>;
    return <span className="font-bold tracking-wide">Bank Account</span>;
}

function ChargeBadge({ type }: { type: string }) {
    const styles: Record<string, string> = {
        subscription: "bg-[#bca066]/20 text-[#bca066]",
        average: "bg-white/10 text-white/60",
        addon: "bg-[#1e2b2c] text-white/50",
    };
    return (
        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize", styles[type] ?? "bg-white/10 text-white/50")}>
            {type}
        </span>
    );
}

function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        upcoming: "bg-[#bca066]/20 text-[#bca066]",
        completed: "bg-white/10 text-white/50",
        paid: "text-white/40",
        refunded: "bg-red-900/20 text-red-400",
    };
    return (
        <span className={cn("text-xs", styles[status] ?? "text-white/40")}>
            {status}
        </span>
    );
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
    return (
        <button
            type="button"
            onClick={onToggle}
            className={cn(
                "relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full transition-colors duration-200",
                on ? "bg-[#8a7040]" : "bg-[#1e2b2c]",
            )}
            aria-pressed={on}
        >
            <span
                className={cn(
                    "inline-block h-4.5 w-4.5 rounded-full bg-white shadow transition-transform duration-200",
                    on ? "translate-x-5.5" : "translate-x-1",
                )}
                style={{ height: "18px", width: "18px" }}
            />
        </button>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BillingPage() {
    const [notifPrefs, setNotifPrefs] = useState(NOTIFICATION_PREFS);
    const [paymentMethods] = useState(MOCK_PAYMENT_METHODS);

    function toggleNotif(key: string, channel: "email" | "sms") {
        setNotifPrefs((prev) =>
            prev.map((n) =>
                n.key === key
                    ? { ...n, emailOn: channel === "email" ? !n.emailOn : n.emailOn, smsOn: channel === "sms" ? !n.smsOn : n.smsOn }
                    : n,
            ),
        );
    }

    const totalPending = MOCK_PENDING_CHARGES.reduce((s, c) => s + c.amount, 0);

    return (
        <div className="min-h-screen bg-[#050d0c] pb-16 text-white">
            {/* Header */}
            <header className="sticky top-0 z-40 w-full border-b border-white/6 bg-[#050d0c]">
                <div className="flex h-14 w-full items-center justify-between px-4 sm:h-16 sm:px-8">
                    <SiteMenu />
                    <Link href="/" className="inline-flex items-center gap-2.5 text-[#bca066] no-underline" aria-label="Aleet home">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border-[3px] border-[#bca066] font-serif text-[18px] leading-none font-semibold sm:h-9 sm:w-9 sm:text-[20px]">A</span>
                        <span className="text-[22px] leading-none font-semibold tracking-[-0.02em] sm:text-[26px]">Aleet</span>
                    </Link>
                    <div className="w-9 sm:w-10" />
                </div>
            </header>

            <main className="mx-auto mt-8 w-full px-5 sm:px-10">
                <section className="grid gap-4 lg:grid-cols-[92px_1fr]">
                    {/* Sidebar */}
                    <aside className="overflow-hidden rounded-xl border border-[#1e2b2c] bg-[rgba(8,19,18,0.62)] p-1.5">
                        <SideNav initialActive="payments" />
                    </aside>

                    {/* Content */}
                    <div className="min-w-0 space-y-6">

                        {/* Page title */}
                        <div>
                            <h1 className="text-2xl font-semibold text-white sm:text-3xl">Billing &amp; Payments</h1>
                            <p className="mt-1 text-sm text-white/40">Manage your account, view invoices, and control your payment methods with complete transparency</p>
                        </div>

                        {/* ── Stats row ── */}
                        <div className="grid gap-3 sm:grid-cols-3">
                            {/* Current Balance */}
                            <div className="flex items-center gap-4 rounded-2xl border border-[#1e2b2c] bg-[rgba(6,17,16,0.7)] px-5 py-4">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#bca066]/30 bg-[#bca066]/10">
                                    <svg className="h-5 w-5 text-[#bca066]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                        <circle cx="12" cy="12" r="10" />
                                        <path d="M9 9h1.5a1.5 1.5 0 0 1 0 3H9m0-3v6m0-6h6m-6 6h4.5a1.5 1.5 0 0 0 0-3" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-white/40">Current Balance</p>
                                    <p className="text-2xl font-bold text-white">$25.00</p>
                                    <p className="text-[11px] text-white/30">Next billing: Feb 15, 2024</p>
                                </div>
                            </div>

                            {/* Usage This Month */}
                            <div className="flex items-center gap-4 rounded-2xl border border-[#1e2b2c] bg-[rgba(6,17,16,0.7)] px-5 py-4">
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-xs font-medium text-white/40">Usage This Month</p>
                                        <span className="rounded-full bg-[#bca066]/20 px-2 py-0.5 text-[10px] font-bold text-[#bca066]">Pro Plan</span>
                                    </div>
                                    <p className="mt-0.5 text-2xl font-bold text-white">87h</p>
                                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                                        <div className="h-full rounded-full bg-[#bca066]" style={{ width: "87%" }} />
                                    </div>
                                    <p className="mt-1 text-[11px] text-white/30">87 used &nbsp;·&nbsp; 100h limit</p>
                                </div>
                            </div>

                            {/* Account Status */}
                            <div className="flex items-center gap-4 rounded-2xl border border-[#1e2b2c] bg-[rgba(6,17,16,0.7)] px-5 py-4">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10">
                                    <svg className="h-5 w-5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                        <path d="M20 6 9 17l-5-5" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-white/40">Account Status</p>
                                    <p className="text-xl font-bold text-emerald-400">Active</p>
                                    <p className="text-[11px] text-white/30">Auto-renewal enabled</p>
                                </div>
                            </div>
                        </div>

                        {/* ── Billing Overview + Payment Methods ── */}
                        <div className="grid gap-4 lg:grid-cols-2">

                            {/* Billing Overview */}
                            <div className="rounded-2xl border border-[#1e2b2c] bg-[rgba(6,17,16,0.7)] p-5 space-y-4">
                                <div>
                                    <h2 className="text-base font-semibold text-white">Billing Overview</h2>
                                    <p className="text-xs text-white/40">Upcoming charges and billing details</p>
                                </div>

                                {/* Next Payment banner */}
                                <div className="flex items-center justify-between rounded-xl bg-[#bca066]/15 border border-[#bca066]/20 px-4 py-3.5">
                                    <div>
                                        <p className="text-xs font-semibold text-[#bca066]/70">Next Payment</p>
                                        <p className="text-[11px] text-[#bca066]/50">Due February 15, 2024</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-bold text-[#bca066]">${totalPending.toFixed(2)}</p>
                                        <p className="text-[10px] text-[#bca066]/50">Auto-charge enabled</p>
                                    </div>
                                </div>

                                {/* Pending Charges */}
                                <div className="space-y-1">
                                    <p className="text-xs font-semibold text-white/50 uppercase tracking-wide mb-2">Pending Charges</p>
                                    {MOCK_PENDING_CHARGES.map((charge) => (
                                        <div key={charge._id} className="flex items-center justify-between gap-3 rounded-xl border border-[#1e2b2c] bg-[#0a1513] px-4 py-3">
                                            <div className="min-w-0 space-y-0.5">
                                                <p className="truncate text-sm font-medium text-white">{charge.name}</p>
                                                <div className="flex items-center gap-1.5">
                                                    <ChargeBadge type={charge.type} />
                                                    <span className="text-[11px] text-white/30">Due {charge.dueDate}</span>
                                                </div>
                                            </div>
                                            <p className="shrink-0 text-base font-semibold text-white">${charge.amount.toFixed(2)}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Summary rows */}
                                <div className="border-t border-[#1e2b2c] pt-3 space-y-2 text-sm">
                                    <div className="flex justify-between text-white/50">
                                        <span>Auto-renewal</span>
                                        <span className="text-[#bca066]">Enabled</span>
                                    </div>
                                    <div className="flex justify-between text-white/50">
                                        <span>Payment method</span>
                                        <span className="text-white/70">Visa ···· 4242</span>
                                    </div>
                                    <div className="flex justify-between text-white/50">
                                        <span>Billing cycle</span>
                                        <span className="text-white/70">Monthly (15th)</span>
                                    </div>
                                </div>
                            </div>

                            {/* Payment Methods */}
                            <div className="rounded-2xl border border-[#1e2b2c] bg-[rgba(6,17,16,0.7)] p-5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-base font-semibold text-white">Payment Methods</h2>
                                        <p className="text-xs text-white/40">Manage your payment methods</p>
                                    </div>
                                    <button
                                        type="button"
                                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-[#050d0c] transition-opacity hover:opacity-80"
                                    >
                                        + ADD METHOD
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    {paymentMethods.map((pm) => (
                                        <div key={pm._id} className="flex items-center justify-between gap-3 rounded-xl border border-[#1e2b2c] bg-[#0a1513] px-4 py-3">
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="truncate text-sm text-white">
                                                        <CardBrand type={pm.type} /> &bull;&bull;&bull;&bull; {pm.last4}
                                                    </p>
                                                    {pm.isDefault && (
                                                        <span className="rounded-full border border-[#bca066]/40 bg-[#bca066]/10 px-2 py-0.5 text-[10px] font-semibold text-[#bca066]">
                                                            Default
                                                        </span>
                                                    )}
                                                </div>
                                                {pm.expires && (
                                                    <p className="mt-0.5 text-[11px] text-white/30">Expires {pm.expires}</p>
                                                )}
                                            </div>
                                            <div className="flex shrink-0 items-center gap-2">
                                                {!pm.isDefault && (
                                                    <button type="button" className="cursor-pointer text-[11px] text-white/30 hover:text-white/60 transition-colors">
                                                        Set Default
                                                    </button>
                                                )}
                                                <button type="button" className="cursor-pointer text-white/30 hover:text-[#bca066] transition-colors" aria-label="Edit">
                                                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z" />
                                                    </svg>
                                                </button>
                                                <button type="button" className="cursor-pointer text-white/30 hover:text-red-400 transition-colors" aria-label="Delete">
                                                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                                        <polyline points="3 6 5 6 21 6" />
                                                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                                        <path d="M10 11v6M14 11v6" />
                                                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* ── Invoice History ── */}
                        <div className="overflow-hidden rounded-2xl border border-[#1e2b2c] bg-[rgba(6,17,16,0.7)]">
                            <div className="px-5 pt-5 pb-3">
                                <h2 className="text-base font-semibold text-white">Invoice History</h2>
                                <p className="text-xs text-white/40">View and download your past invoices</p>
                            </div>

                            <div className="overflow-x-auto">
                                <div className="min-w-[610px]">
                                    {/* Table header */}
                                    <div className="grid grid-cols-[1fr_120px_100px_80px_110px] bg-[#0c1a18] px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-white/40">
                                        <span>Invoice</span>
                                        <span>Date</span>
                                        <span>Amount</span>
                                        <span>Status</span>
                                        <span>Actions</span>
                                    </div>

                                    {MOCK_INVOICES.map((inv, i) => (
                                        <div
                                            key={inv._id}
                                            className={cn(
                                                "grid grid-cols-[1fr_120px_100px_80px_110px] items-center px-5 py-4",
                                                i !== MOCK_INVOICES.length - 1 && "border-b border-[#1e2b2c]",
                                            )}
                                        >
                                            <div>
                                                <p className="text-sm font-semibold text-white">{inv.number}</p>
                                                <p className="text-[11px] text-white/40">{inv.description}</p>
                                            </div>
                                            <span className="text-sm text-white/60">{inv.date}</span>
                                            <span className="text-sm text-white/80">
                                                {inv.amount > 0 ? `$${inv.amount.toFixed(2)}` : "Free"}
                                            </span>
                                            <StatusBadge status={inv.status} />
                                            <button
                                                type="button"
                                                className="inline-flex cursor-pointer items-center gap-1.5 text-[12px] font-medium text-[#bca066] transition-opacity hover:opacity-75"
                                            >
                                                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                                    <polyline points="7 10 12 15 17 10" />
                                                    <line x1="12" y1="15" x2="12" y2="3" />
                                                </svg>
                                                Download
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* ── Trip Management ── */}
                        <div className="rounded-2xl border border-[#1e2b2c] bg-[rgba(6,17,16,0.7)] p-5 space-y-4">
                            <div>
                                <h2 className="text-base font-semibold text-white">Trip Management</h2>
                                <p className="text-xs text-white/40">Manage your bookings and cancellations</p>
                            </div>

                            <div className="space-y-3">
                                {MOCK_BOOKINGS_BILLING.map((booking) => (
                                    <div key={booking._id} className="rounded-xl border border-[#1e2b2c] bg-[#0a1513] p-4 space-y-3">
                                        {/* Top row: destination + price */}
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-start gap-2.5 min-w-0">
                                                <svg className="mt-0.5 h-4 w-4 shrink-0 text-[#5a7080]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z" />
                                                    <circle cx="12" cy="10" r="3" />
                                                </svg>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-white">{booking.destination}</p>
                                                    <p className="text-[11px] text-white/40 mt-0.5">
                                                        {booking.startDate} – {booking.endDate}
                                                    </p>
                                                    <span className={cn(
                                                        "mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                                        booking.status === "upcoming"
                                                            ? "bg-[#bca066]/20 text-[#bca066]"
                                                            : "bg-white/10 text-white/50",
                                                    )}>
                                                        {booking.status}
                                                    </span>
                                                </div>
                                            </div>
                                            <p className="text-lg font-bold text-white shrink-0">${booking.amount.toFixed(2)}</p>
                                        </div>

                                        {/* Bottom row: cancellation policy + button */}
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex items-start gap-2 text-xs text-white/40">
                                                <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#5a7080]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                                    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
                                                    <line x1="12" y1="9" x2="12" y2="13" />
                                                    <line x1="12" y1="17" x2="12.01" y2="17" />
                                                </svg>
                                                <div>
                                                    <p className="font-medium text-white/50">Cancellation Policy</p>
                                                    <p>{booking.cancellationPolicy}</p>
                                                    {booking.potentialRefund && (
                                                        <p className="text-[#bca066]">Potential refund: ${booking.potentialRefund.toFixed(2)}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                className="shrink-0 cursor-pointer rounded-xl bg-white px-4 py-2 text-xs font-bold text-[#050d0c] transition-opacity hover:opacity-80"
                                            >
                                                VIEW DETAILS
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* ── Notification Preferences ── */}
                        <div className="rounded-2xl border border-[#1e2b2c] bg-[rgba(6,17,16,0.7)] p-5 space-y-5">
                            <div>
                                <h2 className="text-base font-semibold text-white">Notification Preferences</h2>
                                <p className="text-xs text-white/40">Choose how you want to receive notifications</p>
                            </div>

                            <div className="space-y-4">
                                {notifPrefs.map((pref) => (
                                    <div key={pref.key} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-white">{pref.label}</p>
                                            <p className="text-[11px] text-white/40">{pref.description}</p>
                                        </div>
                                        <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-normal">
                                            {/* Email */}
                                            <div className="flex items-center gap-1.5">
                                                <svg className="h-4 w-4 text-white/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                                    <rect x="2" y="4" width="20" height="16" rx="2" />
                                                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                                                </svg>
                                                <Toggle on={pref.emailOn} onToggle={() => toggleNotif(pref.key, "email")} />
                                            </div>
                                            {/* SMS */}
                                            <div className="flex items-center gap-1.5">
                                                <svg className="h-4 w-4 text-white/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                                    <rect x="5" y="2" width="14" height="20" rx="2" />
                                                    <path d="M12 18h.01" />
                                                </svg>
                                                <Toggle on={pref.smsOn} onToggle={() => toggleNotif(pref.key, "sms")} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                </section>
            </main>
        </div>
    );
}
