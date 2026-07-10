"use client";

import { useEffect, useState } from "react";
import { Loader2, CreditCard } from "lucide-react";
import {
  listSavedCards,
  chargeSavedCard,
  createCheckoutSession,
  type SavedCard,
} from "@/lib/api/payments";
import { getStripe } from "@/lib/stripe";
import { getToken } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { Button } from "@/app/components/ui";
import { AddCardForm } from "./add-card-form";

type Props = {
  bookingId: string;
  amount: number;
  onPaid: () => void;
  onBack?: () => void;
};

function brandLabel(brand: string) {
  return brand.charAt(0).toUpperCase() + brand.slice(1);
}

export function BookingPaymentStep({ bookingId, amount, onPaid, onBack }: Props) {
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tip, setTip] = useState(0);
  const [showAddCard, setShowAddCard] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reloadCards() {
    setLoading(true);
    setError(null);
    try {
      const token = getToken() ?? undefined;
      const res = await listSavedCards(token);
      const list = res.data ?? [];
      setCards(list);
      const defaultCard = list.find((c) => c.isDefault) ?? list[0] ?? null;
      setSelectedId(defaultCard?.id ?? null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load saved cards");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reloadCards();
  }, []);

  async function handlePaySavedCard() {
    if (!selectedId) {
      setError("Select a saved card or add a new one");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const token = getToken() ?? undefined;
      const result = await chargeSavedCard(
        { bookingId, paymentMethodId: selectedId, tip },
        token,
      );
      if (result.status === "requires_action" && result.clientSecret) {
        const stripe = await getStripe();
        if (!stripe) {
          setError("Stripe is not configured. Add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.");
          return;
        }
        const { error, paymentIntent } = await stripe.handleCardAction(result.clientSecret);
        if (error) {
          setError(error.message ?? "Card verification failed");
          return;
        }
        if (paymentIntent?.status !== "succeeded") {
          setError("Payment was not completed after verification. Try Stripe Checkout.");
          return;
        }
      }
      onPaid();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Payment failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleCheckout() {
    setBusy(true);
    setError(null);
    try {
      const token = getToken() ?? undefined;
      const session = await createCheckoutSession({ bookingId, tip }, token);
      if (session.url) {
        window.location.href = session.url;
        return;
      }
      setError("Could not start checkout");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Checkout failed");
    } finally {
      setBusy(false);
    }
  }

  const total = amount + tip;

  return (
    <div>
      <h2 className="mb-1 font-serif text-[22px] font-medium tracking-tight text-aleet-text sm:text-[26px]">
        Complete Payment
      </h2>
      <p className="mb-6 text-[13px] text-aleet-text-muted sm:text-[15px]">
        Your booking is reserved. Pay now to confirm your trip.
      </p>

      <div className="rounded-2xl border border-aleet-border bg-aleet-card p-4 sm:p-6">
        <div className="mb-4 flex items-baseline justify-between border-b border-aleet-border pb-4">
          <span className="text-sm text-aleet-text-muted">Trip total</span>
          <span className="text-2xl font-bold text-aleet-gold">${total.toFixed(2)}</span>
        </div>

        <label className="mb-4 block">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-aleet-text-subtle">
            Tip (optional)
          </span>
          <div className="flex items-center gap-2">
            <span className="text-sm text-aleet-text-muted">$</span>
            <input
              type="number"
              min={0}
              step={1}
              value={tip || ""}
              onChange={(e) => setTip(Math.max(0, Number(e.target.value) || 0))}
              className="w-28 rounded-lg border border-aleet-border bg-transparent px-3 py-2 text-sm text-aleet-text focus:border-aleet-gold/50 focus:outline-none"
              placeholder="0"
            />
          </div>
        </label>

        {loading ? (
          <div className="flex items-center gap-2 py-4 text-aleet-text-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading saved cards…</span>
          </div>
        ) : showAddCard ? (
          <AddCardForm
            onSuccess={() => {
              setShowAddCard(false);
              reloadCards();
            }}
            onCancel={() => setShowAddCard(false)}
          />
        ) : (
          <>
            {cards.length > 0 ? (
              <div className="space-y-2">
                {cards.map((card) => (
                  <label
                    key={card.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors ${
                      selectedId === card.id
                        ? "border-aleet-gold/50 bg-aleet-gold/5"
                        : "border-aleet-border hover:border-aleet-border-strong"
                    }`}
                  >
                    <input
                      type="radio"
                      name="card"
                      checked={selectedId === card.id}
                      onChange={() => setSelectedId(card.id)}
                      className="sr-only"
                    />
                    <CreditCard className="h-4 w-4 shrink-0 text-aleet-gold" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-aleet-text">
                        {brandLabel(card.brand)} •••• {card.last4}
                        {card.isDefault && (
                          <span className="ml-2 text-[10px] uppercase text-aleet-gold">Default</span>
                        )}
                      </p>
                      <p className="text-xs text-aleet-text-subtle">
                        Exp {String(card.expMonth).padStart(2, "0")}/{card.expYear}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <p className="py-2 text-sm text-aleet-text-muted">No saved cards yet.</p>
            )}

            <button
              type="button"
              onClick={() => setShowAddCard(true)}
              className="mt-3 text-sm font-medium text-aleet-gold hover:underline"
            >
              + Add a new card
            </button>
          </>
        )}

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

        <div className="mt-6 flex flex-wrap gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              disabled={busy}
              className="rounded-xl border border-aleet-border px-4 py-2.5 text-sm text-aleet-text-muted hover:text-aleet-text disabled:opacity-50"
            >
              Back
            </button>
          )}
          <Button onClick={handlePaySavedCard} disabled={busy || loading || !selectedId}>
            {busy ? "Processing…" : "Pay with saved card"}
          </Button>
          <button
            type="button"
            onClick={handleCheckout}
            disabled={busy}
            className="rounded-xl border border-aleet-gold/40 bg-aleet-gold/10 px-4 py-2.5 text-sm font-medium text-aleet-gold hover:bg-aleet-gold/20 disabled:opacity-50"
          >
            Pay with Stripe Checkout
          </button>
        </div>
      </div>
    </div>
  );
}
