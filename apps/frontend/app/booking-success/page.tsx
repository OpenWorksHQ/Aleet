"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2 } from "lucide-react";
import { DashboardShell } from "@/app/components/dashboard-shell";
import { confirmBookingPayment, getPaymentSessionStatus } from "@/lib/api/payments";
import { getToken } from "@/lib/auth";

function BookingSuccessContent() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  const paymentIntentId = params.get("payment_intent");
  const returnedBookingId = params.get("booking_id");
  const [status, setStatus] = useState<"loading" | "paid" | "pending" | "error">("loading");
  const [bookingId, setBookingId] = useState<string | null>(null);

  useEffect(() => {
    if (paymentIntentId) {
      confirmBookingPayment(paymentIntentId, getToken() ?? undefined)
        .then((res) => {
          setBookingId(res.data?.bookingId ?? returnedBookingId);
          setStatus("paid");
        })
        .catch(() => setStatus("error"));
      return;
    }
    if (!sessionId) {
      setStatus("error");
      return;
    }
    getPaymentSessionStatus(sessionId)
      .then((res) => {
        setBookingId(res.booking?.id ?? null);
        if (res.session.payment_status === "paid" || res.booking?.paymentStatus === "Paid") {
          setStatus("paid");
        } else {
          setStatus("pending");
        }
      })
      .catch(() => setStatus("error"));
  }, [paymentIntentId, returnedBookingId, sessionId]);

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center text-center">
      {status === "loading" && (
        <>
          <Loader2 className="mb-4 h-10 w-10 animate-spin text-aleet-gold" />
          <p className="text-aleet-text-muted">Verifying your payment…</p>
        </>
      )}
      {status === "paid" && (
        <>
          <CheckCircle2 className="mb-4 h-14 w-14 text-aleet-gold" />
          <h1 className="font-serif text-2xl font-medium text-aleet-text">Payment successful</h1>
          <p className="mt-2 text-sm text-aleet-text-muted">
            Your booking is confirmed{bookingId ? ` (#${bookingId.slice(-8).toUpperCase()})` : ""}.
          </p>
          <Link
            href="/dashboard"
            className="mt-8 inline-flex rounded-xl border border-aleet-gold/30 bg-aleet-gold/10 px-5 py-2.5 text-sm font-medium text-aleet-gold hover:bg-aleet-gold/20"
          >
            View my bookings
          </Link>
        </>
      )}
      {status === "pending" && (
        <>
          <Loader2 className="mb-4 h-10 w-10 animate-spin text-aleet-gold" />
          <h1 className="font-serif text-xl text-aleet-text">Payment processing</h1>
          <p className="mt-2 text-sm text-aleet-text-muted">
            Stripe is still confirming your payment. Refresh in a moment or check your bookings.
          </p>
          <Link href="/dashboard" className="mt-6 text-sm text-aleet-gold hover:underline">
            Go to dashboard
          </Link>
        </>
      )}
      {status === "error" && (
        <>
          <h1 className="font-serif text-xl text-aleet-text">Could not verify payment</h1>
          <p className="mt-2 text-sm text-aleet-text-muted">
            If you completed checkout, your booking may still appear under My Bookings shortly.
          </p>
          <Link href="/dashboard" className="mt-6 text-sm text-aleet-gold hover:underline">
            Go to dashboard
          </Link>
        </>
      )}
    </div>
  );
}

export default function BookingSuccessPage() {
  return (
    <DashboardShell activeNav="dashboard">
      <Suspense fallback={<div className="py-20 text-center text-aleet-text-muted">Loading…</div>}>
        <BookingSuccessContent />
      </Suspense>
    </DashboardShell>
  );
}
