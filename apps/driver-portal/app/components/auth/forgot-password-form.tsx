"use client";

import { useState } from "react";
import { Input } from "../ui";
import { Loader2, Mail, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export function ForgotPasswordForm() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!email.trim()) return toast.error("Please enter your email address.");

        setLoading(true);
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/api/auth/password/forgot`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email: email.trim(),
                        role: "driver",
                        resetBaseUrl: `${window.location.origin}/reset-password`,
                    }),
                }
            );
            const json = await res.json();
            if (!res.ok) throw new Error(json.message ?? "Request failed");
            setSent(true);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setLoading(false);
        }
    }

    if (sent) {
        return (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10">
                    <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                </div>
                <p className="text-sm font-medium text-text">Check your inbox</p>
                <p className="text-sm text-muted">
                    If <span className="font-medium text-text">{email} </span> is registered,
                    you&apos;ll receive a reset link shortly.
                </p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <Input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="pl-10"
                />
            </div>

            <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gold bg-gold px-4 py-3 text-sm font-medium text-white transition-colors hover:opacity-90 dark:border-gold/40 dark:bg-gold/10 dark:text-gold dark:hover:bg-gold/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Send Reset Link
            </button>
        </form>
    );
}
