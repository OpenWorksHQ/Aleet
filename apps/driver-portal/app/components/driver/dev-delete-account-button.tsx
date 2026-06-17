"use client";

import { useState } from "react";
import { Trash2, X } from "lucide-react";
import { toast } from "sonner";

function clearAuthCookies() {
    const expired = "path=/; max-age=0; SameSite=Lax";
    document.cookie = `auth_token=; ${expired}`;
    document.cookie = `auth_role=; ${expired}`;
    document.cookie = `driver_status=; ${expired}`;
}

export function DevDeleteAccountButton() {
    const [confirm, setConfirm] = useState(false);
    const [loading, setLoading] = useState(false);

    async function handleDelete() {
        const token = document.cookie.match(/auth_token=([^;]+)/)?.[1];
        if (!token) return toast.error("No auth token found.");

        setLoading(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/delete-account`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.message ?? "Failed to delete account");
            toast.success("Account deleted.");
            clearAuthCookies();
            window.location.href = "/login";
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setLoading(false);
            setConfirm(false);
        }
    }

    return (
        <>
            {/* Trigger button */}
            <button
                onClick={() => setConfirm(true)}
                title="[DEV] Delete account"
                className="fixed bottom-5 right-5 z-40 flex h-9 w-9 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10 text-red-400 shadow-lg transition-colors hover:bg-red-500/20"
            >
                <Trash2 className="h-4 w-4" />
            </button>

            {/* Inline confirm popover */}
            {confirm && (
                <div className="fixed bottom-16 right-5 z-50 w-64 rounded-2xl border border-border bg-card-bg p-4 shadow-xl">
                    <div className="mb-3 flex items-center justify-between">
                        <p className="text-sm font-semibold text-text">Delete account?</p>
                        <button onClick={() => setConfirm(false)} className="text-muted hover:text-text transition-colors">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                    <p className="mb-4 text-xs text-muted">This will permanently delete your account. For testing only.</p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setConfirm(false)}
                            className="flex-1 rounded-xl border border-border py-1.5 text-xs text-muted transition-colors hover:text-text"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleDelete}
                            disabled={loading}
                            className="flex-1 rounded-xl border border-red-500/30 bg-red-500/10 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50"
                        >
                            {loading ? "Deleting…" : "Delete"}
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
