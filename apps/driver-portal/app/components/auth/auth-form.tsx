"use client";

import React, { useState } from "react";
import { Input } from "../ui";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { loginWithIdentifier } from "@/lib/auth";

export default function AuthForm() {
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const err = (msg: string) => toast.error(msg);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (!identifier.trim()) return err("Please enter your email or phone number.");
        if (!password) return err("Please enter your password.");

        setIsLoading(true);
        try {
            const { token, user } = await loginWithIdentifier(identifier.trim(), password);

            const role = user.role?.toLowerCase() ?? "";
            const status = user.driver?.status ?? "";
            const cookieOpts = "path=/; max-age=604800; SameSite=Lax";
            document.cookie = `auth_token=${token}; ${cookieOpts}`;
            document.cookie = `auth_role=${role}; ${cookieOpts}`;
            document.cookie = `driver_status=${status}; ${cookieOpts}`;

            if (role === "driver") {
                const canAccessDashboard = new Set(["active", "approved", "background_completed", "needs_revision"]).has(status);
                window.location.href = canAccessDashboard ? "/driver" : "/pending";
            } else {
                window.location.href = role === "admin" ? "/admin" : "/driver";
            }
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Invalid credentials.");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} noValidate>
            <Input
                id="identifier"
                type="text"
                placeholder="Email or phone number"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                autoComplete="username"
                className="mb-4"
            />

            <Input
                id="password"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="mb-1"
            />

            <div className="mb-4 flex justify-end">
                <a
                    href="/forgot-password"
                    className="text-xs text-muted transition-opacity hover:opacity-85 hover:text-gold"
                >
                    Forgot password?
                </a>
            </div>

            <button
                type="submit"
                disabled={isLoading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gold bg-gold px-4 py-3 text-sm font-medium text-white transition-colors hover:opacity-90 dark:border-gold/40 dark:bg-gold/10 dark:text-gold dark:hover:bg-gold/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Continue
            </button>
        </form>
    );
}
