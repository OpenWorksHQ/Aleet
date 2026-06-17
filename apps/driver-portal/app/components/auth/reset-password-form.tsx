"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Input } from "../ui";
import { Loader2, Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export function ResetPasswordForm() {
    const searchParams = useSearchParams();
    const token = searchParams.get("token") ?? "";

    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);

    // Warn if no token in URL
    const missingToken = !token;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!token) return toast.error("Invalid or missing reset token.");
        if (password.length < 8) return toast.error("Password must be at least 8 characters.");
        if (password !== confirm) return toast.error("Passwords do not match.");

        setLoading(true);
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/api/auth/password/reset`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ token, password }),
                }
            );
            const json = await res.json();
            if (!res.ok) throw new Error(json.message ?? "Reset failed");
            setDone(true);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setLoading(false);
        }
    }

    if (missingToken) {
        return (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-amber-500/20 bg-amber-500/10">
                    <AlertCircle className="h-6 w-6 text-amber-400" />
                </div>
                <p className="text-sm font-medium text-text">Invalid reset link</p>
                <p className="text-sm text-muted">
                    This link is missing a token. Please request a new reset link.
                </p>
            </div>
        );
    }

    if (done) {
        return (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10">
                    <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                </div>
                <p className="text-sm font-medium text-text">Password updated!</p>
                <p className="text-sm text-muted">
                    Your password has been reset. You can now sign in with your new password.
                </p>
                <a
                    href="/login"
                    className="mt-2 inline-flex items-center justify-center rounded-xl border border-gold bg-gold px-6 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90 dark:border-gold/40 dark:bg-gold/10 dark:text-gold dark:hover:bg-gold/20"
                >
                    Sign in
                </a>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* New password */}
            <div className="relative">
                <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="New password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    className="pr-10"
                />
                <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
            </div>

            {/* Confirm password */}
            <div className="relative">
                <Input
                    type={showConfirm ? "text" : "password"}
                    placeholder="Confirm new password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    autoComplete="new-password"
                    className="pr-10"
                />
                <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text transition-colors"
                    aria-label={showConfirm ? "Hide password" : "Show password"}
                >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
            </div>

            {/* Strength hint */}
            {password.length > 0 && password.length < 8 && (
                <p className="text-xs text-amber-400">
                    Password must be at least 8 characters.
                </p>
            )}

            <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gold bg-gold px-4 py-3 text-sm font-medium text-white transition-colors hover:opacity-90 dark:border-gold/40 dark:bg-gold/10 dark:text-gold dark:hover:bg-gold/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Reset Password
            </button>
        </form>
    );
}
