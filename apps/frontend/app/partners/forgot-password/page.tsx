"use client";

import { useState } from "react";
import Link from "next/link";
import { partnerForgotPassword } from "@/lib/api/partners";
import { ApiError } from "@/lib/api";
import { toast } from "@/app/components/ui";
import { PartnerAuthCard, PartnerAuthField } from "@/app/components/partner/partner-auth-card";

export default function PartnerForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await partnerForgotPassword(email.trim());
      setSent(true);
      toast.success("If this email exists, a reset link has been sent.");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Could not send reset email.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <PartnerAuthCard
      title="Reset password"
      subtitle="Enter your partner portal email and we'll send a reset link."
      footer={
        <Link href="/partners/login" className="text-aleet-gold no-underline hover:underline">
          Back to sign in
        </Link>
      }
    >
      {sent ? (
        <p className="text-sm leading-relaxed text-aleet-text-muted">
          If an account exists for that email, a reset link has been sent. Check your inbox.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <PartnerAuthField
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            required
            autoComplete="email"
          />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-aleet-gold px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-60"
          >
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}
    </PartnerAuthCard>
  );
}
