"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchBookingById, type MyBooking } from "@/lib/api/my-bookings";
import { getToken } from "@/lib/auth";
import { toTelHref } from "@/lib/phone";
import { PhoneIcon } from "@/app/components/ui/icons";

type Props = {
  bookingId: string;
  isPartnerVenue?: boolean;
};

type DriverInfo = { _id?: string; name?: string; phone?: string } | null;

export function BookingConfirmationPanel({ bookingId, isPartnerVenue }: Props) {
  const [booking, setBooking] = useState<MyBooking | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const token = getToken();

    async function load() {
      try {
        const res = await fetchBookingById(bookingId, token ?? undefined);
        if (!cancelled) setBooking(res.data ?? null);
      } catch {
        if (!cancelled) setError("Could not refresh trip details yet.");
      }
    }

    void load();
    const id = window.setInterval(() => void load(), 8000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [bookingId]);

  const driver = (booking?.assignedDriver as DriverInfo) ?? null;
  const telHref = toTelHref(driver?.phone);
  const arrivalBy = isPartnerVenue
    ? new Date(Date.now() + 30 * 60 * 1000)
    : null;

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-aleet-gold/30 bg-aleet-gold/10 text-aleet-gold">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-8 w-8">
          <path d="m5 13 4 4L19 7" />
        </svg>
      </div>
      <h2 className="mb-2 font-serif text-[24px] font-medium text-aleet-text">Payment Complete</h2>
      <p className="max-w-md text-[14px] text-aleet-text-muted">
        Your trip is confirmed and paid. You&apos;ll get a confirmation email shortly.
      </p>

      {isPartnerVenue ? (
        <div className="mt-6 w-full max-w-md rounded-2xl border border-aleet-border bg-aleet-card p-5 text-left shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-aleet-text-subtle">
            Expected arrival
          </p>
          <p className="mt-1 text-[15px] font-medium text-aleet-text">
            Driver typically arrives within ~30 minutes of booking
            {arrivalBy
              ? ` (by about ${arrivalBy.toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                })})`
              : ""}
            .
          </p>

          <div className="mt-4 border-t border-aleet-border pt-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-aleet-text-subtle">
              Assigned driver
            </p>
            {driver?.name ? (
              <div className="mt-2 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[15px] font-medium text-aleet-gold">{driver.name}</p>
                  {driver.phone ? (
                    <p className="text-[12px] text-aleet-text-muted">{driver.phone}</p>
                  ) : null}
                </div>
                {telHref ? (
                  <a
                    href={telHref}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-aleet-text hover:text-aleet-gold"
                  >
                    <PhoneIcon className="h-4 w-4" />
                    Contact
                  </a>
                ) : null}
              </div>
            ) : (
              <p className="mt-2 text-[13px] text-aleet-text-muted">
                Matching a driver now… this screen refreshes automatically.
              </p>
            )}
          </div>
          {error ? <p className="mt-3 text-[12px] text-amber-700">{error}</p> : null}
        </div>
      ) : null}

      <Link
        href="/dashboard"
        className="mt-8 inline-flex items-center gap-2 rounded-xl border border-aleet-gold/30 bg-aleet-gold/10 px-5 py-2.5 text-[13px] font-medium text-aleet-gold transition-colors hover:bg-aleet-gold/20"
      >
        View my bookings →
      </Link>
    </div>
  );
}
