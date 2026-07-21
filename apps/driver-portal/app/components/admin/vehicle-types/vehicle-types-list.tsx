"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import type { VehicleType } from "./vehicle-types";
import { AddVehicleTypeModal } from "./add-vehicle-type-modal";
import { ConfirmModal } from "@/app/components/ui/confirm-modal";
import { deleteVehicleTypeClient } from "@/lib/admin-api";

// grid: [name 1fr] [description 1fr] [price 140px] [added 140px] [actions 88px]
const GRID = "grid-cols-[1fr_1fr_140px_140px_88px]";

type Props = { initialVehicleTypes: VehicleType[] };

export function VehicleTypesList({ initialVehicleTypes }: Props) {
    const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>(initialVehicleTypes);
    const [search, setSearch] = useState("");
    const [showAdd, setShowAdd] = useState(false);
    const [editingVehicle, setEditingVehicle] = useState<VehicleType | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const filtered = vehicleTypes.filter((v) => {
        const q = search.toLowerCase();
        return !q || v.name.toLowerCase().includes(q) || v.description.toLowerCase().includes(q);
    });

    const avgPrice = vehicleTypes.length
        ? vehicleTypes.reduce((s, v) => s + v.hourlyPrice, 0) / vehicleTypes.length
        : 0;
    const maxPrice = vehicleTypes.length ? Math.max(...vehicleTypes.map((v) => v.hourlyPrice)) : 0;

    function handleSave(saved: VehicleType) {
        setVehicleTypes((prev) =>
            editingVehicle
                ? prev.map((v) => (v._id === saved._id ? saved : v))
                : [saved, ...prev],
        );
        setEditingVehicle(null);
        setShowAdd(false);
    }

    function handleDeleteConfirm() {
        if (!deleteConfirmId) return;
        startTransition(async () => {
            try {
                await deleteVehicleTypeClient(deleteConfirmId);
                setVehicleTypes((prev) => prev.filter((v) => v._id !== deleteConfirmId));
            } finally {
                setDeleteConfirmId(null);
            }
        });
    }

    return (
        <>
            {(showAdd || editingVehicle) && (
                <AddVehicleTypeModal
                    onClose={() => { setShowAdd(false); setEditingVehicle(null); }}
                    onSave={handleSave}
                    editing={editingVehicle ?? undefined}
                />
            )}
            {deleteConfirmId && (
                <ConfirmModal
                    title="Delete Vehicle Type"
                    description="This vehicle type will be permanently deleted and removed from all future bookings. This action cannot be undone."
                    confirmLabel="Delete"
                    variant="danger"
                    isLoading={isPending}
                    onConfirm={handleDeleteConfirm}
                    onCancel={() => setDeleteConfirmId(null)}
                />
            )}
            <div className="flex flex-col gap-4">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-2xl border border-border bg-card-bg px-4 py-3">
                        <p className="text-xs text-muted">Total Vehicle Types</p>
                        <p className="mt-1 text-xl font-bold text-gold">{vehicleTypes.length}</p>
                        <p className="text-xs text-muted">Available types</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-card-bg px-4 py-3">
                        <p className="text-xs text-muted">Average Price</p>
                        <p className="mt-1 text-xl font-bold text-text">${avgPrice.toFixed(0)}/hr</p>
                        <p className="text-xs text-muted">Across all types</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-card-bg px-4 py-3">
                        <p className="text-xs text-muted">Highest Price</p>
                        <p className="mt-1 text-xl font-bold text-text">${maxPrice}/hr</p>
                        <p className="text-xs text-muted">Premium tier</p>
                    </div>
                </div>

                {/* Table */}
                <div className="rounded-2xl border border-border bg-card-bg overflow-hidden">
                    {/* Heading + toolbar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
                        <h2 className="text-base font-bold text-text">Vehicle Types</h2>
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="relative">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted">
                                    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                                </svg>
                                <input
                                    type="text"
                                    placeholder="Search vehicle types…"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-52 rounded-xl border border-border bg-page-bg py-2 pl-9 pr-4 text-sm text-text placeholder:text-muted focus:border-gold/50 focus:outline-none"
                                />
                            </div>
                            <button
                                onClick={() => setShowAdd(true)}
                                className="flex items-center gap-1.5 rounded-xl border border-gold/40 bg-gold/10 px-3 py-2 text-xs font-medium text-gold transition-colors hover:bg-gold/20"
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                                    <path d="M12 5v14M5 12h14" />
                                </svg>
                                Add Vehicle Type
                            </button>
                        </div>
                    </div>

                    {/* Header */}
                    <div className={cn("hidden lg:grid items-center gap-4 border-b border-border px-5 py-2.5 text-xs font-medium text-muted", GRID)}>
                        <span>Name</span>
                        <span>Description</span>
                        <span className="text-right">Hourly Price</span>
                        <span className="text-right">Added</span>
                        <span />
                    </div>

                    <div className="flex flex-col divide-y divide-border">
                        {filtered.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-16 gap-3">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                                    className="h-10 w-10 text-muted">
                                    <path d="M3 14h18" />
                                    <path d="M5 14V9.8a2 2 0 0 1 1.2-1.8l4.1-1.8a4 4 0 0 1 3.4 0L17.8 8A2 2 0 0 1 19 9.8V14" />
                                    <circle cx="7.5" cy="16.8" r="1.7" />
                                    <circle cx="16.5" cy="16.8" r="1.7" />
                                </svg>
                                <p className="text-sm text-muted">
                                    {search ? "No vehicle types match your search." : "No vehicle types found"}
                                </p>
                                {!search && <p className="text-xs text-muted">Add your first vehicle type to get started.</p>}
                            </div>
                        )}
                        {filtered.map((v) => (
                            <div key={v._id} className="transition-colors hover:bg-white/2">
                                {/* Desktop */}
                                <div className={cn("hidden lg:grid items-center gap-4 px-5 py-3.5", GRID)}>
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gold/30 bg-gold/10">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"
                                                className="h-4 w-4 text-gold">
                                                <path d="M3 14h18" />
                                                <path d="M5 14V9.8a2 2 0 0 1 1.2-1.8l4.1-1.8a4 4 0 0 1 3.4 0L17.8 8A2 2 0 0 1 19 9.8V14" />
                                                <circle cx="7.5" cy="16.8" r="1.7" />
                                                <circle cx="16.5" cy="16.8" r="1.7" />
                                            </svg>
                                        </div>
                                        <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-text">{v.name}</span>
                                        {v.isPrivate ? (
                                            <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted">
                                                Private
                                            </span>
                                        ) : null}
                                        </div>
                                    </div>
                                    <p className="text-sm text-muted">{v.description}</p>
                                    <p className="text-right text-sm font-semibold text-gold">${v.hourlyPrice}/hr</p>
                                    <p className="text-right text-xs text-muted">
                                        {new Date(v.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                    </p>
                                    <div className="flex items-center justify-end gap-1">
                                        <button
                                            onClick={() => setEditingVehicle(v)}
                                            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-white/5 hover:text-text"
                                            title="Edit"
                                        >
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => setDeleteConfirmId(v._id)}
                                            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-red-500/10 hover:text-red-400"
                                            title="Delete"
                                        >
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                                                <polyline points="3 6 5 6 21 6" />
                                                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                                <path d="M10 11v6M14 11v6" />
                                                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                {/* Mobile */}
                                <div className="flex items-center gap-3 px-4 py-3 lg:hidden">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gold/30 bg-gold/10">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"
                                            className="h-4 w-4 text-gold">
                                            <path d="M3 14h18" />
                                            <path d="M5 14V9.8a2 2 0 0 1 1.2-1.8l4.1-1.8a4 4 0 0 1 3.4 0L17.8 8A2 2 0 0 1 19 9.8V14" />
                                            <circle cx="7.5" cy="16.8" r="1.7" />
                                            <circle cx="16.5" cy="16.8" r="1.7" />
                                        </svg>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-text">{v.name}</p>
                                        <p className="text-xs text-muted">{v.description}</p>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-1">
                                        <p className="text-sm font-bold text-gold">${v.hourlyPrice}/hr</p>
                                        <button
                                            onClick={() => setEditingVehicle(v)}
                                            className="ml-2 rounded-lg p-1.5 text-muted hover:text-text"
                                        >
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => setDeleteConfirmId(v._id)}
                                            className="rounded-lg p-1.5 text-muted hover:text-red-400"
                                        >
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                                                <polyline points="3 6 5 6 21 6" />
                                                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                                <path d="M10 11v6M14 11v6" />
                                                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}
