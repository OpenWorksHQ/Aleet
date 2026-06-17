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
    const [bookingFee, setBookingFee] = useState(34);
    const [tiers, setTiers] = useState<TierSettings["tiers"] | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        if (!open) return;
        setTiers(null);
        setLoadError(null);
        setSaveError(null);
        fetchTierSettingsClient()
            .then((s) => {
                setBookingFee(s.bookingFee);
                setTiers(s.tiers);
            })
            .catch((e: unknown) => {
                setLoadError(e instanceof Error ? e.message : "Failed to load settings");
            });
    }, [open]);

    function updateTierField(
        tier: TierName,
        field: keyof TierPolicyEntry,
        value: number | boolean,
    ) {
        setTiers((prev) => {
            if (!prev) return prev;
            return { ...prev, [tier]: { ...prev[tier], [field]: value } };
        });
    }

    function handleSave() {
        if (!tiers) return;
        setSaveError(null);
        startTransition(async () => {
            try {
                const updated = await updateTierSettingsClient({ bookingFee, tiers });
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
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card-bg shadow-xl">
                {/* Header */}
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card-bg px-6 py-4">
                    <div>
                        <h2 className="text-lg font-bold text-text">Tier Settings</h2>
                        <p className="text-xs text-muted">Configure payout rates and policies per tier</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-muted transition-colors hover:bg-white/5 hover:text-text"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                            <path d="M18 6 6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                {loadError ? (
                    <div className="p-8 text-center text-sm text-red-400">{loadError}</div>
                ) : !tiers ? (
                    <div className="p-12 text-center text-sm text-muted">Loading settings…</div>
                ) : (
                    <div className="flex flex-col gap-5 p-6">
                        {/* Global booking fee */}
                        <div className="rounded-xl border border-border bg-white/2 p-4">
                            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
                                Global Booking Fee
                            </p>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-muted">$</span>
                                <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={bookingFee}
                                    onChange={(e) => setBookingFee(Number(e.target.value))}
                                    className="w-28 rounded-lg border border-border bg-transparent px-3 py-1.5 text-sm text-text focus:border-gold/60 focus:outline-none"
                                />
                                <span className="text-xs text-muted">per booking</span>
                            </div>
                        </div>

                        {/* Per-tier settings */}
                        {TIER_NAMES.map((tier) => (
                            <TierPolicyCard
                                key={tier}
                                tier={tier}
                                policy={tiers[tier]}
                                onChange={(field, value) => updateTierField(tier, field, value)}
                            />
                        ))}

                        {saveError && (
                            <p className="text-sm text-red-400">{saveError}</p>
                        )}
                    </div>
                )}

                {/* Footer */}
                {tiers && (
                    <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-border bg-card-bg px-6 py-4">
                        <button
                            onClick={onClose}
                            className="rounded-xl border border-border px-4 py-2 text-sm text-muted transition-colors hover:text-text"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isPending}
                            className="rounded-xl border border-gold/40 bg-gold/10 px-4 py-2 text-sm font-medium text-gold transition-colors hover:bg-gold/20 disabled:opacity-50"
                        >
                            {isPending ? "Saving…" : "Save Changes"}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

function TierPolicyCard({
    tier,
    policy,
    onChange,
}: {
    tier: TierName;
    policy: TierPolicyEntry;
    onChange: (field: keyof TierPolicyEntry, value: number | boolean) => void;
}) {
    return (
        <div className="rounded-xl border border-border bg-white/2 p-4">
            <h3 className={cn("mb-4 text-sm font-bold", TIER_LABEL_COLORS[tier])}>{tier}</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Payout Rate */}
                <div>
                    <label className="mb-1 block text-xs text-muted">Payout Rate</label>
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            value={Math.round(policy.payoutRate * 100)}
                            onChange={(e) =>
                                onChange("payoutRate", Number(e.target.value) / 100)
                            }
                            className="w-20 rounded-lg border border-border bg-transparent px-3 py-1.5 text-sm text-text focus:border-gold/60 focus:outline-none"
                        />
                        <span className="text-xs text-muted">%</span>
                    </div>
                </div>

                {/* Vehicle Cost Deduction */}
                <div>
                    <label className="mb-1 block text-xs text-muted">Vehicle Cost Deduction</label>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted">$</span>
                        <input
                            type="number"
                            min="0"
                            step="1"
                            value={policy.vehicleCostDeduction}
                            onChange={(e) =>
                                onChange("vehicleCostDeduction", Number(e.target.value))
                            }
                            className="w-24 rounded-lg border border-border bg-transparent px-3 py-1.5 text-sm text-text focus:border-gold/60 focus:outline-none"
                        />
                    </div>
                </div>

                {/* Company Cost Absorption */}
                <div>
                    <label className="mb-1 block text-xs text-muted">Company Cost Absorption</label>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted">$</span>
                        <input
                            type="number"
                            min="0"
                            step="1"
                            value={policy.companyCostAbsorption}
                            onChange={(e) =>
                                onChange("companyCostAbsorption", Number(e.target.value))
                            }
                            className="w-24 rounded-lg border border-border bg-transparent px-3 py-1.5 text-sm text-text focus:border-gold/60 focus:outline-none"
                        />
                    </div>
                </div>

                {/* Keeps Booking Fee */}
                <div>
                    <label className="mb-1 block text-xs text-muted">Keeps Booking Fee</label>
                    <button
                        type="button"
                        onClick={() => onChange("keepsBookingFee", !policy.keepsBookingFee)}
                        className={cn(
                            "flex h-6 w-11 items-center rounded-full border transition-colors",
                            policy.keepsBookingFee
                                ? "border-emerald-500/60 bg-emerald-500/20"
                                : "border-border bg-white/5",
                        )}
                    >
                        <span
                            className={cn(
                                "mx-0.5 h-4 w-4 rounded-full transition-transform duration-200",
                                policy.keepsBookingFee
                                    ? "translate-x-5 bg-emerald-400"
                                    : "translate-x-0 bg-muted",
                            )}
                        />
                    </button>
                </div>
            </div>
        </div>
    );
}
