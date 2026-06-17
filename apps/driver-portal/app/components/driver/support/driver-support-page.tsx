"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const POLICIES = [
    {
        title: "Driver Code of Conduct",
        content:
            "Professional behavior guidelines, customer interaction standards, and platform rules that all drivers must follow.",
    },
    {
        title: "Safety Requirements",
        content:
            "Vehicle safety standards, driver safety protocols, emergency procedures, and insurance requirements.",
    },
    {
        title: "Earnings & Payments",
        content:
            "How earnings are calculated, payment schedules, fee structures, and payout methods.",
    },
    {
        title: "Cancellation Policy",
        content:
            "Trip cancellation rules, fees, acceptable reasons for cancellation, and impact on driver ratings.",
    },
    {
        title: "Privacy Policy",
        content:
            "How personal data is collected, used, and protected. Driver and passenger privacy rights and responsibilities.",
    },
];

const FAQS = [
    {
        question: "How do I get paid?",
        answer:
            "Payments are processed weekly on Tuesdays. You can choose between direct deposit or PayPal. Instant pay is available for a small fee.",
    },
    {
        question: "What if my vehicle breaks down?",
        answer:
            "Contact support immediately. We provide roadside assistance and can help arrange alternative transportation for passengers.",
    },
    {
        question: "How are ratings calculated?",
        answer:
            "Ratings are based on passenger feedback across multiple factors including safety, cleanliness, navigation, and overall experience.",
    },
    {
        question: "Can I work in multiple cities?",
        answer:
            "Yes, but you may need additional permits or licenses depending on local regulations. Check with support for specific requirements.",
    },
];

function AccordionItem({
    title,
    content,
    open,
    onToggle,
    gold,
}: {
    title: string;
    content: string;
    open: boolean;
    onToggle: () => void;
    gold?: boolean;
}) {
    return (
        <div className="border-b border-border last:border-none">
            <button
                onClick={onToggle}
                className={cn(
                    "flex w-full items-center justify-between gap-4 py-4 text-left text-sm font-medium transition-colors hover:text-gold",
                    open ? "text-gold" : "text-text",
                    gold && open && "text-gold",
                )}
            >
                {title}
                <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={cn("h-4 w-4 shrink-0 transition-transform text-muted", open && "rotate-180")}
                >
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </button>
            {open && (
                <p className="pb-4 text-xs leading-relaxed text-muted">{content}</p>
            )}
        </div>
    );
}

export function DriverSupportPage() {
    const [openPolicy, setOpenPolicy] = useState<number | null>(null);
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    const toggle = (
        idx: number,
        current: number | null,
        set: (v: number | null) => void,
    ) => set(current === idx ? null : idx);

    return (
        <div className="flex flex-col gap-5">
            {/* Stat cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {[
                    {
                        icon: (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-gold">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                            </svg>
                        ),
                        label: "Policies",
                        value: "12",
                        sub: "Active policies",
                    },
                    {
                        icon: (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-gold">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="16" x2="12" y2="12" />
                                <line x1="12" y1="8" x2="12.01" y2="8" />
                            </svg>
                        ),
                        label: "FAQ",
                        value: "45",
                        sub: "Common questions",
                    },
                    {
                        icon: (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-gold">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                        ),
                        label: "Support",
                        value: "24/7",
                        sub: "Available",
                    },
                ].map((card) => (
                    <div key={card.label} className="rounded-2xl border border-border bg-card-bg p-5">
                        <div className="mb-3 flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gold/10">
                                {card.icon}
                            </div>
                            <span className="text-sm font-medium text-text">{card.label}</span>
                        </div>
                        <p className="text-2xl font-bold text-text">{card.value}</p>
                        <p className="mt-0.5 text-xs text-muted">{card.sub}</p>
                    </div>
                ))}
            </div>

            {/* Policies + FAQ */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                {/* Driver Policies */}
                <div className="rounded-2xl border border-border bg-card-bg p-5 sm:p-6">
                    <div className="mb-4 flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gold/10">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-gold">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                            </svg>
                        </div>
                        <h3 className="text-base font-semibold text-text">Driver Policies</h3>
                    </div>
                    <div>
                        {POLICIES.map((p, i) => (
                            <AccordionItem
                                key={i}
                                title={p.title}
                                content={p.content}
                                open={openPolicy === i}
                                onToggle={() => toggle(i, openPolicy, setOpenPolicy)}
                                gold
                            />
                        ))}
                    </div>
                </div>

                {/* FAQ */}
                <div className="rounded-2xl border border-border bg-card-bg p-5 sm:p-6">
                    <div className="mb-4 flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gold/10">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-gold">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="16" x2="12" y2="12" />
                                <line x1="12" y1="8" x2="12.01" y2="8" />
                            </svg>
                        </div>
                        <h3 className="text-base font-semibold text-text">Frequently Asked Questions</h3>
                    </div>
                    <div>
                        {FAQS.map((f, i) => (
                            <AccordionItem
                                key={i}
                                title={f.question}
                                content={f.answer}
                                open={openFaq === i}
                                onToggle={() => toggle(i, openFaq, setOpenFaq)}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Contact Support */}
            <div className="rounded-2xl border border-border bg-card-bg p-6">
                <h3 className="mb-5 text-center text-base font-semibold text-text">Contact Support</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {/* Phone */}
                    <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-page-bg/60 p-5 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-card-bg">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-muted">
                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.63 3.42 2 2 0 0 1 3.62 1.25h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.84a16 16 0 0 0 6.29 6.29l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-text">Phone Support</p>
                            <p className="mt-0.5 text-xs text-muted">24/7 emergency support</p>
                        </div>
                        <a
                            href="tel:+18005550100"
                            className="mt-1 rounded-xl border border-border px-5 py-2 text-xs font-medium text-text transition-colors hover:border-gold/40 hover:text-gold"
                        >
                            Call Now
                        </a>
                    </div>

                    {/* Email */}
                    <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-page-bg/60 p-5 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-card-bg">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-muted">
                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                <polyline points="22,6 12,13 2,6" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-text">Email Support</p>
                            <p className="mt-0.5 text-xs text-muted">Response within 24 hours</p>
                        </div>
                        <a
                            href="mailto:support@aleet.com"
                            className="mt-1 rounded-xl border border-border px-5 py-2 text-xs font-medium text-text transition-colors hover:border-gold/40 hover:text-gold"
                        >
                            Send Email
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
