"use client";

import { useState } from "react";
import { Button } from "@/app/components/ui/button";
import { RolePicker } from "./role-picker";
import { ADMIN_ROLES, getRoleFromPermissions } from "./admin-types";
import type { AdminRole, AdminUser } from "./admin-types";
import { updateAdmin } from "@/lib/admin-api";

type Props = {
    admin: AdminUser;
    onClose: () => void;
    onUpdate: (id: string, patch: Partial<AdminUser>) => void;
};

export function EditAdminModal({ admin, onClose, onUpdate }: Props) {
    const currentRole = getRoleFromPermissions(admin.permissions);
    const [role, setRole] = useState<AdminRole>(currentRole);
    const [isLoading, setIsLoading] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);

    async function handleSave() {
        setApiError(null);
        setIsLoading(true);
        try {
            const permissions = ADMIN_ROLES[role].permissions;
            const updated = await updateAdmin(admin.id, { permissions });
            onUpdate(admin.id, {
                permissions: updated.permissions,
                updatedAt: updated.updatedAt,
            });
            onClose();
        } catch (err) {
            setApiError(err instanceof Error ? err.message : "Failed to update admin");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

            <div className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-card-bg p-6 shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
                <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 text-muted hover:text-text transition-colors">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-5 w-5">
                        <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                </button>

                <div className="mb-6 flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold/20 text-sm font-bold text-gold">
                        {admin.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-text">{admin.name}</h2>
                        <p className="text-sm text-muted">{admin.email}</p>
                    </div>
                    <span className="ml-auto text-sm font-medium text-gold">
                        {ADMIN_ROLES[currentRole].label}
                    </span>
                </div>

                <p className="mb-3 text-xs uppercase tracking-wider text-muted">Change Role</p>
                <RolePicker selected={role} onChange={setRole} />

                {apiError && (
                    <p className="mt-4 rounded-lg border border-red-900/40 bg-red-950/30 px-4 py-2.5 text-sm text-red-400">
                        {apiError}
                    </p>
                )}

                <div className="mt-5 flex gap-3">
                    <Button variant="ghost" className="flex-1" onClick={onClose}>Cancel</Button>
                    <Button className="flex-1" isLoading={isLoading} onClick={handleSave}>Save Changes</Button>
                </div>
            </div>
        </div>
    );
}
