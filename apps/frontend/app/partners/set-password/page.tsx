"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { partnerSetPassword } from "@/lib/api/partners";
import { ApiError } from "@/lib/api";
import { toast } from "@/app/components/ui";
import { PartnerAuthCard, PartnerAuthField } from "@/app/components/partner/partner-auth-card";

function SetPasswordForm() {
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
      setError("Invalid invite link. Request a new invite from your admin contact.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await partnerSetPassword(token, password);
      toast.success("Password set. Welcome to your partner portal.");
      router.push("/partners/dashboard");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Could not set password.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <PartnerAuthCard
        title="Invalid invite link"
        subtitle="This activation link is missing or expired."
      >
        <p className="text-sm text-aleet-text-muted">
          Contact your Aleet admin or use{" "}
          <Link href="/partners/login" className="text-aleet-gold hover:underline">
            partner sign in
          </Link>{" "}
          if you already activated your account.
        </p>
      </PartnerAuthCard>
    );
  }

  return (
    <PartnerAuthCard
      title="Activate your account"
      subtitle="Create a password to access your partner dashboard."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <PartnerAuthField
          label="Password"
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
          {loading ? "Saving…" : "Activate account"}
        </button>
      </form>
    </PartnerAuthCard>
  );
}

export default function PartnerSetPasswordPage() {
  return (
    <Suspense>
      <SetPasswordForm />
    </Suspense>
  );
}
