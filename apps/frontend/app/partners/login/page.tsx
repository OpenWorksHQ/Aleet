"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { partnerLogin, isPartnerLoggedIn } from "@/lib/api/partners";
import { ApiError } from "@/lib/api";
import { toast } from "@/app/components/ui";
import { PartnerAuthCard, PartnerAuthField } from "@/app/components/partner/partner-auth-card";

export default function PartnerLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isPartnerLoggedIn()) {
      router.replace("/partners/dashboard");
    }
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await partnerLogin(email.trim(), password);
      toast.success("Signed in successfully.");
      router.replace("/partners/dashboard");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Could not sign in.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <PartnerAuthCard
      title="Partner sign in"
      subtitle="Use the email and password from your partner portal invite."
      footer={
        <Link href="/partners/forgot-password" className="text-aleet-gold no-underline hover:underline">
          Forgot password?
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <PartnerAuthField
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          required
          autoComplete="email"
        />
        <PartnerAuthField
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          required
          autoComplete="current-password"
        />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-aleet-gold px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </PartnerAuthCard>
  );
}
