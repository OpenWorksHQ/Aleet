"use client";

import { useState, useTransition, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { TierSettings, TierPolicyEntry } from "@/lib/admin-api";
import { fetchTierSettingsClient, updateTierSettingsClient } from "@/lib/admin-api";

type TierName = "S-Level" | "Pro" | "Diamond";
const TIER_NAMES: TierName[] = ["S-Level", "Pro", "Diamond"];

const TIER_LABEL_COLORS: Record<TierName, string> = {
    "S-Level": "text-sky-300",
    Pro: "text-gold",
    Diamond: "text-violet-400",
};

type Props = {
    open: boolean;
    onClose: () => void;
    onSave?: (updated: TierSettings) => void;
};

export function TierSettingsModal({ open, onClose, onSave }: Props) {
    const [settings, setSettings] = useState<TierSettings | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        if (!open) return;
        setSettings(null);
        setLoadError(null);
        setSaveError(null);
        fetchTierSettingsClient()
            .then(setSettings)
            .catch((e: unknown) => {
                setLoadError(e instanceof Error ? e.message : "Failed to load settings");
            });
    }, [open]);

    function patch(partial: Partial<TierSettings>) {
        setSettings((prev) => (prev ? { ...prev, ...partial } : prev));
    }

    function updateTierField(
        tier: TierName,
        field: keyof TierPolicyEntry,
        value: number | boolean,
    ) {
        setSettings((prev) => {
            if (!prev) return prev;
            return { ...prev, tiers: { ...prev.tiers, [tier]: { ...prev.tiers[tier], [field]: value } } };
        });
    }

    function handleSave() {
        if (!settings) return;
        setSaveError(null);
        startTransition(async () => {
            try {
                const { _id, createdAt, updatedAt, ...body } = settings;
                const updated = await updateTierSettingsClient(body);
                onSave?.(updated);
                onClose();
            } catch (e) {
                setSaveError(e instanceof Error ? e.message : "Failed to save settings");
            }
        });
    }

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card-bg shadow-xl">
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card-bg px-6 py-4">
                    <div>
                        <h2 className="text-lg font-bold text-text">Pricing &amp; Policy Settings</h2>
                        <p className="text-xs text-muted">Rates, booking rules, membership, and driver payouts</p>
                    </div>
                    <button onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-white/5 hover:text-text">
                        ✕
                    </button>
                </div>

                {loadError ? (
                    <div className="p-8 text-center text-sm text-red-400">{loadError}</div>
                ) : !settings ? (
                    <div className="p-12 text-center text-sm text-muted">Loading settings…</div>
                ) : (
                    <div className="flex flex-col gap-5 p-6">
                        <Section title="Booking rules">
                            <Field label="Booking fee ($)" type="number" value={settings.bookingFee} onChange={(v) => patch({ bookingFee: Number(v) })} />
                            <Field label="Min booking hours (non-members)" type="number" value={settings.minBookingHours ?? 3} onChange={(v) => patch({ minBookingHours: Number(v) })} />
                            <Field label="Same-day notice (hours)" type="number" value={settings.sameDayNoticeHours ?? 3} onChange={(v) => patch({ sameDayNoticeHours: Number(v) })} />
                        </Section>

                        <Section title="Late-night window (UTC HH:MM)">
                            <Field label="Start" value={settings.lateNightStart ?? "00:00"} onChange={(v) => patch({ lateNightStart: String(v) })} />
                            <Field label="End" value={settings.lateNightEnd ?? "09:00"} onChange={(v) => patch({ lateNightEnd: String(v) })} />
                        </Section>

                        <Section title="Membership rates">
                            <Field label="Standard rate ($/hr)" type="number" value={settings.membershipRate ?? 89} onChange={(v) => patch({ membershipRate: Number(v) })} />
                            <Field label="Founder 30 rate ($/hr)" type="number" value={settings.founder30Rate ?? 69} onChange={(v) => patch({ founder30Rate: Number(v) })} />
                            <Field label="Monthly prepaid hours" type="number" value={settings.membershipMonthlyHours ?? 5} onChange={(v) => patch({ membershipMonthlyHours: Number(v) })} />
                            <label className="block text-xs text-muted">
                                Billing cycle
                                <select
                                    value={settings.membershipBillingCycle ?? "quarterly"}
                                    onChange={(e) => patch({ membershipBillingCycle: e.target.value as TierSettings["membershipBillingCycle"] })}
                                    className="mt-1 w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-text"
                                >
                                    <option value="monthly">Monthly</option>
                                    <option value="quarterly">Quarterly</option>
                                    <option value="annually">Annually</option>
                                </select>
                            </label>
                        </Section>

                        <Section title="Partner commissions">
                            <Field label="Venue commission %" type="number" value={settings.venueCommissionPct ?? 0} onChange={(v) => patch({ venueCommissionPct: Number(v) })} />
                            <Field label="Affiliate commission %" type="number" value={settings.affiliateCommissionPct ?? 0} onChange={(v) => patch({ affiliateCommissionPct: Number(v) })} />
                        </Section>

                        <Section title="Same-day AQD">
                            <Field label="MCT" type="number" value={settings.sameDayMCT ?? 2} onChange={(v) => patch({ sameDayMCT: Number(v) })} />
                            <Field label="Min RB" type="number" value={settings.sameDayMinRB ?? 2} onChange={(v) => patch({ sameDayMinRB: Number(v) })} />
                            <Field label="RB ratio" type="number" step="0.01" value={settings.sameDayRBRatio ?? 0.25} onChange={(v) => patch({ sameDayRBRatio: Number(v) })} />
                        </Section>

                        {TIER_NAMES.map((tier) => (
                            <div key={tier} className="rounded-xl border border-border bg-white/2 p-4">
                                <p className={cn("mb-3 text-sm font-semibold", TIER_LABEL_COLORS[tier])}>{tier}</p>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <Field label="Payout rate (0–1)" type="number" step="0.01" value={settings.tiers[tier].payoutRate} onChange={(v) => updateTierField(tier, "payoutRate", Number(v))} />
                                    <Field label="Vehicle cost deduction ($)" type="number" value={settings.tiers[tier].vehicleCostDeduction} onChange={(v) => updateTierField(tier, "vehicleCostDeduction", Number(v))} />
                                    <Field label="Company cost absorption ($)" type="number" value={settings.tiers[tier].companyCostAbsorption} onChange={(v) => updateTierField(tier, "companyCostAbsorption", Number(v))} />
                                    <label className="flex items-center gap-2 text-sm text-text">
                                        <input type="checkbox" checked={settings.tiers[tier].keepsBookingFee} onChange={(e) => updateTierField(tier, "keepsBookingFee", e.target.checked)} />
                                        Driver keeps booking fee
                                    </label>
                                </div>
                            </div>
                        ))}

                        {saveError && <p className="text-sm text-red-400">{saveError}</p>}

                        <div className="flex justify-end gap-3 border-t border-border pt-4">
                            <button onClick={onClose} className="rounded-xl border border-border px-4 py-2 text-sm text-muted hover:text-text">Cancel</button>
                            <button onClick={handleSave} disabled={isPending} className="rounded-xl bg-gold px-5 py-2 text-sm font-semibold text-white hover:bg-gold/90 disabled:opacity-50">
                                {isPending ? "Saving…" : "Save settings"}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="rounded-xl border border-border bg-white/2 p-4">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">{title}</p>
            <div className="grid gap-3 sm:grid-cols-2">{children}</div>
        </div>
    );
}

function Field({
    label,
    value,
    onChange,
    type = "text",
    step,
}: {
    label: string;
    value: string | number;
    onChange: (v: string | number) => void;
    type?: string;
    step?: string;
}) {
    return (
        <label className="block text-xs text-muted">
            {label}
            <input
                type={type}
                step={step}
                value={value}
                onChange={(e) => onChange(type === "number" ? e.target.value : e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-text focus:border-gold/60 focus:outline-none"
            />
        </label>
    );
}
