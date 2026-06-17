"use client";

import { useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { RolePicker } from "./role-picker";
import { ADMIN_ROLES } from "./admin-types";
import type { AdminRole, AdminUser } from "./admin-types";
import { createAdmin } from "@/lib/admin-api";

type Props = {
    onClose: () => void;
    onAdd: (admin: AdminUser) => void;
};

export function AddAdminModal({ onClose, onAdd }: Props) {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState<AdminRole>("user-manager");
    const [isLoading, setIsLoading] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});

    function validate() {
        const e: Record<string, string> = {};
        if (!name.trim()) e.name = "Name is required";
        if (!email.trim()) e.email = "Email is required";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Invalid email address";
        if (!phone.trim()) e.phone = "Phone is required";
        if (!password) e.password = "Password is required";
        else if (password.length < 8) e.password = "Min 8 characters";
        setErrors(e);
        return Object.keys(e).length === 0;
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!validate()) return;
        setApiError(null);
        setIsLoading(true);
        try {
            const permissions = ADMIN_ROLES[role].permissions;
            const newAdmin = await createAdmin({
                name: name.trim(),
                email: email.trim(),
                phone: phone.trim(),
                password,
                permissions,
            });
            onAdd(newAdmin);
            onClose();
        } catch (err) {
            setApiError(err instanceof Error ? err.message : "Failed to create admin");
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

                <h2 className="mb-1 text-lg font-bold text-text">Add Administrator</h2>
                <p className="mb-6 text-sm text-muted">Create a new admin account and assign their role</p>

                <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
                    <div>
                        <label htmlFor="admin-name" className="mb-1.5 block text-xs uppercase tracking-wider text-muted">Full Name</label>
                        <Input id="admin-name" placeholder="Jane Doe" value={name} onChange={(e) => setName(e.target.value)} className={errors.name ? "border-red-500/60" : ""} />
                        {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name}</p>}
                    </div>

                    <div>
                        <label htmlFor="admin-email" className="mb-1.5 block text-xs uppercase tracking-wider text-muted">Email Address</label>
                        <Input id="admin-email" type="email" placeholder="jane@aleet.app" value={email} onChange={(e) => setEmail(e.target.value)} className={errors.email ? "border-red-500/60" : ""} />
                        {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email}</p>}
                    </div>

                    <div>
                        <label htmlFor="admin-phone" className="mb-1.5 block text-xs uppercase tracking-wider text-muted">Phone Number</label>
                        <Input id="admin-phone" type="tel" placeholder="+12025550100" value={phone} onChange={(e) => setPhone(e.target.value)} className={errors.phone ? "border-red-500/60" : ""} />
                        {errors.phone && <p className="mt-1 text-xs text-red-400">{errors.phone}</p>}
                    </div>

                    <div>
                        <label htmlFor="admin-password" className="mb-1.5 block text-xs uppercase tracking-wider text-muted">Password</label>
                        <Input id="admin-password" type="password" placeholder="Min 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} className={errors.password ? "border-red-500/60" : ""} />
                        {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password}</p>}
                    </div>

                    <div>
                        <p className="mb-2 text-xs uppercase tracking-wider text-muted">Role</p>
                        <RolePicker selected={role} onChange={setRole} />
                    </div>

                    {apiError && (
                        <p className="rounded-lg border border-red-900/40 bg-red-950/30 px-4 py-2.5 text-sm text-red-400">
                            {apiError}
                        </p>
                    )}

                    <div className="flex gap-3 pt-1">
                        <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>Cancel</Button>
                        <Button type="submit" className="flex-1" isLoading={isLoading}>Add Administrator</Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
