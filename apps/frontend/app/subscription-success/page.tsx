"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2 } from "lucide-react";
import { DashboardShell } from "@/app/components/dashboard-shell";
import { processSubscriptionPayment } from "@/lib/api/subscriptions";
import { getToken } from "@/lib/auth";
import { ApiError } from "@/lib/api";

function SubscriptionSuccessContent() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setStatus("error");
      setMessage("Missing session_id from Stripe checkout.");
      return;
    }
    const token = getToken() ?? undefined;
    processSubscriptionPayment(sessionId, token)
      .then(() => setStatus("ok"))
      .catch((err) => {
        // Already-active membership still counts as success for the guest.
        const msg = err instanceof ApiError ? err.message : "Could not activate membership";
        if (/already|active|subscribed/i.test(msg)) {
          setStatus("ok");
          return;
        }
        setMessage(msg);
        setStatus("error");
      });
  }, [sessionId]);

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center text-center">
      {status === "loading" && (
        <>
          <Loader2 className="mb-4 h-10 w-10 animate-spin text-aleet-gold" />
          <p className="text-aleet-text-muted">Activating your membership…</p>
        </>
      )}
      {status === "ok" && (
        <>
          <CheckCircle2 className="mb-4 h-14 w-14 text-aleet-gold" />
          <h1 className="font-serif text-2xl font-medium text-aleet-text">Welcome to Aleet Membership</h1>
          <p className="mt-2 text-sm text-aleet-text-muted">
            Your membership is active. Prepaid hours are available for your next booking.
          </p>
          <Link
            href="/subscription"
            className="mt-8 inline-flex rounded-xl border border-aleet-gold/30 bg-aleet-gold/10 px-5 py-2.5 text-sm font-medium text-aleet-gold hover:bg-aleet-gold/20"
          >
            View subscription
          </Link>
        </>
      )}
      {status === "error" && (
        <>
          <h1 className="font-serif text-xl text-aleet-text">Verification issue</h1>
          <p className="mt-2 text-sm text-aleet-text-muted">
            {message ?? "If checkout completed, check your subscription page in a moment."}
          </p>
          <Link href="/subscription" className="mt-6 text-sm text-aleet-gold hover:underline">
            Go to subscription
          </Link>
        </>
      )}
    </div>
  );
}

export default function SubscriptionSuccessPage() {
  return (
    <DashboardShell activeNav="subscription">
      <Suspense fallback={<div className="py-20 text-center text-aleet-text-muted">Loading…</div>}>
        <SubscriptionSuccessContent />
      </Suspense>
    </DashboardShell>
  );
}
