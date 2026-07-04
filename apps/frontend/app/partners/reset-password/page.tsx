"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { partnerResetPassword } from "@/lib/api/partners";
import { ApiError } from "@/lib/api";
import { toast } from "@/app/components/ui";
import { PartnerAuthCard, PartnerAuthField } from "@/app/components/partner/partner-auth-card";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (!token) {
      setError("Invalid reset link.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await partnerResetPassword(token, password);
      toast.success("Password updated. You can sign in now.");
      router.push("/partners/login");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Could not reset password.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <PartnerAuthCard title="Invalid reset link" subtitle="This password reset link is missing or expired.">
        <Link href="/partners/forgot-password" className="text-sm text-aleet-gold hover:underline">
          Request a new reset link
        </Link>
      </PartnerAuthCard>
    );
  }

  return (
    <PartnerAuthCard title="Choose a new password" subtitle="Enter your new partner portal password.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <PartnerAuthField
          label="New password"
          type="password"
          value={password}
          onChange={setPassword}
          required
          minLength={8}
          autoComplete="new-password"
        />
        <PartnerAuthField
          label="Confirm password"
          type="password"
          value={confirm}
          onChange={setConfirm}
          required
          minLength={8}
          autoComplete="new-password"
        />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-aleet-gold px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-60"
        >
          {loading ? "Saving…" : "Update password"}
        </button>
      </form>
    </PartnerAuthCard>
  );
}

export default function PartnerResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
