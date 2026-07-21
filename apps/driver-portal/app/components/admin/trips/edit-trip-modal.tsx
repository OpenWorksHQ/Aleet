"use client";

import { useState } from "react";
import type { ApiBooking } from "@/lib/admin-api";
import { updateBookingAsAdmin } from "@/lib/admin-api";

function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function shortId(id: string) {
  return `#${id.slice(-8).toUpperCase()}`;
}

type Props = {
  booking: ApiBooking;
  onClose: () => void;
  onSaved: (b: ApiBooking) => void;
};

export function EditTripModal({ booking, onClose, onSaved }: Props) {
  const [pickupLocation, setPickupLocation] = useState(booking.pickupLocation);
  const [dropoffLocation, setDropoffLocation] = useState(booking.dropoffLocation ?? "");
  const [specialNotes, setSpecialNotes] = useState(booking.specialNotes ?? "");
  const [startDate, setStartDate] = useState(toLocalInputValue(booking.dates.startDate));
  const [endDate, setEndDate] = useState(toLocalInputValue(booking.dates.endDate));
  const [finalPrice, setFinalPrice] = useState(String(booking.finalPrice));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const price = Number(finalPrice);
    if (!pickupLocation.trim()) {
      setError("Pickup location is required");
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      setError("Enter a valid price");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const updated = await updateBookingAsAdmin(booking._id, {
        pickupLocation: pickupLocation.trim(),
        dropoffLocation: dropoffLocation.trim() || null,
        specialNotes: specialNotes.trim() || null,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        finalPrice: price,
      });
      onSaved(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update trip");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card-bg p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-text">Update trip</h2>
            <p className="mt-1 text-xs text-muted">{shortId(booking._id)}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-muted hover:text-text">
            ✕
          </button>
        </div>
        {error ? (
          <p className="mb-3 rounded-lg border border-red-900/40 bg-red-950/30 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        ) : null}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="text-xs text-muted">
            Pickup
            <input
              value={pickupLocation}
              onChange={(e) => setPickupLocation(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-page-bg px-3 py-2 text-sm text-text"
            />
          </label>
          <label className="text-xs text-muted">
            Drop-off
            <input
              value={dropoffLocation}
              onChange={(e) => setDropoffLocation(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-page-bg px-3 py-2 text-sm text-text"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-muted">
              Start
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-page-bg px-3 py-2 text-sm text-text"
              />
            </label>
            <label className="text-xs text-muted">
              End
              <input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-page-bg px-3 py-2 text-sm text-text"
              />
            </label>
          </div>
          <label className="text-xs text-muted">
            Final price ($)
            <input
              type="number"
              min={0}
              step="0.01"
              value={finalPrice}
              onChange={(e) => setFinalPrice(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-page-bg px-3 py-2 text-sm text-text"
            />
          </label>
          <label className="text-xs text-muted">
            Special notes
            <textarea
              value={specialNotes}
              onChange={(e) => setSpecialNotes(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-xl border border-border bg-page-bg px-3 py-2 text-sm text-text"
            />
          </label>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-border py-2.5 text-sm text-muted hover:text-text"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="flex-1 rounded-xl border border-gold/40 bg-gold/10 py-2.5 text-sm font-medium text-gold hover:bg-gold/20 disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
