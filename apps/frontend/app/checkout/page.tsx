"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { DashboardShell } from "@/app/components/dashboard-shell";
import { BookingPaymentStep } from "@/app/components/payments/booking-payment-step";
import { fetchBookingById } from "@/lib/api/my-bookings";
import { getToken } from "@/lib/auth";

function CheckoutContent() {
  const params = useSearchParams();
  const bookingId = params.get("bookingId");
  const [amount, setAmount] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!bookingId) return;
    const token = getToken() ?? undefined;
    fetchBookingById(bookingId, token)
      .then((res) => setAmount(res.data?.finalPrice ?? 0))
      .catch(() => setLoadError("Could not load booking details"));
  }, [bookingId]);

  if (!bookingId) {
    return (
      <div className="py-16 text-center">
        <p className="text-aleet-text-muted">Missing booking ID.</p>
        <Link href="/dashboard" className="mt-4 inline-block text-sm text-aleet-gold hover:underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  if (loadError) {
    return <p className="py-16 text-center text-red-400">{loadError}</p>;
  }

  if (amount === null) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-aleet-text-muted">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading booking…
      </div>
    );
  }

  return (
    <BookingPaymentStep
      bookingId={bookingId}
      amount={amount}
      onPaid={() => {
        window.location.href = "/dashboard";
      }}
    />
  );
}

export default function CheckoutPage() {
  return (
    <DashboardShell activeNav="dashboard">
      <Suspense fallback={<div className="py-20 text-center text-aleet-text-muted">Loading…</div>}>
        <CheckoutContent />
      </Suspense>
    </DashboardShell>
  );
}
