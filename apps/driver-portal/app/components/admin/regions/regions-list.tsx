"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import type { Region } from "./region-types";
import { deleteRegionClient, updateRegionClient, fetchAllRegionsClient } from "@/lib/admin-api";
import { onDriverPresence } from "@/lib/admin-socket";
import { AddRegionModal } from "./add-region-modal";
import { ConfirmModal } from "@/app/components/ui/confirm-modal";

// grid: [name] [code] [status] [same-day] [actions]
const GRID = "grid-cols-[minmax(0,1.4fr)_90px_100px_minmax(0,1.7fr)_150px]";

type Props = { initialRegions: Region[] };

export function RegionsList({ initialRegions }: Props) {
    const [regions, setRegions] = useState<Region[]>(initialRegions);
    const [search, setSearch] = useState("");
    const [showAdd, setShowAdd] = useState(false);
    const [editingRegion, setEditingRegion] = useState<Region | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    // Re-fetch the full region list (with live AQD/sameDay) whenever any
    // driver goes online or offline. Debounced by 2 s so a burst of
    // connect/disconnect events (e.g. multiple drivers logging in at once)
    // only triggers a single fetch.
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => {
        const unsubscribe = onDriverPresence(() => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(async () => {
                try {
                    const fresh = await fetchAllRegionsClient();
                    setRegions(fresh);
                } catch {
                    // Silently ignore — stale data is better than a crash.
                }
            }, 2000);
        });
        return () => {
            unsubscribe();
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, []);

    const activeCount = regions.filter((r) => r.isActive).length;
    const inactiveCount = regions.filter((r) => !r.isActive).length;

    const filtered = regions.filter((r) => {
        const q = search.toLowerCase();
        return !q || r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q);
    });

    function handleSave(saved: Region) {
        if (editingRegion) {
            setRegions((prev) => prev.map((r) => (r._id === saved._id ? saved : r)));
            setEditingRegion(null);
        } else {
            setRegions((prev) => [saved, ...prev]);
            setShowAdd(false);
        }
    }

    function handleDeleteConfirm() {
        if (!deleteConfirmId) return;
        const id = deleteConfirmId;
        setDeleteConfirmId(null);
        startTransition(async () => {
            await deleteRegionClient(id);
            setRegions((prev) => prev.filter((r) => r._id !== id));
        });
    }

    // Admin force-OFF / unblock for same-day availability.
    function toggleSameDayBlock(region: Region) {
        startTransition(async () => {
            try {
                const updated = await updateRegionClient(region._id, {
                    sameDayManualBlock: !region.sameDayManualBlock,
                });
                setRegions((prev) => prev.map((r) => (r._id === updated._id ? updated : r)));
            } catch {
                // leave state unchanged on failure
            }
        });
    }

    return (
        <>
            <div className={cn("flex flex-col gap-4", isPending && "opacity-50 pointer-events-none")}>
                {/* Heading + Add Region button */}
                <div className="rounded-2xl border border-border bg-card-bg px-5 py-4 flex items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-bold text-text sm:text-2xl">Regions</h1>
                        <p className="text-sm text-muted">Manage service regions and coverage areas</p>
                    </div>
                    <button
                        onClick={() => { setEditingRegion(null); setShowAdd(true); }}
                        className="flex items-center gap-1.5 rounded-xl border border-gold/40 bg-gold/10 px-3 py-2 text-xs font-medium text-gold transition-colors hover:bg-gold/20 shrink-0"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                            <path d="M12 5v14M5 12h14" />
                        </svg>
                        Add Region
                    </button>
                </div>

                {/* Stats — full width */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-2xl border border-border bg-card-bg px-4 py-3">
                        <div className="flex items-center gap-2 text-gold mb-1">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Z" /><circle cx="12" cy="9" r="2.5" />
                            </svg>
                            <span className="text-xs font-bold">Total Regions</span>
                        </div>
                        <p className="text-2xl font-bold text-text">{regions.length}</p>
                        <p className="text-xs text-muted">Coverage areas</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-card-bg px-4 py-3">
                        <div className="flex items-center gap-2 text-emerald-400 mb-1">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Z" /><circle cx="12" cy="9" r="2.5" />
                            </svg>
                            <span className="text-xs font-bold">Active Regions</span>
                        </div>
                        <p className="text-2xl font-bold text-text">{activeCount}</p>
                        <p className="text-xs text-muted">Available for service</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-card-bg px-4 py-3">
                        <div className="flex items-center gap-2 text-amber-400 mb-1">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Z" /><circle cx="12" cy="9" r="2.5" />
                            </svg>
                            <span className="text-xs font-bold">Inactive Regions</span>
                        </div>
                        <p className="text-2xl font-bold text-text">{inactiveCount}</p>
                        <p className="text-xs text-muted">Not in service</p>
                    </div>
                </div>

                {/* Table */}
                <div className="rounded-2xl border border-border bg-card-bg overflow-hidden">
                    {/* Heading + toolbar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
                        <h2 className="text-base font-bold text-text">Regions</h2>
                        <div className="relative">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted">
                                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Search regions…"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-48 rounded-xl border border-border bg-page-bg py-2 pl-9 pr-4 text-sm text-text placeholder:text-muted focus:border-gold/50 focus:outline-none"
                            />
                        </div>
                    </div>

                    {/* Header */}
                    <div className={cn("hidden lg:grid items-center gap-4 border-b border-border px-5 py-2.5 text-xs font-medium text-muted", GRID)}>
                        <span>Region Name</span>
                        <span className="text-center">Code</span>
                        <span className="text-center">Status</span>
                        <span>Same-Day</span>
                        <span className="text-right">Actions</span>
                    </div>

                    <div className="flex flex-col divide-y divide-border">
                        {filtered.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-16 gap-3">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                                    className="h-10 w-10 text-muted">
                                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Z" />
                                    <circle cx="12" cy="9" r="2.5" />
                                </svg>
                                <p className="text-sm text-muted">
                                    {search ? "No regions match your search." : "No regions found"}
                                </p>
                            </div>
                        )}
                        {filtered.map((region) => (
                            <div key={region._id} className="transition-colors hover:bg-white/2">
                                {/* Desktop */}
                                <div className={cn("hidden lg:grid items-center gap-4 px-5 py-3.5", GRID)}>
                                    <div className="flex items-center gap-3">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"
                                            className="h-4 w-4 shrink-0 text-gold">
                                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Z" />
                                            <circle cx="12" cy="9" r="2.5" />
                                        </svg>
                                        <span className="text-sm font-medium text-text">{region.name}</span>
                                    </div>
                                    <div className="flex justify-center">
                                        <span className="rounded-lg border border-border bg-page-bg px-2.5 py-0.5 text-xs font-mono font-medium text-muted">
                                            {region.code}
                                        </span>
                                    </div>
                                    <div className="flex justify-center">
                                        <span className={cn(
                                            "rounded-full border px-2.5 py-0.5 text-xs font-medium",
                                            region.isActive
                                                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                                                : "border-border bg-page-bg text-muted",
                                        )}>
                                            {region.isActive ? "Active" : "Inactive"}
                                        </span>
                                    </div>
                                    {/* Same-day */}
                                    <div className="flex min-w-0 items-center gap-2">
                                        <div className="min-w-0">
                                            <span className={cn(
                                                "inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
                                                region.sameDay?.available
                                                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                                                    : region.sameDayManualBlock
                                                        ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                                                        : "border-border bg-page-bg text-muted",
                                            )}>
                                                {region.sameDay?.available ? "ON" : region.sameDayManualBlock ? "Blocked" : "OFF"}
                                            </span>
                                            {region.sameDay && (
                                                <p className="mt-0.5 truncate text-[11px] text-muted">
                                                    AQD {region.sameDay.aqd} · RB {region.sameDay.rb} · CL {region.sameDay.cl} · need {region.sameDay.mct}
                                                </p>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => toggleSameDayBlock(region)}
                                            className={cn(
                                                "shrink-0 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors",
                                                region.sameDayManualBlock
                                                    ? "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                                                    : "border-amber-500/30 text-amber-400 hover:bg-amber-500/10",
                                            )}
                                        >
                                            {region.sameDayManualBlock ? "Unblock" : "Force OFF"}
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-end gap-2">
                                        <button
                                            onClick={() => { setEditingRegion(region); setShowAdd(false); }}
                                            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-gold/40 hover:text-gold"
                                        >
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                            </svg>
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => setDeleteConfirmId(region._id)}
                                            className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20"
                                        >
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                                                <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                                <path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                                            </svg>
                                            Delete
                                        </button>
                                    </div>
                                </div>

                                {/* Mobile */}
                                <div className="flex items-center gap-3 px-4 py-3 lg:hidden">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"
                                        className="h-4 w-4 shrink-0 text-gold">
                                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Z" />
                                        <circle cx="12" cy="9" r="2.5" />
                                    </svg>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-text">{region.name}</p>
                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                            <span className={cn(
                                                "text-xs font-medium",
                                                region.isActive ? "text-emerald-400" : "text-muted",
                                            )}>
                                                {region.isActive ? "Active" : "Inactive"}
                                            </span>
                                            <span className={cn(
                                                "text-xs font-medium",
                                                region.sameDay?.available
                                                    ? "text-emerald-400"
                                                    : region.sameDayManualBlock
                                                        ? "text-amber-400"
                                                        : "text-muted",
                                            )}>
                                                Same-day {region.sameDay?.available ? "ON" : region.sameDayManualBlock ? "Blocked" : "OFF"}
                                            </span>
                                        </div>
                                    </div>
                                    <span className="rounded-lg border border-border bg-page-bg px-2 py-0.5 text-xs font-mono text-muted">{region.code}</span>
                                    <button
                                        onClick={() => { setEditingRegion(region); setShowAdd(false); }}
                                        className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:text-gold"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => setDeleteConfirmId(region._id)}
                                        className="rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-xs font-medium text-red-400"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {(showAdd || editingRegion) && (
                <AddRegionModal
                    onClose={() => { setShowAdd(false); setEditingRegion(null); }}
                    onSave={handleSave}
                    editing={editingRegion ?? undefined}
                />
            )}

            {deleteConfirmId !== null && (
                <ConfirmModal
                    title="Delete Region"
                    description="Are you sure you want to delete this region? This action cannot be undone."
                    confirmLabel="Delete"
                    variant="danger"
                    onConfirm={handleDeleteConfirm}
                    onCancel={() => setDeleteConfirmId(null)}
                />
            )}
        </>
    );
}
