"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { VehicleType } from "./vehicle-types";
import { createVehicleTypeClient, updateVehicleTypeClient } from "@/lib/admin-api";

type Props = {
    onClose: () => void;
    onSave: (v: VehicleType) => void;
    editing?: VehicleType;
};

export function AddVehicleTypeModal({ onClose, onSave, editing }: Props) {
    const [name, setName] = useState(editing?.name ?? "");
    const [description, setDescription] = useState(editing?.description ?? "");
    const [hourlyPrice, setHourlyPrice] = useState(editing ? String(editing.hourlyPrice) : "");
    const [isPrivate, setIsPrivate] = useState(Boolean(editing?.isPrivate));
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);

    function validate() {
        const e: Record<string, string> = {};
        if (!name.trim()) e.name = "Name is required";
        if (!description.trim()) e.description = "Description is required";
        const price = parseFloat(hourlyPrice);
        if (!hourlyPrice || isNaN(price) || price <= 0) e.hourlyPrice = "Enter a valid hourly price";
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
                hourlyPrice: parseFloat(hourlyPrice),
                isPrivate,
            };
            const saved = editing
                ? await updateVehicleTypeClient(editing._id, body)
                : await createVehicleTypeClient(body);
            onSave(saved);
        } catch (err) {
            setApiError(err instanceof Error ? err.message : "Failed to save vehicle type");
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
                        {editing ? "Edit Vehicle Type" : "Add Vehicle Type"}
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
                            placeholder="e.g. SUV"
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
                            placeholder="e.g. Spacious premium SUV"
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
                        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted">Hourly Price ($)</label>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="e.g. 120"
                            value={hourlyPrice}
                            onChange={(e) => setHourlyPrice(e.target.value)}
                            className={cn(
                                "w-full rounded-xl border bg-page-bg px-4 py-2.5 text-sm text-text placeholder:text-muted focus:outline-none",
                                errors.hourlyPrice ? "border-red-500/60 focus:border-red-500/60" : "border-border focus:border-gold/50",
                            )}
                        />
                        {errors.hourlyPrice && <p className="mt-1 text-xs text-red-400">{errors.hourlyPrice}</p>}
                    </div>

                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-page-bg px-4 py-3">
                        <input
                            type="checkbox"
                            checked={isPrivate}
                            onChange={(e) => setIsPrivate(e.target.checked)}
                            className="mt-0.5 h-4 w-4 rounded border-border accent-[#c5a386]"
                        />
                        <span>
                            <span className="block text-sm font-medium text-text">Private vehicle type</span>
                            <span className="mt-0.5 block text-xs text-muted">
                                Hidden from the homepage. Still usable for partner / admin bookings by ID.
                            </span>
                        </span>
                    </label>

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
                                : editing ? "Save Changes" : "Add Vehicle Type"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

