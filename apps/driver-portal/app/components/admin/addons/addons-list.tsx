"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import type { Addon, AddonType } from "./addon-types";
import { deleteAddonClient } from "@/lib/admin-api";
import { AddAddonModal } from "./add-addon-modal";
import { ConfirmModal } from "@/app/components/ui/confirm-modal";

const ALL = "all" as const;
type Filter = AddonType | typeof ALL;

const FILTERS: { key: Filter; label: string }[] = [
    { key: ALL, label: "All" },
    { key: "free", label: "Free" },
    { key: "paid", label: "Paid" },
];

// grid: [name 1fr] [description 1fr] [type 110px] [price 110px] [added 130px] [actions 88px]
const GRID = "grid-cols-[1fr_1fr_110px_110px_130px_88px]";

type Props = { initialAddons: Addon[] };

export function AddonsList({ initialAddons }: Props) {
    const [addons, setAddons] = useState<Addon[]>(initialAddons);
    const [filter, setFilter] = useState<Filter>(ALL);
    const [search, setSearch] = useState("");
    const [showAdd, setShowAdd] = useState(false);
    const [editingAddon, setEditingAddon] = useState<Addon | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    function handleSave(saved: Addon) {
        if (editingAddon) {
            setAddons((prev) => prev.map((a) => (a._id === saved._id ? saved : a)));
            setEditingAddon(null);
        } else {
            setAddons((prev) => [saved, ...prev]);
            setShowAdd(false);
        }
    }

    function handleDeleteConfirm() {
        if (!deleteConfirmId) return;
        const id = deleteConfirmId;
        setDeleteConfirmId(null);
        startTransition(async () => {
            await deleteAddonClient(id);
            setAddons((prev) => prev.filter((a) => a._id !== id));
        });
    }

    const filtered = addons.filter((a) => {
        const matchType = filter === ALL || a.type === filter;
        const q = search.toLowerCase();
        const matchSearch = !q || a.name.toLowerCase().includes(q) || a.description.toLowerCase().includes(q);
        return matchType && matchSearch;
    });

    const freeCount = addons.filter((a) => a.type === "free").length;
    const paidCount = addons.filter((a) => a.type === "paid").length;

    return (
        <>
            <div className={cn("flex flex-col gap-4", isPending && "opacity-50 pointer-events-none")}>
                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-2xl border border-border bg-card-bg px-4 py-3">
                        <div className="flex items-center gap-2 text-gold mb-3">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                                <circle cx="12" cy="8" r="6" /><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
                            </svg>
                            <span className="text-sm font-bold">Total Add-ons</span>
                        </div>
                        <p className="text-3xl font-bold text-text">{addons.length}</p>
                        <p className="mt-1 text-xs text-muted">Available services</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-card-bg px-4 py-3">
                        <div className="flex items-center gap-2 text-gold mb-3">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                                <path d="M20 12V22H4V12" /><path d="M22 7H2v5h20V7z" /><path d="M12 22V7" /><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" /><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
                            </svg>
                            <span className="text-sm font-bold">Free Add-ons</span>
                        </div>
                        <p className="text-3xl font-bold text-text">{freeCount}</p>
                        <p className="mt-1 text-xs text-muted">Complimentary services</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-card-bg px-4 py-3">
                        <div className="flex items-center gap-2 text-gold mb-3">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                                <rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" />
                            </svg>
                            <span className="text-sm font-bold">Paid Add-ons</span>
                        </div>
                        <p className="text-3xl font-bold text-text">{paidCount}</p>
                        <p className="mt-1 text-xs text-muted">Premium services</p>
                    </div>
                </div>

                {/* Table */}
                <div className="rounded-2xl border border-border bg-card-bg overflow-hidden">
                    {/* Heading + toolbar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
                        <h2 className="text-base font-bold text-text">Add-ons</h2>
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                onClick={() => { setEditingAddon(null); setShowAdd(true); }}
                                className="flex items-center gap-1.5 rounded-xl border border-gold/40 bg-gold/10 px-3 py-1.5 text-xs font-medium text-gold transition-colors hover:bg-gold/20"
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="h-3.5 w-3.5">
                                    <path d="M12 5v14M5 12h14" />
                                </svg>
                                Add Add-on
                            </button>
                            <div className="flex gap-1.5">
                                {FILTERS.map((f) => (
                                    <button
                                        key={f.key}
                                        onClick={() => setFilter(f.key)}
                                        className={cn(
                                            "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                                            filter === f.key
                                                ? "border-gold/60 bg-gold/10 text-gold"
                                                : "border-border text-muted hover:border-border/80 hover:text-text",
                                        )}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                            <div className="relative">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted">
                                    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                                </svg>
                                <input
                                    type="text"
                                    placeholder="Search add-ons…"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-44 rounded-xl border border-border bg-page-bg py-2 pl-9 pr-4 text-sm text-text placeholder:text-muted focus:border-gold/50 focus:outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Header */}
                    <div className={cn("hidden lg:grid items-center gap-4 border-b border-border px-5 py-2.5 text-xs font-medium text-muted", GRID)}>
                        <span>Name</span>
                        <span>Description</span>
                        <span className="text-center">Type</span>
                        <span className="text-right">Price</span>
                        <span className="text-right">Added</span>
                        <span />
                    </div>

                    <div className="flex flex-col divide-y divide-border">
                        {filtered.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-16 gap-3">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                                    className="h-10 w-10 text-muted">
                                    <circle cx="12" cy="8" r="6" /><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
                                </svg>
                                <p className="text-sm text-muted">
                                    {search ? "No add-ons match your search." : "No add-ons found"}
                                </p>
                                {!search && <p className="text-xs text-muted">Add your first add-on to get started.</p>}
                            </div>
                        )}
                        {filtered.map((addon) => (
                            <div key={addon._id} className="transition-colors hover:bg-white/2">
                                {/* Desktop */}
                                <div className={cn("hidden lg:grid items-center gap-4 px-5 py-3.5", GRID)}>
                                    <span className="text-sm font-medium text-text">{addon.name}</span>
                                    <p className="text-sm text-muted">{addon.description}</p>
                                    <div className="flex justify-center">
                                        <span className={cn(
                                            "rounded-full border px-2.5 py-0.5 text-xs font-medium",
                                            addon.type === "free"
                                                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                                                : "border-gold/40 bg-gold/10 text-gold",
                                        )}>
                                            {addon.type === "free" ? "Free" : "Paid"}
                                        </span>
                                    </div>
                                    <p className="text-right text-sm font-semibold text-gold">
                                        {addon.price === 0 ? "—" : `$${addon.price}`}
                                    </p>
                                    <p className="text-right text-xs text-muted">
                                        {new Date(addon.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                    </p>
                                    <div className="flex items-center justify-end gap-1">
                                        <button
                                            onClick={() => { setEditingAddon(addon); setShowAdd(false); }}
                                            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-border/40 hover:text-text"
                                        >
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => setDeleteConfirmId(addon._id)}
                                            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-red-900/20 hover:text-red-400"
                                        >
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                                                <polyline points="3 6 5 6 21 6" />
                                                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                                <path d="M10 11v6M14 11v6" />
                                                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                {/* Mobile */}
                                <div className="flex items-center justify-between gap-3 px-4 py-3 lg:hidden">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <p className="text-sm font-medium text-text">{addon.name}</p>
                                            <span className={cn(
                                                "rounded-full border px-2 py-0.5 text-xs font-medium",
                                                addon.type === "free"
                                                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                                                    : "border-gold/40 bg-gold/10 text-gold",
                                            )}>
                                                {addon.type === "free" ? "Free" : "Paid"}
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted">{addon.description}</p>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <p className="text-sm font-bold text-gold">
                                            {addon.price === 0 ? "—" : `$${addon.price}`}
                                        </p>
                                        <button
                                            onClick={() => { setEditingAddon(addon); setShowAdd(false); }}
                                            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-border/40 hover:text-text"
                                        >
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => setDeleteConfirmId(addon._id)}
                                            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-red-900/20 hover:text-red-400"
                                        >
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
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

            {(showAdd || editingAddon) && (
                <AddAddonModal
                    onClose={() => { setShowAdd(false); setEditingAddon(null); }}
                    onSave={handleSave}
                    editing={editingAddon ?? undefined}
                />
            )}

            {deleteConfirmId !== null && (
                <ConfirmModal
                    title="Delete Add-on"
                    description="Are you sure you want to delete this add-on? This action cannot be undone."
                    confirmLabel="Delete"
                    variant="danger"
                    onConfirm={handleDeleteConfirm}
                    onCancel={() => setDeleteConfirmId(null)}
                />
            )}
        </>
    );
}
