"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, CreditCard, Trash2 } from "lucide-react";
import { DashboardShell } from "../components/dashboard-shell";
import {
  listSavedCards,
  setDefaultCard,
  deleteSavedCard,
  type SavedCard,
} from "@/lib/api/payments";
import { fetchMyBookings, type MyBooking } from "@/lib/api/my-bookings";
import { getToken } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { AddCardForm } from "@/app/components/payments/add-card-form";

function brandLabel(brand: string) {
  return brand.charAt(0).toUpperCase() + brand.slice(1);
}

export default function BillingPage() {
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [bookings, setBookings] = useState<MyBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddCard, setShowAddCard] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const token = getToken() ?? undefined;
      const [cardsRes, bookingsRes] = await Promise.all([
        listSavedCards(token),
        fetchMyBookings(token),
      ]);
      setCards(cardsRes.data ?? []);
      setBookings(bookingsRes.data ?? []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load billing data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSetDefault(id: string) {
    setBusyId(id);
    try {
      const token = getToken() ?? undefined;
      await setDefaultCard(id, token);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update default card");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Remove this card?")) return;
    setBusyId(id);
    try {
      const token = getToken() ?? undefined;
      await deleteSavedCard(id, token);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to remove card");
    } finally {
      setBusyId(null);
    }
  }

  const unpaid = bookings.filter((b) => b.paymentStatus === "Unpaid");

  return (
    <DashboardShell activeNav="billing">
      <div className="min-w-0 space-y-6">
        <div>
          <h1 className="font-serif text-2xl font-medium text-aleet-text sm:text-3xl">Billing</h1>
          <p className="mt-1 text-sm text-aleet-text-muted">Manage payment methods and outstanding charges</p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <section className="rounded-2xl border border-aleet-border bg-aleet-card p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-medium text-aleet-text">Payment methods</h2>
            {!showAddCard && (
              <button
                type="button"
                onClick={() => setShowAddCard(true)}
                className="rounded-xl border border-aleet-gold/40 bg-aleet-gold/10 px-4 py-2 text-sm font-medium text-aleet-gold hover:bg-aleet-gold/20"
              >
                Add card
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex items-center gap-2 py-8 text-aleet-text-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : showAddCard ? (
            <AddCardForm
              onSuccess={() => {
                setShowAddCard(false);
                load();
              }}
              onCancel={() => setShowAddCard(false)}
            />
          ) : cards.length === 0 ? (
            <p className="py-4 text-sm text-aleet-text-muted">
              No saved cards yet. Add one to pay for bookings in one tap.
            </p>
          ) : (
            <ul className="divide-y divide-aleet-border">
              {cards.map((card) => (
                <li key={card.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-aleet-gold" />
                    <div>
                      <p className="text-sm font-medium text-aleet-text">
                        {brandLabel(card.brand)} •••• {card.last4}
                        {card.isDefault && (
                          <span className="ml-2 rounded-full bg-aleet-gold/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-aleet-gold">
                            Default
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-aleet-text-subtle">
                        Exp {String(card.expMonth).padStart(2, "0")}/{card.expYear}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!card.isDefault && (
                      <button
                        type="button"
                        disabled={busyId === card.id}
                        onClick={() => handleSetDefault(card.id)}
                        className="rounded-lg border border-aleet-border px-3 py-1.5 text-xs text-aleet-text-muted hover:text-aleet-text disabled:opacity-50"
                      >
                        Make default
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busyId === card.id}
                      onClick={() => handleDelete(card.id)}
                      className="rounded-lg border border-red-500/30 p-1.5 text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                      aria-label="Remove card"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {unpaid.length > 0 && (
          <section className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6">
            <h2 className="mb-3 text-lg font-medium text-aleet-text">Outstanding payments</h2>
            <ul className="space-y-3">
              {unpaid.map((b) => (
                <li
                  key={b._id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-aleet-border bg-aleet-card p-4"
                >
                  <div>
                    <p className="text-sm font-medium text-aleet-text">{b.pickupLocation}</p>
                    <p className="text-xs text-aleet-text-muted">
                      {new Date(b.dates.startDate).toLocaleDateString()} · ${b.finalPrice.toFixed(2)}
                    </p>
                  </div>
                  <Link
                    href={`/checkout?bookingId=${b._id}`}
                    className="rounded-xl bg-aleet-gold px-4 py-2 text-sm font-semibold text-aleet-text hover:opacity-90"
                  >
                    Pay now
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="rounded-2xl border border-aleet-border bg-aleet-card p-6">
          <h2 className="mb-2 text-lg font-medium text-aleet-text">Membership billing</h2>
          <p className="text-sm text-aleet-text-muted">
            Subscription charges and prepaid hours are managed on your{" "}
            <Link href="/subscription" className="text-aleet-gold hover:underline">
              subscription page
            </Link>
            .
          </p>
        </section>
      </div>
    </DashboardShell>
  );
}
