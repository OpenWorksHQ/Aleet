"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Region } from "./region-types";
import { createRegionClient, updateRegionClient } from "@/lib/admin-api";

type Props = {
    onClose: () => void;
    onSave: (region: Region) => void;
    editing?: Region;
};

export function AddRegionModal({ onClose, onSave, editing }: Props) {
    const [name, setName] = useState(editing?.name ?? "");
    const [code, setCode] = useState(editing?.code ?? "");
    const [isActive, setIsActive] = useState(editing?.isActive ?? true);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);

    function validate() {
        const e: Record<string, string> = {};
        if (!name.trim()) e.name = "Name is required";
        const trimmedCode = code.trim().toUpperCase();
        if (!trimmedCode) e.code = "Code is required";
        else if (trimmedCode.length !== 2) e.code = "Code must be exactly 2 characters";
        setErrors(e);
        return Object.keys(e).length === 0;
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!validate()) return;
        setApiError(null);
        setIsLoading(true);
        try {
            const saved = editing
                ? await updateRegionClient(editing._id, {
                    name: name.trim(),
                    code: code.trim().toUpperCase(),
                    isActive,
                })
                : await createRegionClient({
                    name: name.trim(),
                    code: code.trim().toUpperCase(),
                });
            onSave(saved);
        } catch (err) {
            setApiError(err instanceof Error ? err.message : "Failed to save region");
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
                        {editing ? "Edit Region" : "Add Region"}
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
                        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted">Region Name</label>
                        <input
                            type="text"
                            placeholder="e.g. Florida"
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
                        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted">State Code</label>
                        <input
                            type="text"
                            placeholder="e.g. FL"
                            maxLength={2}
                            value={code}
                            onChange={(e) => setCode(e.target.value.toUpperCase())}
                            className={cn(
                                "w-full rounded-xl border bg-page-bg px-4 py-2.5 text-sm font-mono text-text placeholder:text-muted focus:outline-none",
                                errors.code ? "border-red-500/60 focus:border-red-500/60" : "border-border focus:border-gold/50",
                            )}
                        />
                        {errors.code && <p className="mt-1 text-xs text-red-400">{errors.code}</p>}
                    </div>

                    {editing && (
                        <div className="flex items-center justify-between rounded-xl border border-border bg-page-bg px-4 py-3">
                            <div>
                                <p className="text-sm font-medium text-text">Active</p>
                                <p className="text-xs text-muted">Visible in booking</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsActive((v) => !v)}
                                className={cn(
                                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none",
                                    isActive ? "bg-emerald-500" : "bg-border",
                                )}
                            >
                                <span className={cn(
                                    "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
                                    isActive ? "translate-x-6" : "translate-x-1",
                                )} />
                            </button>
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
                                : editing ? "Save Changes" : "Add Region"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
