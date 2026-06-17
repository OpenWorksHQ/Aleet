"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ADMIN_ROLES, PERMISSION_LABELS, PERMISSION_COLORS, getRoleFromPermissions, getInitials } from "./admin-types";
import type { AdminUser } from "./admin-types";
import { AddAdminModal } from "./add-admin-modal";
import { EditAdminModal } from "./edit-admin-modal";
import { updateAdmin, deleteAdmin } from "@/lib/admin-api";

type Props = { initialAdmins: AdminUser[] };

export function AdminsList({ initialAdmins }: Props) {
    const [admins, setAdmins] = useState<AdminUser[]>(initialAdmins);
    const [showAdd, setShowAdd] = useState(false);
    const [editing, setEditing] = useState<AdminUser | null>(null);
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    function patchLocal(id: string, patch: Partial<AdminUser>) {
        setAdmins((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
    }

    async function handleToggleActive(admin: AdminUser) {
        setLoadingId(admin.id);
        setError(null);
        try {
            const updated = await updateAdmin(admin.id, { active: !admin.active });
            patchLocal(admin.id, { active: updated.active, updatedAt: updated.updatedAt });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update admin");
        } finally {
            setLoadingId(null);
        }
    }

    async function handleDelete(admin: AdminUser) {
        if (!confirm(`Delete ${admin.name}? This cannot be undone.`)) return;
        setLoadingId(admin.id);
        setError(null);
        try {
            await deleteAdmin(admin.id);
            setAdmins((prev) => prev.filter((a) => a.id !== admin.id));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to delete admin");
        } finally {
            setLoadingId(null);
        }
    }

    return (
        <>
            {/* Toolbar */}
            <div className="mb-6 flex items-center justify-between gap-4">
                <p className="text-sm text-muted">
                    {admins.length} administrator{admins.length !== 1 ? "s" : ""}
                </p>
                <button className="flex items-center gap-2 rounded-xl border border-gold/40 bg-gold/10 px-4 py-2 text-sm font-medium text-gold transition-colors hover:bg-gold/20" onClick={() => setShowAdd(true)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                        <path d="M12 5v14M5 12h14" />
                    </svg>
                    Add Administrator
                </button>
            </div>

            {error && (
                <p className="mb-4 rounded-lg border border-red-900/40 bg-red-950/30 px-4 py-2.5 text-sm text-red-400">
                    {error}
                </p>
            )}

            {/* Cards list */}
            <div className="flex flex-col gap-3">
                {admins.map((admin) => {
                    const role = getRoleFromPermissions(admin.permissions);
                    const roleConfig = ADMIN_ROLES[role];
                    const isActive = admin.active;
                    const isBusy = loadingId === admin.id;

                    return (
                        <div
                            key={admin.id}
                            className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-card-bg px-5 py-4 transition-colors hover:border-border/80"
                        >
                            {/* Avatar */}
                            <div className={cn(
                                "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                                isActive ? "bg-gold/20 text-gold" : "bg-border/60 text-muted",
                            )}>
                                {getInitials(admin.name)}
                            </div>

                            {/* Name + email + phone */}
                            <div className="flex min-w-0 flex-1 flex-col">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-semibold text-text">{admin.name}</span>
                                    <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-xs font-medium text-gold">
                                        {roleConfig.label}
                                    </span>
                                    <span className={cn(
                                        "rounded-full px-2.5 py-0.5 text-xs font-medium",
                                        isActive ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400",
                                    )}>
                                        {isActive ? "Active" : "Suspended"}
                                    </span>
                                </div>
                                <span className="mt-0.5 text-sm text-muted">{admin.email}</span>
                                <span className="text-xs text-muted">{admin.phone}</span>
                            </div>

                            {/* Permissions */}
                            <div className="hidden flex-wrap gap-1.5 lg:flex">
                                {admin.permissions.map((p) => (
                                    <span key={p} className={cn("rounded-full border px-2.5 py-0.5 text-xs font-medium", PERMISSION_COLORS[p])}>
                                        {PERMISSION_LABELS[p]}
                                    </span>
                                ))}
                            </div>

                            {/* Dates */}
                            <div className="hidden flex-col items-end gap-0.5 xl:flex shrink-0">
                                <span className="text-xs text-muted">
                                    Joined: {new Date(admin.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                </span>
                                <span className="text-xs text-muted">
                                    Updated: {new Date(admin.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                </span>
                            </div>

                            {/* Actions */}
                            <div className="flex shrink-0 items-center gap-2">
                                <button
                                    disabled={isBusy}
                                    onClick={() => setEditing(admin)}
                                    className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-gold/40 hover:text-text disabled:opacity-50"
                                >
                                    Edit Role
                                </button>
                                <button
                                    disabled={isBusy}
                                    onClick={() => handleToggleActive(admin)}
                                    className={cn(
                                        "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50",
                                        isActive
                                            ? "border-red-500/40 text-red-400 hover:border-red-500 hover:bg-red-500/10"
                                            : "border-emerald-500/40 text-emerald-400 hover:border-emerald-500 hover:bg-emerald-500/10",
                                    )}
                                >
                                    {isBusy ? "…" : isActive ? "Suspend" : "Reactivate"}
                                </button>
                                <button
                                    disabled={isBusy}
                                    onClick={() => handleDelete(admin)}
                                    className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-red-500/40 hover:text-red-400 disabled:opacity-50"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {showAdd && (
                <AddAdminModal
                    onClose={() => setShowAdd(false)}
                    onAdd={(admin) => setAdmins((prev) => [admin, ...prev])}
                />
            )}
            {editing && (
                <EditAdminModal
                    admin={editing}
                    onClose={() => setEditing(null)}
                    onUpdate={(id, patch) => {
                        patchLocal(id, patch);
                        setEditing((prev) => (prev?.id === id ? { ...prev, ...patch } : prev));
                    }}
                />
            )}
        </>
    );
}
