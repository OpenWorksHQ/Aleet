"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Addon } from "./addon-types";
import { createAddonClient, updateAddonClient } from "@/lib/admin-api";

type Props = {
    onClose: () => void;
    onSave: (addon: Addon) => void;
    editing?: Addon;
};

export function AddAddonModal({ onClose, onSave, editing }: Props) {
    const [name, setName] = useState(editing?.name ?? "");
    const [description, setDescription] = useState(editing?.description ?? "");
    const [type, setType] = useState<"free" | "paid">(editing?.type ?? "free");
    const [price, setPrice] = useState(editing && editing.price > 0 ? String(editing.price) : "");
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);

    function validate() {
        const e: Record<string, string> = {};
        if (!name.trim()) e.name = "Name is required";
        if (!description.trim()) e.description = "Description is required";
        if (type === "paid") {
            const p = parseFloat(price);
            if (!price || isNaN(p) || p <= 0) e.price = "Enter a valid price for paid add-ons";
        }
        setErrors(e);
        return Object.keys(e).length === 0;
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!validate()) return;
        setApiError(null);
        setIsLoading(true);
        try {
            const body = {
                name: name.trim(),
                description: description.trim(),
                type,
                ...(type === "paid" ? { price: parseFloat(price) } : {}),
            };
            const saved = editing
                ? await updateAddonClient(editing._id, body)
                : await createAddonClient(body);
            onSave(saved);
        } catch (err) {
            setApiError(err instanceof Error ? err.message : "Failed to save add-on");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-md rounded-2xl border border-border bg-card-bg p-6 shadow-2xl">
                {/* Header */}
                <div className="mb-5 flex items-center justify-between">
                    <h2 className="text-base font-bold text-text">
                        {editing ? "Edit Add-on" : "Add Add-on"}
                    </h2>
                    <button onClick={onClose} className="rounded-lg p-1.5 text-muted transition-colors hover:bg-border/40 hover:text-text">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4">
                            <path d="M18 6 6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {apiError && (
                    <p className="mb-4 rounded-lg border border-red-900/40 bg-red-950/30 px-4 py-2.5 text-sm text-red-400">{apiError}</p>
                )}

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div>
                        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted">Name</label>
                        <input
                            type="text"
                            placeholder="e.g. Child Seat"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className={cn(
                                "w-full rounded-xl border bg-page-bg px-4 py-2.5 text-sm text-text placeholder:text-muted focus:outline-none",
                                errors.name ? "border-red-500/60 focus:border-red-500/60" : "border-border focus:border-gold/50",
                            )}
                        />
                        {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name}</p>}
                    </div>

                    <div>
                        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted">Description</label>
                        <input
                            type="text"
                            placeholder="e.g. Certified safety seat for young passengers"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className={cn(
                                "w-full rounded-xl border bg-page-bg px-4 py-2.5 text-sm text-text placeholder:text-muted focus:outline-none",
                                errors.description ? "border-red-500/60 focus:border-red-500/60" : "border-border focus:border-gold/50",
                            )}
                        />
                        {errors.description && <p className="mt-1 text-xs text-red-400">{errors.description}</p>}
                    </div>

                    <div>
                        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted">Type</label>
                        <div className="flex gap-2">
                            {(["free", "paid"] as const).map((t) => (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => { setType(t); if (t === "free") setPrice(""); }}
                                    className={cn(
                                        "flex-1 rounded-xl border py-2.5 text-sm font-medium capitalize transition-colors",
                                        type === t
                                            ? t === "free"
                                                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                                                : "border-gold/40 bg-gold/10 text-gold"
                                            : "border-border text-muted hover:text-text",
                                    )}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    {type === "paid" && (
                        <div>
                            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted">Price ($)</label>
                            <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                placeholder="e.g. 15"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                className={cn(
                                    "w-full rounded-xl border bg-page-bg px-4 py-2.5 text-sm text-text placeholder:text-muted focus:outline-none",
                                    errors.price ? "border-red-500/60 focus:border-red-500/60" : "border-border focus:border-gold/50",
                                )}
                            />
                            {errors.price && <p className="mt-1 text-xs text-red-400">{errors.price}</p>}
                        </div>
                    )}

                    <div className="mt-1 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-muted transition-colors hover:text-text"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex-1 rounded-xl border border-gold/40 bg-gold/10 py-2.5 text-sm font-medium text-gold transition-colors hover:bg-gold/20 disabled:opacity-50"
                        >
                            {isLoading
                                ? editing ? "Saving…" : "Adding…"
                                : editing ? "Save Changes" : "Add Add-on"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
