"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import { Input } from "@/app/components/ui/input";
import { cn } from "@/lib/utils";
import type { Driver, DriverStatus } from "./driver-types";
import { StatusBadge, TierBadge, OnlineBadge } from "./driver-badges";
import { DriverDetailModal } from "./driver-detail-modal";
import { onDriverPresence } from "@/lib/admin-socket";

type TabKey = "all" | "approved" | "pending" | "rejected";

const PENDING_STATUSES: DriverStatus[] = [
    "submitted",
    "background_pending",
    "background_in_review",
    "background_completed",
    "needs_revision",
    "revision_complete",
];

function matchesTab(status: DriverStatus, tab: TabKey): boolean {
    if (tab === "all") return true;
    if (tab === "approved") return status === "approved";
    if (tab === "pending") return PENDING_STATUSES.includes(status);
    if (tab === "rejected") return status === "rejected";
    return false;
}

const STATUS_TABS: { label: string; key: TabKey }[] = [
    { label: "All", key: "all" },
    { label: "Approved", key: "approved" },
    { label: "Pending", key: "pending" },
    { label: "Rejected", key: "rejected" },
];

type Props = {
    initialDrivers: Driver[];
};

export function DriversTable({ initialDrivers }: Props) {
    const [drivers, setDrivers] = useState<Driver[]>(initialDrivers);
    const [search, setSearch] = useState("");
    const [activeTab, setActiveTab] = useState<TabKey>("all");
    const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);

    // Real-time presence — subscribe to `driver:presence` events broadcast
    // by the backend whenever any driver socket connects or disconnects.
    // Patches the matching driver row in-place; no page refresh needed.
    useEffect(() => {
        const unsubscribe = onDriverPresence(({ userId, isOnline, lastSeenAt }) => {
            setDrivers((prev) =>
                prev.map((d) =>
                    d.id === userId
                        ? { ...d, isOnline, lastSeenAt: lastSeenAt ?? d.lastSeenAt }
                        : d,
                ),
            );
        });
        return unsubscribe;
    }, []);

    const filtered = useMemo(() => {
        return drivers.filter((d) => {
            const matchesStatus = matchesTab(d.status, activeTab);
            const q = search.toLowerCase();
            const matchesSearch =
                !q ||
                d.name.toLowerCase().includes(q) ||
                d.email.toLowerCase().includes(q) ||
                d.id.toLowerCase().includes(q);
            return matchesStatus && matchesSearch;
        });
    }, [drivers, search, activeTab]);

    function handleUpdate(id: string, patch: Partial<Driver>) {
        setDrivers((prev) =>
            prev.map((d) => (d.id === id ? { ...d, ...patch } : d)),
        );
    }

    const counts = useMemo(() => ({
        all: drivers.length,
        approved: drivers.filter((d) => d.status === "approved").length,
        pending: drivers.filter((d) => PENDING_STATUSES.includes(d.status)).length,
        rejected: drivers.filter((d) => d.status === "rejected").length,
    }), [drivers]);

    return (
        <>
            {/* Toolbar */}
            <div className="mb-4 flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative flex-1 min-w-48">
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted pointer-events-none"
                    >
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.35-4.35" />
                    </svg>
                    <Input
                        placeholder="Search by name, email or ID…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="h-10 pl-9 sm:h-11"
                    />
                </div>
            </div>

            {/* Status tabs */}
            <div className="mb-5 flex flex-wrap gap-1 rounded-xl border border-border bg-card-bg p-1 w-fit">
                {STATUS_TABS.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={cn(
                            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                            activeTab === tab.key
                                ? "bg-gold/15 text-gold"
                                : "text-muted hover:text-text",
                        )}
                    >
                        {tab.label}
                        <span className={cn(
                            "rounded-full px-1.5 py-0.5 text-[11px] font-bold",
                            activeTab === tab.key ? "bg-gold/20 text-gold" : "bg-border/60 text-muted",
                        )}>
                            {counts[tab.key]}
                        </span>
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="rounded-2xl border border-border bg-card-bg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border text-left text-xs text-muted">
                                <th className="px-5 py-3.5 font-medium">Driver</th>
                                <th className="px-5 py-3.5 font-medium">Status</th>
                                <th className="px-5 py-3.5 font-medium">Tier</th>
                                <th className="px-5 py-3.5 font-medium hidden md:table-cell">Trips</th>
                                <th className="px-5 py-3.5 font-medium hidden md:table-cell">Rating</th>
                                <th className="px-5 py-3.5 font-medium hidden lg:table-cell">Vehicle</th>
                                <th className="px-5 py-3.5 font-medium hidden lg:table-cell">Joined</th>
                                <th className="px-5 py-3.5 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="px-5 py-12 text-center text-muted">
                                        No drivers found.
                                    </td>
                                </tr>
                            )}
                            {filtered.map((driver) => (
                                <tr
                                    key={driver.id}
                                    className="border-b border-border/50 last:border-0 hover:bg-border/20 transition-colors"
                                >
                                    {/* Driver */}
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gold/20 text-xs font-bold text-gold">
                                                {driver.avatarUrl ? (
                                                    <Image
                                                        src={driver.avatarUrl}
                                                        alt={`${driver.name} avatar`}
                                                        width={36}
                                                        height={36}
                                                        unoptimized
                                                        className="h-full w-full object-cover"
                                                    />
                                                ) : (
                                                    driver.avatar
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-medium text-text">{driver.name}</p>
                                                <p className="text-xs text-muted">{driver.email}</p>
                                            </div>
                                        </div>
                                    </td>

                                    <td className="px-5 py-4">
                                        <div className="flex flex-col gap-1">
                                            <StatusBadge status={driver.status} />
                                            <OnlineBadge isOnline={driver.isOnline} lastSeenAt={driver.lastSeenAt} />
                                        </div>
                                    </td>

                                    <td className="px-5 py-4">
                                        <TierBadge tier={driver.tier} />
                                    </td>

                                    <td className="px-5 py-4 text-text hidden md:table-cell">
                                        {driver.trips > 0 ? driver.trips : "—"}
                                    </td>

                                    <td className="px-5 py-4 hidden md:table-cell">
                                        {driver.rating > 0 ? (
                                            <span className="text-text">⭐ {driver.rating}</span>
                                        ) : (
                                            <span className="text-muted">—</span>
                                        )}
                                    </td>

                                    <td className="px-5 py-4 text-muted hidden lg:table-cell">{driver.vehicle}</td>
                                    <td className="px-5 py-4 text-muted hidden lg:table-cell">{driver.joinedAt}</td>

                                    {/* Actions */}
                                    <td className="px-5 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => setSelectedDriver(driver)}
                                                className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:border-gold/40 hover:text-text"
                                            >
                                                View
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Detail modal */}
            {selectedDriver && (
                <DriverDetailModal
                    driver={selectedDriver}
                    onClose={() => setSelectedDriver(null)}
                    onUpdate={(id, patch) => {
                        handleUpdate(id, patch);
                        setSelectedDriver((prev) =>
                            prev?.id === id ? { ...prev, ...patch } : prev,
                        );
                    }}
                />
            )}
        </>
    );
}
